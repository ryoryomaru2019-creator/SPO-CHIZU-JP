import React, { useState, useEffect } from 'react';
import {
  fetchAdminRankings,
  deleteScore,
  updateScore,
  RankingEntry,
  getRankingApiUrl,
} from '../services/rankingService';

export const AdminRankingsManager: React.FC = () => {
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [notification, setNotification] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(null);

  // 編集モーダル用の状態
  const [editingEntry, setEditingEntry] = useState<RankingEntry | null>(null);
  const [editPlayerName, setEditPlayerName] = useState<string>('');
  const [editScore, setEditScore] = useState<string>('');
  const [editDistanceKm, setEditDistanceKm] = useState<string>('');
  const [editAvgTime, setEditAvgTime] = useState<string>('');
  const [editMode, setEditMode] = useState<string>('');
  const [editCategory, setEditCategory] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // 削除中のID
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setNotification(null);
    try {
      const res = await fetchAdminRankings();
      setRankings(res.rankings);
      setIsOnline(res.isOnline);
      if (res.isOnline) {
        setNotification({ type: 'success', message: `${res.rankings.length}件のランキングデータを取得しました。` });
      } else {
        setNotification({ type: 'info', message: 'ローカルデータを表示しています（GAS連携URLを設定するとスプレッドシートから取得できます）。' });
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: `ランキングの取得に失敗しました: ${err.message || String(err)}` });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 編集モーダルを開く
  const handleOpenEdit = (entry: RankingEntry) => {
    setEditingEntry(entry);
    setEditPlayerName(entry.playerName);
    setEditScore(String(entry.totalScore));
    setEditDistanceKm(String(entry.totalDistanceKm));
    setEditAvgTime(entry.avgTimeFormatted || '');
    setEditMode(entry.mode || 'standard');
    setEditCategory(entry.categoryName || '全般');
  };

  // 編集保存
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEntry) return;

    const numScore = parseInt(editScore, 10);
    const numDistance = parseFloat(editDistanceKm);

    if (isNaN(numScore) || numScore < 0) {
      alert('有効なスコアを入力してください。');
      return;
    }

    setIsSaving(true);
    try {
      const res = await updateScore(
        {
          id: editingEntry.id,
          playerName: editPlayerName.trim(),
          totalScore: numScore,
          totalDistanceKm: isNaN(numDistance) ? 0 : numDistance,
          avgTimeFormatted: editAvgTime.trim(),
          mode: editMode.trim(),
          categoryName: editCategory.trim(),
        },
        true // isAdmin = true
      );

      if (res.success) {
        setNotification({ type: 'success', message: `スコア（ID: ${editingEntry.id}）を更新しました！` });
        setEditingEntry(null);
        await loadData();
      } else {
        alert(`更新に失敗しました: ${res.message}`);
      }
    } catch (err: any) {
      alert(`更新エラー: ${err.message || String(err)}`);
    } finally {
      setIsSaving(false);
    }
  };

  // 削除実行（管理者権限）
  const handleDelete = async (entry: RankingEntry) => {
    if (
      !window.confirm(
        `【管理者操作】\nプレイヤー「${entry.playerName}」のスコア（${entry.totalScore.toLocaleString()}点）を世界ランキングから完全に削除しますか？\n\n※この操作は元に戻せません。`
      )
    ) {
      return;
    }

    setDeletingId(entry.id);
    try {
      const res = await deleteScore(entry.id, '', true); // isAdmin = true
      if (res.success) {
        setNotification({ type: 'success', message: `スコア（ID: ${entry.id}）を削除しました。` });
        await loadData();
      } else {
        alert(`削除に失敗しました: ${res.message}`);
      }
    } catch (err: any) {
      alert(`削除エラー: ${err.message || String(err)}`);
    } finally {
      setDeletingId(null);
    }
  };

  // 検索フィルタリング
  const filteredRankings = rankings.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.playerName.toLowerCase().includes(q) ||
      (r.playerId && r.playerId.toLowerCase().includes(q)) ||
      r.id.toLowerCase().includes(q) ||
      r.categoryName.toLowerCase().includes(q)
    );
  });

  const apiUrl = getRankingApiUrl();

  return (
    <div className="admin-rankings-manager">
      {/* ヘッダーエリア */}
      <div className="rankings-manager-header">
        <div className="rankings-header-info">
          <h2>🏆 世界ランキング管理 (管理者コンソール)</h2>
          <p className="rankings-header-desc">
            Googleスプレッドシートに保存された世界ランキングスコアの確認・編集・削除が行えます。各ユーザーのベスト3スコア抽出ルールや不正スコアの除外に対応しています。
          </p>
          <div className="api-url-indicator">
            <span className="api-label">接続状態:</span>
            <span className={`sync-status-indicator ${isOnline ? 'online' : 'local'}`}>
              {isOnline ? '🟢 オンライン同期中' : '📁 ローカルモード'}
            </span>
            <span className="api-label" style={{ marginLeft: '8px' }}>接続先API:</span>
            <code className="api-code">{apiUrl || '（未設定・ローカルモード）'}</code>
          </div>
        </div>
        <div className="rankings-header-actions">
          <button
            type="button"
            className="refresh-btn sync-gas-btn"
            onClick={loadData}
            disabled={isLoading}
            title="Googleスプレッドシートから最新ランキングを取得"
          >
            {isLoading ? '取得中...' : '🔄 スプレッドシートから最新取得'}
          </button>
        </div>
      </div>

      {notification && (
        <div className={`report-notification-banner ${notification.type}`} role="alert">
          {notification.type === 'success' ? '✅ ' : notification.type === 'error' ? '❌ ' : 'ℹ️ '}
          {notification.message}
        </div>
      )}

      {/* 検索・ツールバー */}
      <div className="rankings-table-toolbar">
        <div className="toolbar-search-box">
          <input
            type="text"
            className="table-search-input"
            placeholder="🔍 プレイヤー名、ID、カテゴリで検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={() => setSearchQuery('')}
            >
              ✕
            </button>
          )}
        </div>
        <div className="toolbar-stats">
          該当: <strong>{filteredRankings.length}</strong> 件 / 全 <strong>{rankings.length}</strong> 件
        </div>
      </div>

      {/* ランキング一覧テーブル */}
      {filteredRankings.length === 0 ? (
        <div className="no-reports-box">
          <span className="no-reports-icon">📭</span>
          <p>{isLoading ? 'ランキングデータを取得中です...' : '該当するランキングデータはありません。'}</p>
        </div>
      ) : (
        <div className="admin-table-container">
          <table className="admin-table rankings-admin-table">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>順位</th>
                <th>プレイヤー名</th>
                <th>スコア</th>
                <th>誤差距離</th>
                <th>回答時間</th>
                <th>カテゴリ / 難易度</th>
                <th>プレイ日時</th>
                <th>プレイヤー固有ID</th>
                <th style={{ width: '130px', textAlign: 'center' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredRankings.map((entry, idx) => {
                const rankNum = entry.rank || idx + 1;
                return (
                  <tr key={entry.id || idx}>
                    <td className="rank-cell-admin">
                      {rankNum === 1 ? '🥇 1' : rankNum === 2 ? '🥈 2' : rankNum === 3 ? '🥉 3' : rankNum}
                    </td>
                    <td>
                      <strong className="player-name-bold">{entry.playerName}</strong>
                    </td>
                    <td>
                      <span className="score-val-bold">{entry.totalScore.toLocaleString()}</span> 点
                    </td>
                    <td>{entry.totalDistanceKm.toFixed(2)} km</td>
                    <td>{entry.avgTimeFormatted || '--'}</td>
                    <td>
                      <span className="category-pill">{entry.categoryName || '全般'}</span>{' '}
                      <span className="diff-pill">{entry.difficulty || 'all'}</span>
                    </td>
                    <td className="date-cell-admin">
                      {entry.playedAt ? new Date(entry.playedAt).toLocaleString('ja-JP') : '--'}
                    </td>
                    <td>
                      <code className="player-id-code">{entry.playerId || '（旧データ）'}</code>
                    </td>
                    <td className="actions-cell-admin">
                      <button
                        type="button"
                        className="table-action-btn edit-btn"
                        onClick={() => handleOpenEdit(entry)}
                        title="このスコア情報を編集"
                      >
                        ✏️ 編集
                      </button>
                      <button
                        type="button"
                        className="table-action-btn delete-btn"
                        onClick={() => handleDelete(entry)}
                        disabled={deletingId === entry.id}
                        title="このスコアを世界ランキングから完全削除"
                      >
                        {deletingId === entry.id ? '削除中...' : '🗑️ 削除'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ✏️ スコア編集モーダル */}
      {editingEntry && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="edit-score-title">
          <div className="card question-editor-modal score-edit-modal">
            <header className="modal-header">
              <h3 id="edit-score-title">✏️ ランキングスコアの編集</h3>
              <button
                type="button"
                className="close-modal-btn"
                onClick={() => setEditingEntry(null)}
                aria-label="閉じる"
              >
                ✕
              </button>
            </header>

            <form onSubmit={handleSaveEdit} className="editor-form">
              <div className="form-grid">
                <div className="form-field full-width">
                  <label className="form-label">スコアID (変更不可)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editingEntry.id}
                    disabled
                    style={{ background: '#f1f5f9', color: '#64748b' }}
                  />
                </div>

                <div className="form-field">
                  <label className="form-label required">プレイヤー名</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editPlayerName}
                    maxLength={20}
                    onChange={(e) => setEditPlayerName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-field">
                  <label className="form-label required">合計スコア (点)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={editScore}
                    onChange={(e) => setEditScore(e.target.value)}
                    required
                  />
                </div>

                <div className="form-field">
                  <label className="form-label">合計誤差距離 (km)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    value={editDistanceKm}
                    onChange={(e) => setEditDistanceKm(e.target.value)}
                  />
                </div>

                <div className="form-field">
                  <label className="form-label">回答時間表記</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editAvgTime}
                    onChange={(e) => setEditAvgTime(e.target.value)}
                    placeholder="例: 00分15秒"
                  />
                </div>

                <div className="form-field">
                  <label className="form-label">カテゴリ名</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                  />
                </div>

                <div className="form-field">
                  <label className="form-label">ゲームモード</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editMode}
                    onChange={(e) => setEditMode(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-actions" style={{ marginTop: '20px' }}>
                <button
                  type="button"
                  className="neo-action-btn cancel-btn"
                  onClick={() => setEditingEntry(null)}
                  disabled={isSaving}
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="neo-action-btn primary-btn save-btn"
                  disabled={isSaving || !editPlayerName.trim()}
                >
                  {isSaving ? '保存中...' : '💾 変更を保存して反映'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
