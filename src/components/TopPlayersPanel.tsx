import React, { useState, useEffect } from 'react';
import { fetchRankings, RankingEntry } from '../services/rankingService';

interface TopPlayersPanelProps {
  currentRound?: number;
  initialOpen?: boolean;
}

export type RankingSector = 'all' | 'j-all' | 'j1' | 'j2' | 'j3' | 'entertainment' | 'history' | 'geography';

export const TopPlayersPanel: React.FC<TopPlayersPanelProps> = ({
  initialOpen = false,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(initialOpen);
  const [activeTab, setActiveTab] = useState<'all' | 'custom'>('all');
  const [selectedSector, setSelectedSector] = useState<RankingSector>('j-all');
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [isOnline, setIsOnline] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const currentMode = activeTab === 'all' ? 'all' : selectedSector;

  const loadData = async () => {
    setIsLoading(true);
    try {
      const res = await fetchRankings(10, currentMode);
      setRankings(res.rankings);
      setIsOnline(res.isOnline);
    } catch (e) {
      console.warn('Failed to fetch rankings', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab, selectedSector]);

  return (
    <div
      className={`geoguessr-top-players ${isOpen ? 'open' : 'collapsed'}`}
      aria-label="トッププレイヤーランキング"
    >
      <button
        type="button"
        className="top-players-header-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-label={isOpen ? 'ランキングを閉じる' : 'ランキングを開く'}
      >
        <div className="header-title-group">
          <span className="trophy-icon" aria-hidden="true">🏆</span>
          <span className="panel-title">トッププレイヤー</span>
          <span
            className={`status-dot ${isOnline ? 'online' : 'local'}`}
            title={isOnline ? 'Googleスプレッドシート連携中' : 'ローカルランキング'}
          />
        </div>
        <span className="toggle-collapse-icon" aria-hidden="true">
          {isOpen ? '▲' : '▼'}
        </span>
      </button>

      {isOpen && (
        <div className="top-players-dropdown-content">
          <div className="top-players-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'all'}
              className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              全体
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'custom'}
              className={`tab-btn ${activeTab === 'custom' ? 'active' : ''}`}
              onClick={() => setActiveTab('custom')}
            >
              リーグ・ジャンル別
            </button>
          </div>

          {activeTab === 'custom' && (
            <div className="top-players-sector-selector-box">
              <label htmlFor="ranking-sector-select" className="sector-select-label">
                部門選択:
              </label>
              <select
                id="ranking-sector-select"
                className="top-players-sector-select neo-select"
                value={selectedSector}
                onChange={(e) => setSelectedSector(e.target.value as RankingSector)}
              >
                <optgroup label="Jリーグ (サッカー)">
                  <option value="j-all">⚽ Jリーグ全体 (J1・J2・J3)</option>
                  <option value="j1">🔴 J1リーグ (20クラブ)</option>
                  <option value="j2">🔵 J2リーグ (20クラブ)</option>
                  <option value="j3">🟢 J3リーグ (20クラブ)</option>
                </optgroup>
                <optgroup label="他ジャンル">
                  <option value="entertainment">🎬 エンタメ</option>
                  <option value="history">⛩️ 歴史</option>
                  <option value="geography">🗾 地理・観光</option>
                </optgroup>
              </select>
            </div>
          )}

          <div className="players-list">
            {isLoading ? (
              <div className="ranking-loading">読み込み中...</div>
            ) : rankings.length === 0 ? (
              <div className="no-rankings">まだスコアがありません</div>
            ) : (
              rankings.slice(0, 5).map((player, idx) => {
                const rank = player.rank || idx + 1;
                return (
                  <div key={player.id || idx} className={`player-row rank-${rank}`}>
                    <span className="rank-badge">#{rank}</span>
                    <span className="player-avatar" aria-hidden="true">
                      {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '⚽'}
                    </span>
                    <span className="player-name" title={player.playerName}>
                      {player.playerName}
                    </span>
                    <span className="player-score">
                      {player.totalScore.toLocaleString()}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          <footer className="ranking-sync-footer">
            <span className="sync-note">
              {isOnline ? '☁️ リアルタイム同期中' : '📁 ローカルハイスコア'}
            </span>
            <button
              type="button"
              className="refresh-btn"
              onClick={loadData}
              title="ランキングを再取得"
            >
              🔄
            </button>
          </footer>
        </div>
      )}
    </div>
  );
};
