import { QuestionReport, QuestionReportInput, ReportStatus } from '../types/report';
import { getStoredQuestions, updateQuestion } from './questionStorage';
import { getRankingApiUrl } from '../services/rankingService';

export const REPORTS_STORAGE_KEY = 'sakachizu_question_reports_v1';

/**
 * 保存されている問題報告一覧を取得
 */
export function getStoredReports(): QuestionReport[] {
  try {
    const raw = localStorage.getItem(REPORTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed to load reports from storage:', err);
    return [];
  }
}

/**
 * 報告一覧を保存
 */
export function setStoredReports(reports: QuestionReport[]): void {
  try {
    localStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(reports));
  } catch (err) {
    console.error('Failed to save reports to storage:', err);
  }
}

/**
 * 新規報告を追加・送信
 */
export async function submitQuestionReport(
  input: QuestionReportInput,
  overrideGasUrl?: string
): Promise<{ report: QuestionReport; gasSuccess: boolean }> {
  const now = new Date().toISOString();
  const id = 'rep_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);

  const newReport: QuestionReport = {
    id,
    questionId: input.questionId,
    questionTitle: input.questionTitle,
    originalName: input.originalName,
    originalCoordinates: input.originalCoordinates,
    reportedCoordinates: input.reportedCoordinates,
    reportedName: input.reportedName ? input.reportedName.trim() : undefined,
    evidenceUrl: input.evidenceUrl ? input.evidenceUrl.trim() : undefined,
    comment: input.comment ? input.comment.trim() : undefined,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  };

  // 1. ローカルストレージに保存
  const existing = getStoredReports();
  const updated = [newReport, ...existing];
  setStoredReports(updated);

  // 2. Googleスプレッドシート（GAS）への送信
  let gasSuccess = false;
  const gasUrl = overrideGasUrl || getRankingApiUrl();

  if (gasUrl && gasUrl.trim().startsWith('http')) {
    try {
      const payload = {
        action: 'report',
        id: newReport.id,
        questionId: newReport.questionId,
        questionTitle: newReport.questionTitle,
        originalName: newReport.originalName,
        originalLat: newReport.originalCoordinates.latitude,
        originalLng: newReport.originalCoordinates.longitude,
        reportedLat: newReport.reportedCoordinates.latitude,
        reportedLng: newReport.reportedCoordinates.longitude,
        reportedName: newReport.reportedName || '',
        evidenceUrl: newReport.evidenceUrl || '',
        comment: newReport.comment || '',
        createdAt: newReport.createdAt,
      };

      // fetch (POST / no-cors fallback)
      await fetch(gasUrl.trim(), {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload),
        mode: 'no-cors',
      });
      gasSuccess = true;
    } catch (err) {
      console.warn('Failed to send report to Google Apps Script:', err);
      // フォールバック: GETリクエストでの送信
      try {
        const getUrl = new URL(gasUrl.trim());
        getUrl.searchParams.set('action', 'report');
        getUrl.searchParams.set('data', encodeURIComponent(JSON.stringify(newReport)));
        await fetch(getUrl.toString(), { mode: 'no-cors' });
        gasSuccess = true;
      } catch (e2) {
        console.error('GAS fallback send also failed:', e2);
      }
    }
  }

  return { report: newReport, gasSuccess };
}

/**
 * 報告ステータスを更新
 */
export function updateReportStatus(id: string, status: ReportStatus): QuestionReport[] {
  const reports = getStoredReports();
  const now = new Date().toISOString();
  const updated = reports.map((r) =>
    r.id === id ? { ...r, status, updatedAt: now } : r
  );
  setStoredReports(updated);
  return updated;
}

/**
 * 報告を削除
 */
export function deleteStoredReport(id: string): QuestionReport[] {
  const reports = getStoredReports();
  const updated = reports.filter((r) => r.id !== id);
  setStoredReports(updated);
  return updated;
}

/**
 * 報告された修正を該当問題にワンクリック承認適用する
 */
export function applyReportToQuestion(reportId: string): { success: boolean; message: string } {
  const reports = getStoredReports();
  const report = reports.find((r) => r.id === reportId);
  if (!report) {
    return { success: false, message: '該当する報告が見つかりません。' };
  }

  const questions = getStoredQuestions();
  const question = questions.find((q) => q.id === report.questionId);
  if (!question) {
    return { success: false, message: `問題ID: ${report.questionId} が見つかりません。` };
  }

  // 問題データを更新
  const updatedQuestion = {
    ...question,
    answer: {
      ...question.answer,
      name: report.reportedName ? report.reportedName : question.answer.name,
      latitude: report.reportedCoordinates.latitude,
      longitude: report.reportedCoordinates.longitude,
    },
    updatedAt: new Date().toISOString().split('T')[0],
  };

  updateQuestion(updatedQuestion);

  // 報告ステータスを 'applied'（適用済み）に更新
  updateReportStatus(reportId, 'applied');

  return {
    success: true,
    message: `問題「${question.title}」に座標修正（北緯 ${report.reportedCoordinates.latitude.toFixed(6)}°, 東経 ${report.reportedCoordinates.longitude.toFixed(6)}°）${report.reportedName ? `および名称「${report.reportedName}」` : ''}を適用しました！`,
  };
}
