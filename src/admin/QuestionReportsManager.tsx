import React, { useState } from 'react';
import { QuestionReport } from '../types/report';
import {
  applyReportToQuestion,
  deleteStoredReport,
  getStoredReports,
  updateReportStatus,
} from '../storage/reportStorage';
import { getRankingApiUrl } from '../services/rankingService';

export const QuestionReportsManager: React.FC = () => {
  const [reports, setReports] = useState<QuestionReport[]>(() => getStoredReports());
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'applied' | 'rejected'>('all');
  const [notification, setNotification] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(null);
  const [isFetchingGas, setIsFetchingGas] = useState<boolean>(false);

  // ステータスフィルタ
  const filteredReports = reports.filter((r) => {
    if (filterStatus === 'all') return true;
    return r.status === filterStatus;
  });

  // 承認適用
  const handleApply = (report: QuestionReport) => {
    if (!window.confirm(`問題「${report.questionTitle}」に報告された修正を反映しますか？\n\n新座標: 北緯 ${report.reportedCoordinates.latitude}°, 東経 ${report.reportedCoordinates.longitude}°\n新名称: ${report.reportedName || '（変更なし）'}`)) {
      return;
    }

    const res = applyReportToQuestion(report.id);
    if (res.success) {
      setReports(getStoredReports());
      setNotification({ type: 'success', message: res.message });
    } else {
      setNotification({ type: 'error', message: res.message });
    }
  };

  // 却下
  const handleReject = (id: string) => {
    const updated = updateReportStatus(id, 'rejected');
    setReports(updated);
    setNotification({ type: 'info', message: '報告を「却下」に設定しました。' });
  };

  // 削除
  const handleDelete = (id: string) => {
    if (!window.confirm('この報告を一覧から削除しますか？')) return;
    const updated = deleteStoredReport(id);
    setReports(updated);
    setNotification({ type: 'info', message: '報告を削除しました。' });
  };

  // Googleスプレッドシート（GAS）から最新の報告を取得してマージ
  const handleFetchFromGas = async () => {
    const gasUrl = getRankingApiUrl();
    if (!gasUrl || !gasUrl.trim().startsWith('http')) {
      alert('ゲーム設定タブで「Google Apps Script (GAS) API URL」を設定してください。');
      return;
    }

    setIsFetchingGas(true);
    setNotification(null);

    try {
      const getUrl = new URL(gasUrl.trim());
      getUrl.searchParams.set('action', 'getReports');

      const res = await fetch(getUrl.toString());
      const data = await res.json();

      if (data && data.status === 'ok' && Array.isArray(data.reports)) {
        // 既存のローカル報告とIDでマージ
        const current = getStoredReports();
        const currentMap = new Map(current.map((r) => [r.id, r]));

        data.reports.forEach((gasRep: any) => {
          if (!currentMap.has(gasRep.id)) {
            currentMap.set(gasRep.id, gasRep);
          }
        });

        const merged = Array.from(currentMap.values());
        setReports(merged);
        localStorage.setItem('sakachizu_question_reports_v1', JSON.stringify(merged));
        setNotification({
          type: 'success',
          message: `Googleスプレッドシートから${data.reports.length}件の報告を取得・同期しました！`,
        });
      } else {
        throw new Error(data.message || 'データ形式が不正です');
      }
    } catch (err: any) {
      console.error('GAS fetch error:', err);
      setNotification({
        type: 'error',
        message: `スプレッドシートからの取得に失敗しました: ${err.message}`,
      });
    } finally {
      setIsFetchingGas(false);
    }
  };

  return (
    <div className="reports-manager-container">
      <div className="reports-manager-header">
        <div className="reports-header-left">
          <h2>⚠️ ユーザー修正報告・座標修正管理</h2>
          <p className="reports-header-desc">
            ゲームプレイ中の結果画面「問題を報告」から送信された座標修正・名称修正の確認、およびワンクリック承認適用が行えます。
          </p>
        </div>
        <div className="reports-header-actions">
          <button
            type="button"
            className="neo-action-btn sync-gas-btn"
            onClick={handleFetchFromGas}
            disabled={isFetchingGas}
            title="Googleスプレッドシートに保存された報告データを最新同期"
          >
            {isFetchingGas ? '同期中...' : '🔄 スプレッドシートから最新取得'}
          </button>
        </div>
      </div>

      {notification && (
        <div className={`report-notification-banner ${notification.type}`} role="alert">
          {notification.type === 'success' ? '✅ ' : notification.type === 'error' ? '❌ ' : 'ℹ️ '}
          {notification.message}
        </div>
      )}

      {/* ステータスフィルタタブ */}
      <div className="reports-filter-toolbar">
        <div className="status-filter-chips">
          {(['all', 'pending', 'applied', 'rejected'] as const).map((st) => (
            <button
              key={st}
              type="button"
              className={`status-tab-btn ${filterStatus === st ? 'active' : ''}`}
              onClick={() => setFilterStatus(st)}
            >
              {st === 'all' && `すべて (${reports.length})`}
              {st === 'pending' && `未対応・審査中 (${reports.filter((r) => r.status === 'pending').length})`}
              {st === 'applied' && `承認適用済み (${reports.filter((r) => r.status === 'applied').length})`}
              {st === 'rejected' && `却下 (${reports.filter((r) => r.status === 'rejected').length})`}
            </button>
          ))}
        </div>
      </div>

      {/* 報告一覧リスト */}
      {filteredReports.length === 0 ? (
        <div className="no-reports-box">
          <span className="no-reports-icon">📭</span>
          <p>該当する修正報告はありません。</p>
        </div>
      ) : (
        <div className="reports-cards-grid">
          {filteredReports.map((report) => (
            <div key={report.id} className={`report-item-card status-${report.status}`}>
              <div className="report-card-header">
                <div className="report-card-title-group">
                  <span className={`report-status-badge badge-${report.status}`}>
                    {report.status === 'pending' && '⏳ 未対応'}
                    {report.status === 'applied' && '✅ 承認適用済み'}
                    {report.status === 'rejected' && '❌ 却下'}
                  </span>
                  <span className="report-timestamp">{report.createdAt ? new Date(report.createdAt).toLocaleString('ja-JP') : ''}</span>
                </div>
                <span className="report-question-id">ID: {report.questionId}</span>
              </div>

              <div className="report-card-body">
                <h4 className="report-q-title">{report.questionTitle}</h4>

                {/* 座標の比較ボックス */}
                <div className="coords-diff-comparison-table">
                  <div className="diff-col original-col">
                    <span className="diff-label">【現在の正解地点】</span>
                    <span className="diff-name">{report.originalName || '（未登録）'}</span>
                    <span className="diff-coords">
                      北緯 {report.originalCoordinates.latitude.toFixed(6)}°, 東経 {report.originalCoordinates.longitude.toFixed(6)}°
                    </span>
                  </div>
                  <div className="diff-arrow" aria-hidden="true">➡️</div>
                  <div className="diff-col reported-col">
                    <span className="diff-label">【ユーザー報告の修正地点】</span>
                    <span className="diff-name highlight">
                      {report.reportedName ? report.reportedName : '（名称変更なし）'}
                    </span>
                    <span className="diff-coords highlight">
                      北緯 {report.reportedCoordinates.latitude.toFixed(6)}°, 東経 {report.reportedCoordinates.longitude.toFixed(6)}°
                    </span>
                  </div>
                </div>

                {/* エビデンスURL */}
                {report.evidenceUrl && (
                  <div className="report-meta-row">
                    <span className="meta-tag">🔗 参考URL:</span>
                    <a
                      href={report.evidenceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="evidence-link"
                    >
                      {report.evidenceUrl}
                    </a>
                  </div>
                )}

                {/* コメント */}
                {report.comment && (
                  <div className="report-meta-row comment-row">
                    <span className="meta-tag">💬 報告メモ:</span>
                    <span className="meta-text">{report.comment}</span>
                  </div>
                )}
              </div>

              {/* カード下部アクションボタン */}
              <div className="report-card-actions">
                {report.status !== 'applied' && (
                  <button
                    type="button"
                    className="report-action-btn apply-btn"
                    onClick={() => handleApply(report)}
                    title="この座標と名称を問題データに即座に反映します"
                  >
                    ✅ 承認して問題へ反映
                  </button>
                )}
                {report.status === 'pending' && (
                  <button
                    type="button"
                    className="report-action-btn reject-btn"
                    onClick={() => handleReject(report.id)}
                    title="この報告を却下します"
                  >
                    ❌ 却下
                  </button>
                )}
                <button
                  type="button"
                  className="report-action-btn delete-btn"
                  onClick={() => handleDelete(report.id)}
                  title="報告を削除"
                >
                  🗑️ 削除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
