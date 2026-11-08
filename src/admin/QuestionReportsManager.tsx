import React, { useState, useMemo } from 'react';
import { QuestionReport, ReportStatus } from '../types/report';
import {
  applyReportToQuestion,
  deleteStoredReport,
  getStoredReports,
  updateReportStatus,
  updateReportContent,
} from '../storage/reportStorage';
import { getRankingApiUrl } from '../services/rankingService';
import { getStoredQuestions } from '../storage/questionStorage';
import { safeCreateGoogleMapSearchUrl } from '../utils/googleMapsUrls';
import { parseCoordinatesString } from '../utils/coordinates';

type SortOption = 'date_desc' | 'date_asc' | 'title_asc' | 'title_desc';

export const QuestionReportsManager: React.FC = () => {
  const [reports, setReports] = useState<QuestionReport[]>(() => getStoredReports());
  const [filterStatus, setFilterStatus] = useState<ReportStatus | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('date_desc');
  const [notification, setNotification] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(null);
  const [isFetchingGas, setIsFetchingGas] = useState<boolean>(false);

  // 編集モーダル用の状態
  const [editingReport, setEditingReport] = useState<QuestionReport | null>(null);
  const [editName, setEditName] = useState('');
  const [editLat, setEditLat] = useState('');
  const [editLng, setEditLng] = useState('');
  const [editComment, setEditComment] = useState('');
  const [editEvidenceUrl, setEditEvidenceUrl] = useState('');
  const [editPasteCoords, setEditPasteCoords] = useState('');
  const [editNotice, setEditNotice] = useState<string | null>(null);

  // 全問題データ（カテゴリ判定用マップ）
  const questionsMap = useMemo(() => {
    const list = getStoredQuestions();
    const map = new Map<string, (typeof list)[0]>();
    list.forEach((q) => map.set(q.id, q));
    return map;
  }, [reports]);

  // 利用可能なカテゴリ一覧の抽出
  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    reports.forEach((r) => {
      const q = questionsMap.get(r.questionId);
      if (q && q.categoryId) {
        cats.add(q.categoryId);
      }
    });
    return Array.from(cats);
  }, [reports, questionsMap]);

  // フィルタ & ソート適用
  const filteredReports = useMemo(() => {
    let result = reports.filter((r) => {
      // ステータス絞り込み
      if (filterStatus !== 'all' && r.status !== filterStatus) return false;

      // カテゴリ絞り込み
      if (selectedCategory !== 'all') {
        const q = questionsMap.get(r.questionId);
        if (!q || q.categoryId !== selectedCategory) return false;
      }

      return true;
    });

    // ソート
    result.sort((a, b) => {
      switch (sortBy) {
        case 'date_desc':
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        case 'date_asc':
          return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
        case 'title_asc':
          return a.questionTitle.localeCompare(b.questionTitle, 'ja');
        case 'title_desc':
          return b.questionTitle.localeCompare(a.questionTitle, 'ja');
        default:
          return 0;
      }
    });

    return result;
  }, [reports, filterStatus, selectedCategory, sortBy, questionsMap]);

  // 承認適用
  const handleApply = (report: QuestionReport) => {
    if (
      !window.confirm(
        `問題「${report.questionTitle}」に報告された修正を反映しますか？\n\n新座標: 北緯 ${report.reportedCoordinates.latitude}°, 東経 ${report.reportedCoordinates.longitude}°\n新名称: ${
          report.reportedName || '（変更なし）'
        }`
      )
    ) {
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

  // 保留 / タスクリストへの切り替え
  const handleToggleHold = (id: string, currentStatus: ReportStatus) => {
    const nextStatus: ReportStatus = currentStatus === 'on_hold' ? 'pending' : 'on_hold';
    const updated = updateReportStatus(id, nextStatus);
    setReports(updated);
    setNotification({
      type: 'info',
      message:
        nextStatus === 'on_hold'
          ? '報告を「保留（タスクリスト）」に追加しました。'
          : '保留を解除し「未対応・審査中」に戻しました。',
    });
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

  // 編集モーダルを開く
  const handleOpenEdit = (report: QuestionReport) => {
    setEditingReport(report);
    setEditName(report.reportedName || '');
    setEditLat(String(report.reportedCoordinates.latitude));
    setEditLng(String(report.reportedCoordinates.longitude));
    setEditComment(report.comment || '');
    setEditEvidenceUrl(report.evidenceUrl || '');
    setEditPasteCoords('');
    setEditNotice(null);
  };

  // 編集の保存
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReport) return;

    const lat = parseFloat(editLat.trim());
    const lng = parseFloat(editLng.trim());

    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      alert('有効な緯度 (-90〜+90) と経度 (-180〜+180) を入力してください。');
      return;
    }

    const updated = updateReportContent(editingReport.id, {
      reportedName: editName.trim() || undefined,
      reportedCoordinates: { latitude: lat, longitude: lng },
      comment: editComment.trim() || undefined,
      evidenceUrl: editEvidenceUrl.trim() || undefined,
    });

    setReports(updated);
    setEditingReport(null);
    setNotification({ type: 'success', message: '報告内容の編集を保存しました！' });
  };

  // 編集モーダル内での座標コピペ自動反映
  const handleApplyEditPastedCoords = (text: string) => {
    const parsed = parseCoordinatesString(text);
    if (parsed) {
      setEditLat(String(parsed.latitude));
      setEditLng(String(parsed.longitude));
      setEditPasteCoords('');
      setEditNotice(`座標を反映しました: [${parsed.latitude}, ${parsed.longitude}]`);
      setTimeout(() => setEditNotice(null), 3000);
      return true;
    }
    return false;
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

      {/* フィルタ & ソート ツールバー */}
      <div className="reports-filter-toolbar">
        {/* ステータスフィルタタブ */}
        <div className="status-filter-chips">
          {(
            [
              { id: 'all', label: `すべて (${reports.length})` },
              { id: 'pending', label: `未対応・審査中 (${reports.filter((r) => r.status === 'pending').length})` },
              { id: 'applied', label: `承認適用済み (${reports.filter((r) => r.status === 'applied').length})` },
              { id: 'rejected', label: `却下 (${reports.filter((r) => r.status === 'rejected').length})` },
              { id: 'on_hold', label: `📋 保留・タスクリスト (${reports.filter((r) => r.status === 'on_hold').length})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`status-tab-btn ${filterStatus === tab.id ? 'active' : ''}`}
              onClick={() => setFilterStatus(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* カテゴリ & ソート ドロップダウン */}
        <div className="reports-secondary-filters">
          {availableCategories.length > 0 && (
            <div className="filter-group-inline">
              <label htmlFor="cat-filter" className="inline-label">カテゴリ:</label>
              <select
                id="cat-filter"
                className="form-select inline-select"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="all">全カテゴリ</option>
                {availableCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="filter-group-inline">
            <label htmlFor="sort-filter" className="inline-label">並び替え:</label>
            <select
              id="sort-filter"
              className="form-select inline-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
            >
              <option value="date_desc">📅 日付 (新しい順)</option>
              <option value="date_asc">📅 日付 (古い順)</option>
              <option value="title_asc">🔤 問題タイトル (昇順)</option>
              <option value="title_desc">🔤 問題タイトル (降順)</option>
            </select>
          </div>
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
                    {report.status === 'pending' && '⏳ 未対応・審査中'}
                    {report.status === 'applied' && '✅ 承認適用済み'}
                    {report.status === 'rejected' && '❌ 却下'}
                    {report.status === 'on_hold' && '📋 保留（タスク）'}
                  </span>
                  <span className="report-timestamp">
                    {report.createdAt ? new Date(report.createdAt).toLocaleString('ja-JP') : ''}
                  </span>
                </div>
                <span className="report-question-id">問題ID: {report.questionId}</span>
              </div>

              <div className="report-card-body">
                <h4 className="report-q-title">{report.questionTitle}</h4>

                {/* 座標の比較ボックス（クリックでGoogleマップ新規タブで開く） */}
                <div className="coords-diff-comparison-table">
                  <div className="diff-col original-col">
                    <span className="diff-label">【現在の正解地点】</span>
                    <span className="diff-name">{report.originalName || '（未登録）'}</span>
                    <a
                      href={
                        safeCreateGoogleMapSearchUrl(
                          report.originalCoordinates.latitude,
                          report.originalCoordinates.longitude
                        ) || undefined
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="diff-coords clickable-map-link"
                      title="Googleマップでこの正解地点を開く（新規タブ）"
                    >
                      📍 北緯 {report.originalCoordinates.latitude.toFixed(6)}°, 東経{' '}
                      {report.originalCoordinates.longitude.toFixed(6)}° ↗
                    </a>
                  </div>
                  <div className="diff-arrow" aria-hidden="true">
                    ➡️
                  </div>
                  <div className="diff-col reported-col">
                    <span className="diff-label">【ユーザー報告の修正地点】</span>
                    <span className="diff-name highlight">
                      {report.reportedName ? report.reportedName : '（名称変更なし）'}
                    </span>
                    <a
                      href={
                        safeCreateGoogleMapSearchUrl(
                          report.reportedCoordinates.latitude,
                          report.reportedCoordinates.longitude
                        ) || undefined
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="diff-coords highlight clickable-map-link"
                      title="Googleマップでこの報告地点を開く（新規タブ・目視チェック）"
                    >
                      📍 北緯 {report.reportedCoordinates.latitude.toFixed(6)}°, 東経{' '}
                      {report.reportedCoordinates.longitude.toFixed(6)}° ↗
                    </a>
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

                {/* ✏️ 編集ボタン（承認ボタンの右） */}
                <button
                  type="button"
                  className="report-action-btn edit-report-btn"
                  onClick={() => handleOpenEdit(report)}
                  title="報告された名称や座標を管理者が手動微調整・編集"
                >
                  ✏️ 編集
                </button>

                {/* ⏸️ 保留（タスクリスト） */}
                <button
                  type="button"
                  className={`report-action-btn hold-btn ${report.status === 'on_hold' ? 'active-hold' : ''}`}
                  onClick={() => handleToggleHold(report.id, report.status)}
                  title={report.status === 'on_hold' ? '保留を解除して未対応に戻す' : 'タスクリストに保管'}
                >
                  {report.status === 'on_hold' ? '▶️ 保留解除' : '⏸️ 保留'}
                </button>

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

      {/* ✏️ 報告内容編集モーダル */}
      {editingReport && (
        <div className="modal-backdrop" onClick={() => setEditingReport(null)}>
          <div
            className="question-editor-modal report-edit-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="report-edit-title"
          >
            <div className="modal-header">
              <h3 id="report-edit-title">✏️ 修正報告内容の編集</h3>
              <button
                type="button"
                className="close-modal-btn"
                onClick={() => setEditingReport(null)}
                aria-label="閉じる"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="form-grid">
              <div className="form-field full-width">
                <label className="form-label">対象問題タイトル</label>
                <div className="info-display-box">{editingReport.questionTitle}</div>
              </div>

              {/* 会場名 */}
              <div className="form-field full-width">
                <label htmlFor="edit-rep-name" className="form-label">
                  修正後の会場名 (任意)
                </label>
                <input
                  id="edit-rep-name"
                  type="text"
                  className="form-input"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="例: 正式名称スタジアム"
                />
              </div>

              {/* Googleマップ座標の一括貼付 */}
              <div className="form-field full-width paste-coords-section">
                <label htmlFor="edit-coords-paste" className="form-label">
                  📋 Googleマップ座標の一括貼付（自動分割）
                </label>
                <div className="google-coords-paste-box">
                  <input
                    id="edit-coords-paste"
                    type="text"
                    className="form-input"
                    value={editPasteCoords}
                    onChange={(e) => {
                      setEditPasteCoords(e.target.value);
                      if (e.target.value.includes(',')) {
                        handleApplyEditPastedCoords(e.target.value);
                      }
                    }}
                    onPaste={(e) => {
                      const text = e.clipboardData.getData('text');
                      if (text && handleApplyEditPastedCoords(text)) {
                        e.preventDefault();
                      }
                    }}
                    placeholder="例: 35.695957, 139.682124 (Googleマップからコピーした座標)"
                  />
                  <button
                    type="button"
                    className="neo-action-btn clipboard-paste-btn"
                    onClick={async () => {
                      try {
                        if (navigator.clipboard?.readText) {
                          const text = await navigator.clipboard.readText();
                          if (text && handleApplyEditPastedCoords(text)) return;
                        }
                        alert('有効な座標をクリップボードから取得できませんでした。');
                      } catch {
                        alert('クリップボード読み取り権限が拒否されました。直接入力枠に貼り付けてください。');
                      }
                    }}
                  >
                    📋 貼付
                  </button>
                </div>
                {editNotice && <div className="paste-success-notice">{editNotice}</div>}
              </div>

              {/* 緯度・経度 */}
              <div className="form-field">
                <label htmlFor="edit-rep-lat" className="form-label required">
                  修正後の緯度
                </label>
                <input
                  id="edit-rep-lat"
                  type="text"
                  className="form-input"
                  value={editLat}
                  onChange={(e) => setEditLat(e.target.value)}
                  onPaste={(e) => {
                    const text = e.clipboardData.getData('text');
                    if (text && text.includes(',') && handleApplyEditPastedCoords(text)) {
                      e.preventDefault();
                    }
                  }}
                  required
                />
              </div>

              <div className="form-field">
                <label htmlFor="edit-rep-lng" className="form-label required">
                  修正後の経度
                </label>
                <input
                  id="edit-rep-lng"
                  type="text"
                  className="form-input"
                  value={editLng}
                  onChange={(e) => setEditLng(e.target.value)}
                  onPaste={(e) => {
                    const text = e.clipboardData.getData('text');
                    if (text && text.includes(',') && handleApplyEditPastedCoords(text)) {
                      e.preventDefault();
                    }
                  }}
                  required
                />
              </div>

              {/* 参考URL */}
              <div className="form-field full-width">
                <label htmlFor="edit-rep-url" className="form-label">
                  参考URL (エビデンス)
                </label>
                <input
                  id="edit-rep-url"
                  type="url"
                  className="form-input"
                  value={editEvidenceUrl}
                  onChange={(e) => setEditEvidenceUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>

              {/* コメント */}
              <div className="form-field full-width">
                <label htmlFor="edit-rep-comment" className="form-label">
                  報告メモ・コメント
                </label>
                <textarea
                  id="edit-rep-comment"
                  className="form-input"
                  rows={2}
                  value={editComment}
                  onChange={(e) => setEditComment(e.target.value)}
                />
              </div>

              <div className="modal-actions full-width">
                <button
                  type="button"
                  className="neo-action-btn cancel-btn"
                  onClick={() => setEditingReport(null)}
                >
                  キャンセル
                </button>
                <button type="submit" className="neo-action-btn primary-action-btn">
                  💾 編集内容を保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
