import React, { useState } from 'react';
import { GameHistory } from '../types/game';
import { formatDistance } from '../utils/distance';
import {
  safeCreateGoogleMapSearchUrl,
  safeCreateGoogleStreetViewUrl,
} from '../utils/googleMapsUrls';
import {
  clearAllHistories,
  deleteHistory,
  getHistories,
} from '../storage/historyStorage';

interface HistoryPageProps {
  onBackToGame: () => void;
}

export const HistoryPage: React.FC<HistoryPageProps> = ({ onBackToGame }) => {
  const [histories, setHistories] = useState<GameHistory[]>(() => getHistories());
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleDeleteOne = (id: string) => {
    if (window.confirm('このプレイ履歴を削除しますか？')) {
      const updated = deleteHistory(id);
      setHistories(updated);
    }
  };

  const handleClearAll = () => {
    if (window.confirm('すべてのプレイ履歴を削除しますか？この操作は取り消せません。')) {
      clearAllHistories();
      setHistories([]);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="history-page screen-container">
      <div className="card history-card">
        <header className="history-header">
          <div className="header-title-row">
            <h2>📜 プレイ結果履歴</h2>
            <div className="history-header-actions">
              {histories.length > 0 && (
                <button
                  type="button"
                  className="danger-outline-btn clear-all-btn"
                  onClick={handleClearAll}
                >
                  🗑️ すべての履歴を削除
                </button>
              )}
              <button
                type="button"
                className="primary-btn back-btn"
                onClick={onBackToGame}
              >
                ⚽ ゲームに戻る
              </button>
            </div>
          </div>
          <p className="history-subtitle">
            過去のゲームスコアと詳細な回答データを確認できます（ブラウザのlocalStorageに保存）。
          </p>
        </header>

        {histories.length === 0 ? (
          <div className="empty-history-state" role="status">
            <div className="empty-icon" aria-hidden="true">📭</div>
            <h3>プレイ履歴がまだありません</h3>
            <p>ゲームをプレイすると、ラウンドごとの誤差距離や獲得スコアがここに記録されます。</p>
            <button
              type="button"
              className="primary-btn"
              onClick={onBackToGame}
              style={{ marginTop: '16px' }}
            >
              今すぐゲームをプレイ！
            </button>
          </div>
        ) : (
          <div className="history-list" role="feed" aria-label="ゲーム履歴一覧">
            {histories.map((item) => {
              const dateStr = new Date(item.playedAt).toLocaleString('ja-JP', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });
              const isExpanded = expandedId === item.id;

              return (
                <article key={item.id} className="history-item-card">
                  <div
                    className="history-item-summary"
                    onClick={() => toggleExpand(item.id)}
                    role="button"
                    tabIndex={0}
                    aria-expanded={isExpanded}
                  >
                    <div className="summary-left">
                      <span className="history-date">{dateStr}</span>
                      <div className="history-tags">
                        <span className="history-badge category-badge">
                          📂 {item.mode.categoryName || item.mode.categoryId || '全カテゴリ'}
                        </span>
                        <span className="history-badge difficulty-badge">
                          ⭐ {item.mode.difficulty || '全難易度'}
                        </span>
                        <span className="history-badge count-badge">
                          {item.mode.questionCount || item.results.length}問
                        </span>
                      </div>
                    </div>

                    <div className="summary-right">
                      <div className="history-stat score-stat">
                        <span className="stat-label">合計スコア</span>
                        <span className="stat-val">{item.totalScore.toLocaleString()} 点</span>
                      </div>
                      <div className="history-stat distance-stat">
                        <span className="stat-label">平均誤差</span>
                        <span className="stat-val">{formatDistance(item.averageDistanceKm)}</span>
                      </div>
                      <div className="history-stat correct-stat">
                        <span className="stat-label">正解数</span>
                        <span className="stat-val">{item.correctCount} / {item.results.length}</span>
                      </div>
                      <button
                        type="button"
                        className="icon-action-btn delete-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteOne(item.id);
                        }}
                        title="この履歴を削除"
                        aria-label="この履歴を削除"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  {/* 詳細結果の展開アコーディオン */}
                  {isExpanded && (
                    <div className="history-item-details" role="region">
                      <h4>📊 各問の結果詳細</h4>
                      <div className="history-rounds-grid">
                        {item.results.map((res, index) => {
                          const userSv = safeCreateGoogleStreetViewUrl(res.answerLatitude, res.answerLongitude);
                          const correctMap = safeCreateGoogleMapSearchUrl(res.correctLatitude, res.correctLongitude);
                          const correctSv = safeCreateGoogleStreetViewUrl(res.correctLatitude, res.correctLongitude);

                          return (
                            <div key={res.questionId || index} className="round-detail-card">
                              <div className="round-header">
                                <span className="round-num">第 {index + 1} 問</span>
                                <span className="round-stadium-title">
                                  {res.stadiumName || res.questionTitle}
                                </span>
                              </div>

                              <div className="round-scores-row">
                                <div className="detail-metric">
                                  <span>誤差距離:</span>
                                  <strong>{formatDistance(res.distanceKm)}</strong>
                                </div>
                                <div className="detail-metric">
                                  <span>獲得スコア:</span>
                                  <strong className="score-color">+{res.score} 点</strong>
                                </div>
                              </div>

                              <div className="round-coords-info">
                                <small>
                                  回答: 北緯 {res.answerLatitude.toFixed(4)}°, 東経 {res.answerLongitude.toFixed(4)}°
                                </small>
                                <br />
                                <small>
                                  正解: 北緯 {res.correctLatitude.toFixed(4)}°, 東経 {res.correctLongitude.toFixed(4)}°
                                </small>
                              </div>

                              <div className="round-external-links">
                                {userSv && (
                                  <a
                                    href={userSv}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mini-link-btn"
                                  >
                                    📍 回答地点周辺
                                  </a>
                                )}
                                {correctMap && (
                                  <a
                                    href={correctMap}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mini-link-btn"
                                  >
                                    🔍 正解地点地図
                                  </a>
                                )}
                                {correctSv && (
                                  <a
                                    href={correctSv}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mini-link-btn"
                                  >
                                    🏟️ 正解地点周辺
                                  </a>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

