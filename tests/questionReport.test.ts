import { describe, it, expect, beforeEach } from 'vitest';
import {
  applyReportToQuestion,
  deleteStoredReport,
  getStoredReports,
  submitQuestionReport,
  updateReportStatus,
} from '../src/storage/reportStorage';
import { getStoredQuestions } from '../src/storage/questionStorage';
import { matchQuestion, SPORT_KINDS, AdvancedFilterState, INITIAL_FILTER_STATE } from '../src/utils/questionFilter';
import { setRankingApiUrl } from '../src/services/rankingService';
import { Question } from '../src/types/game';

describe('問題修正報告 & 種類区分 (QuestionReport & SportKind)', () => {
  beforeEach(() => {
    localStorage.clear();
    setRankingApiUrl('');
  });

  describe('種類区分 (SPORT_KINDS)', () => {
    it('サッカー・野球・バスケ・バレー・テニス・ラグビー・卓球の7種類が定義されていること', () => {
      const ids = SPORT_KINDS.map((s) => s.id);
      expect(ids).toEqual([
        'soccer',
        'baseball',
        'basketball',
        'volleyball',
        'tennis',
        'rugby',
        'tabletennis',
      ]);
    });

    it('サッカーのみ利用可能(isAvailable: true)で、それ以外はロック(isAvailable: false)されていること', () => {
      const soccer = SPORT_KINDS.find((s) => s.id === 'soccer');
      expect(soccer?.isAvailable).toBe(true);

      const others = SPORT_KINDS.filter((s) => s.id !== 'soccer');
      others.forEach((s) => {
        expect(s.isAvailable).toBe(false);
        expect(s.description).toContain('[DATA LOCKED]');
      });
    });

    it('filter.sportKind が野球などの場合、問題にマッチしないこと', () => {
      const mockQuestion: Question = {
        id: 'q_test_1',
        title: 'テスト問題',
        question: '問題文',
        categoryId: 'japan-stadium',
        difficulty: 'medium',
        hint: 'カシマアントラーズのホーム',
        tags: ['J1', '鹿島アントラーズ'],
        answer: {
          name: 'カシマサッカースタジアム',
          latitude: 35.9922,
          longitude: 140.6406,
        },
        isPublished: true,
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      };

      const soccerFilter: AdvancedFilterState = {
        ...INITIAL_FILTER_STATE,
        sportKind: 'soccer',
      };
      expect(matchQuestion(mockQuestion, soccerFilter)).toBe(true);

      const baseballFilter: AdvancedFilterState = {
        ...INITIAL_FILTER_STATE,
        sportKind: 'baseball',
      };
      expect(matchQuestion(mockQuestion, baseballFilter)).toBe(false);
    });
  });

  describe('問題修正報告 (reportStorage)', () => {
    it('新規報告が保存され、一覧から取得できること', async () => {
      const result = await submitQuestionReport({
        questionId: 'q001',
        questionTitle: '鹿島スタジアム問題',
        originalName: '旧スタジアム名',
        originalCoordinates: { latitude: 35.0, longitude: 140.0 },
        reportedCoordinates: { latitude: 35.9922, longitude: 140.6406 },
        reportedName: '茨城県立カシマサッカースタジアム',
        evidenceUrl: 'https://maps.google.com/test',
        comment: '座標が100mズレていたので修正報告します',
      });

      expect(result.report).toBeDefined();
      expect(result.report.status).toBe('pending');

      const all = getStoredReports();
      expect(all.length).toBe(1);
      expect(all[0].reportedCoordinates.latitude).toBe(35.9922);
      expect(all[0].reportedName).toBe('茨城県立カシマサッカースタジアム');
    });

    it('ステータス更新と削除が正しく動作すること', async () => {
      const { report } = await submitQuestionReport({
        questionId: 'q002',
        questionTitle: '日産スタジアム問題',
        originalName: '日産',
        originalCoordinates: { latitude: 35.5, longitude: 139.6 },
        reportedCoordinates: { latitude: 35.5099, longitude: 139.6064 },
      });

      const updated = updateReportStatus(report.id, 'rejected');
      expect(updated[0].status).toBe('rejected');

      const afterDelete = deleteStoredReport(report.id);
      expect(afterDelete.length).toBe(0);
    });

    it('applyReportToQuestion で報告内容が実際の問題データに反映されること', async () => {
      // 既存の問題リストから1問取得
      const questions = getStoredQuestions();
      expect(questions.length).toBeGreaterThan(0);
      const targetQ = questions[0];

      // 修正報告を提出
      const newLat = 35.123456;
      const newLng = 139.654321;
      const newName = '修正された正式名称スタジアム';

      const { report } = await submitQuestionReport({
        questionId: targetQ.id,
        questionTitle: targetQ.title,
        originalName: targetQ.answer.name,
        originalCoordinates: { latitude: targetQ.answer.latitude, longitude: targetQ.answer.longitude },
        reportedCoordinates: { latitude: newLat, longitude: newLng },
        reportedName: newName,
      });

      // 管理者が承認適用
      const applyResult = applyReportToQuestion(report.id);
      expect(applyResult.success).toBe(true);

      // 問題データを確認
      const updatedQuestions = getStoredQuestions();
      const updatedQ = updatedQuestions.find((q) => q.id === targetQ.id);
      expect(updatedQ).toBeDefined();
      expect(updatedQ?.answer.latitude).toBe(newLat);
      expect(updatedQ?.answer.longitude).toBe(newLng);
      expect(updatedQ?.answer.name).toBe(newName);

      // 報告のステータスが 'applied' になっていること
      const currentReports = getStoredReports();
      const currentReport = currentReports.find((r) => r.id === report.id);
      expect(currentReport?.status).toBe('applied');
    });
  });
});

