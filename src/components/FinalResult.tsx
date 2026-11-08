import React, { useState, useEffect } from 'react';
import { RoundResult } from '../types/game';
import { formatDistance } from '../utils/distance';
import { formatTimeDisplay } from '../utils/time';
import { GoogleMapsLinks } from './GoogleMapsLinks';
import { ReportQuestionModal } from './ReportQuestionModal';
import {
  submitScore,
  getLastPlayerName,
  fetchRankings,
  RankingEntry,
  getRankingApiUrl,
  getPlayerUniqueId,
  deleteScore,
} from '../services/rankingService';

interface FinalResultProps {
  roundResults: RoundResult[];
  onRestart: () => void;
  onNavigateToHistory?: () => void;
}

export const FinalResult: React.FC<FinalResultProps> = ({
  roundResults,
  onRestart,
  onNavigateToHistory,
}) => {
  const totalScore = roundResults.reduce((acc, r) => acc + r.score, 0);
  const maxPossibleScore = roundResults.length * 6000; // 満点: 距離5000 + タイム1000

  const totalDistance = roundResults.reduce((acc, r) => acc + r.distanceKm, 0);
  const averageDistance = roundResults.length > 0 ? totalDistance / roundResults.length : 0;

  // 10km以内を「正解（ナイス予想）」としてカウント
  const goodGuessesCount = roundResults.filter((r) => r.distanceKm <= 10).length;

  const totalElapsedMs = roundResults.reduce((acc, r) => acc + (r.elapsedMs || 0), 0);
  const hasTimes = roundResults.some((r) => typeof r.elapsedMs === 'number');

  // ランキング登録ステート
  const [playerName, setPlayerName] = useState<string>(() => getLastPlayerName());
  const [playerUniqueId] = useState<string>(() => getPlayerUniqueId());
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitMessage, setSubmitMessage] = useState<{ text: string; isError?: boolean } | null>(null);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [topRankings, setTopRankings] = useState<RankingEntry[]>([]);
  const [isOnline, setIsOnline] = useState<boolean>(false);
  const [isLoadingRankings, setIsLoadingRankings] = useState<boolean>(false);
  const [isDeletingScoreId, setIsDeletingScoreId] = useState<string | null>(null);

  // 問題ごとの結果カード 折り畳み管理 (初期は全折り畳み、または1問目だけ展開)
  const [expandedIndices, setExpandedIndices] = useState<Set<number>>(new Set([0]));
  const [reportingResult, setReportingResult] = useState<RoundResult | null>(null);

  const toggleExpand = (index: number) => {
    setExpandedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const toggleAllExpand = () => {
    if (expandedIndices.size === roundResults.length) {
      setExpandedIndices(new Set());
    } else {
      setExpandedIndices(new Set(roundResults.map((_, i) => i)));
    }
  };

  const hasApiConfigured = Boolean(getRankingApiUrl());

  const loadRankings = async () => {
    setIsLoadingRankings(true);
    try {
      const res = await fetchRankings(20);
      setTopRankings(res.rankings);
      setIsOnline(res.isOnline);
    } finally {
      setIsLoadingRankings(false);
    }
  };

  useEffect(() => {
    loadRankings();
    // Result画面表示時に確実に先頭（ゲーム終了タイトル）へスクロール
    if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
      try {
        window.scrollTo({ top: 0, behavior: 'instant' });
      } catch {
        // ignore in test environments
      }
    }
    const mainEl = document.querySelector('.main-content');
    if (mainEl && typeof mainEl.scrollTo === 'function') {
      try {
        mainEl.scrollTo({ top: 0, behavior: 'instant' });
      } catch {
        // ignore in test environments
      }
    }
  }, []);

  const handleDeleteMyScore = async (rankingId: string, score: number) => {
    if (
      !window.confirm(
        `世界ランキングからあなたのスコア（${score.toLocaleString()}点）を削除しますか？\n※この操作は取り消せません。`
      )
    ) {
      return;
    }

    try {
      setIsDeletingScoreId(rankingId);
      const res = await deleteScore(rankingId, playerUniqueId);
      if (res.success) {
        setSubmitMessage({ text: '世界ランキングからあなたのスコアを削除しました。' });
        await loadRankings();
      } else {
        alert(`削除に失敗しました: ${res.message}`);
      }
    } catch (err: any) {
      alert(`削除エラー: ${err.message || String(err)}`);
    } finally {
      setIsDeletingScoreId(null);
    }
  };

  const handleSubmitScore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim() || isSubmitting || isSubmitted) return;

    setIsSubmitting(true);
    setSubmitMessage(null);

    try {
      const avgKm = Number(averageDistance.toFixed(2));
      const res = await submitScore({
        playerName: playerName.trim(),
        totalScore,
        totalDistanceKm: avgKm,
        avgTimeFormatted: formatTimeDisplay(totalElapsedMs),
        questionCount: roundResults.length,
        playerId: playerUniqueId,
        mode: 'standard',
        categoryName: 'Jリーグ会場',
      });

      if (res.success) {
        setIsSubmitted(true);
        setSubmitMessage({ text: res.message });
        // 最新ランキングを再取得
        await loadRankings();
      } else {
        setSubmitMessage({ text: res.message, isError: true });
      }
    } catch (err: any) {
      setSubmitMessage({ text: `エラーが発生しました: ${err.message || String(err)}`, isError: true });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="screen-container final-screen geoguessr-theme">
      <div className="card final-card geoguessr-card">
        <header className="final-header">
          <div className="trophy-badge" aria-hidden="true">🏆</div>
          <h1 className="final-title">ゲーム終了！お疲れ様でした</h1>
          <p className="final-subtitle">JAPAN 地理王への挑戦結果！</p>
        </header>

        {/* スコア・スタッツグリッド */}
        <section className="final-stats-grid">
          <div className="stat-card highlight">
            <span className="stat-label">合計スコア</span>
            <span className="stat-value">{totalScore} <span className="stat-unit">/ {maxPossibleScore} 点</span></span>
          </div>
          <div className="stat-card">
            <span className="stat-label">平均誤差距離</span>
            <span className="stat-value">{formatDistance(averageDistance)}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">ニアピン数 (10km以内)</span>
            <span className="stat-value">{goodGuessesCount} <span className="stat-unit">/ {roundResults.length} 問</span></span>
          </div>
          {hasTimes && (
            <div className="stat-card">
              <span className="stat-label">合計回答時間</span>
              <span className="stat-value">{formatTimeDisplay(totalElapsedMs)}</span>
            </div>
          )}
        </section>

        {/* 🏆 Googleスプレッドシート世界ランキング送信エリア */}
        <section className="final-ranking-submit-section" aria-label="世界ランキング登録">
          <div className="ranking-submit-card">
            <div className="submit-card-header">
              <span className="ranking-icon" aria-hidden="true">☁️ 🏆</span>
              <div className="submit-card-titles">
                <h3 className="submit-card-title">世界ランキングにスコアを登録</h3>
                <p className="submit-card-subtitle">
                  {isOnline
                    ? 'Googleスプレッドシート連携でリアルタイムに世界ランキングへ反映されます！'
                    : hasApiConfigured
                    ? 'オンライン通信を試行中...'
                    : 'ニックネームを入力してランキングに登録できます（管理画面でGAS URLを設定可能）'}
                </p>
              </div>
              <div className="player-id-cyber-badge" title="あなたのアカウント固有IDです（ブラウザに自動保存）">
                <span className="id-icon">👤</span>
                <span className="id-label">プレイヤーID:</span>
                <strong className="id-code">{playerUniqueId}</strong>
              </div>
            </div>

            <form onSubmit={handleSubmitScore} className="ranking-submit-form">
              <div className="submit-form-row">
                <input
                  type="text"
                  className="player-name-input"
                  placeholder="プレイヤー名（例: カシマの疾風）"
                  value={playerName}
                  maxLength={16}
                  onChange={(e) => setPlayerName(e.target.value)}
                  disabled={isSubmitting || isSubmitted}
                  required
                  aria-label="ランキング登録プレイヤー名"
                />
                <button
                  type="submit"
                  className={`geoguessr-neon-btn ranking-submit-btn ${isSubmitted ? 'submitted' : ''}`}
                  disabled={isSubmitting || isSubmitted || !playerName.trim()}
                >
                  {isSubmitting
                    ? '送信中...'
                    : isSubmitted
                    ? '✓ 登録完了！'
                    : '🚀 ランキングに登録'}
                </button>
              </div>
            </form>

            {submitMessage && (
              <div
                className={`ranking-message-badge ${submitMessage.isError ? 'error' : 'success'}`}
                role="status"
              >
                {submitMessage.text}
              </div>
            )}

            {/* 世界ランキング表示エリア（華麗にヒラメいた！仕様: 各自ベスト3まで掲載＆自分のスコア削除機能） */}
            <div className="final-world-rankings-box">
              <div className="world-rankings-header">
                <div className="rankings-header-left">
                  <h4 className="world-rankings-title">🏆 世界ランキング (最新TOP 20)</h4>
                  <span className="rankings-subtitle-note">
                    ※ 1ユーザーあたりハイスコア上位3件までがランキングに掲載されます
                  </span>
                </div>
                <div className="rankings-header-actions">
                  <span className={`sync-status-indicator ${isOnline ? 'online' : 'local'}`}>
                    {isOnline ? '☁️ リアルタイム同期中' : '📁 ローカルデータ'}
                  </span>
                  <button
                    type="button"
                    className="refresh-rankings-btn"
                    onClick={loadRankings}
                    disabled={isLoadingRankings}
                    title="ランキングを最新化"
                  >
                    {isLoadingRankings ? '更新中...' : '🔄 最新化'}
                  </button>
                </div>
              </div>

              {topRankings.length === 0 ? (
                <div className="no-rankings-placeholder">
                  {isLoadingRankings ? 'ランキングを読み込み中...' : 'まだ登録スコアがありません'}
                </div>
              ) : (
                <div className="rankings-table-wrapper">
                  <table className="final-rankings-table">
                    <thead>
                      <tr>
                        <th>順位</th>
                        <th>プレイヤー名</th>
                        <th>合計スコア</th>
                        <th>平均誤差</th>
                        <th>回答時間</th>
                        <th>日時</th>
                        <th>操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topRankings.map((r, i) => {
                        const rankNum = r.rank || i + 1;
                        const isMyScore = Boolean(
                          r.playerId && r.playerId === playerUniqueId
                        );

                        return (
                          <tr
                            key={r.id || i}
                            className={`ranking-row ${isMyScore ? 'my-score-row' : ''} rank-${rankNum}`}
                          >
                            <td className="rank-cell">
                              {rankNum === 1 ? '🥇 1位' : rankNum === 2 ? '🥈 2位' : rankNum === 3 ? '🥉 3位' : `#${rankNum}`}
                            </td>
                            <td className="player-cell">
                              <span className="player-name-text">{r.playerName}</span>
                              {isMyScore && (
                                <span className="my-score-badge" title="あなたのスコア">
                                  👑 あなた
                                </span>
                              )}
                            </td>
                            <td className="score-cell">
                              <strong>{r.totalScore.toLocaleString()}</strong> 点
                            </td>
                            <td className="distance-cell">
                              {r.totalDistanceKm.toFixed(1)} km
                            </td>
                            <td className="time-cell">
                              {r.avgTimeFormatted || '--'}
                            </td>
                            <td className="date-cell">
                              {r.playedAt ? new Date(r.playedAt).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                            </td>
                            <td className="action-cell">
                              {isMyScore ? (
                                <button
                                  type="button"
                                  className="delete-my-score-btn"
                                  onClick={() => handleDeleteMyScore(r.id, r.totalScore)}
                                  disabled={isDeletingScoreId === r.id}
                                  title="このスコアを世界ランキングから削除する"
                                >
                                  {isDeletingScoreId === r.id ? '削除中...' : '🗑️ 削除'}
                                </button>
                              ) : (
                                <span className="no-action-label">-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* 問題ごとの結果一覧 (折り畳み式カード型) */}
        <section className="results-list-section">
          <div className="results-section-header">
            <h2>問題ごとの結果一覧</h2>
            <button
              type="button"
              className="toggle-all-results-btn"
              onClick={toggleAllExpand}
            >
              {expandedIndices.size === roundResults.length
                ? '▲ すべて折り畳む'
                : '▼ すべて展開'}
            </button>
          </div>

          <div className="results-list">
            {roundResults.map((result, index) => {
              const isExpanded = expandedIndices.has(index);

              return (
                <div
                  key={result.questionId || index}
                  className={`result-item-card geoguessr-result-item ${
                    isExpanded ? 'is-expanded' : 'is-collapsed'
                  }`}
                >
                  {/* カードヘッダー (クリックで折り畳み切り替え) */}
                  <div
                    className="item-summary accordion-trigger"
                    onClick={() => toggleExpand(index)}
                    role="button"
                    tabIndex={0}
                    aria-expanded={isExpanded}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggleExpand(index);
                      }
                    }}
                  >
                    <div className="item-title-group">
                      <span className="item-num">第 {index + 1} 問</span>
                      <h3 className="item-name">{result.stadiumName}</h3>
                    </div>

                    <div className="item-scores">
                      <span className="item-distance">
                        誤差: <strong>{formatDistance(result.distanceKm)}</strong>
                      </span>
                      {typeof result.elapsedMs === 'number' && (
                        <span className="item-time">
                          時間: <strong>{formatTimeDisplay(result.elapsedMs)}</strong>
                        </span>
                      )}
                      <span className="item-score">
                        <strong>{result.score}</strong> 点
                        {result.timeBonus ? (
                          <small className="bonus-sub"> (速答+{result.timeBonus})</small>
                        ) : null}
                      </span>
                      <span className="accordion-chevron" aria-hidden="true">
                        {isExpanded ? '▲' : '▼'}
                      </span>
                    </div>
                  </div>

                  {/* 展開される詳細ボディ */}
                  {isExpanded && (
                    <div className="item-details-body">
                      <div className="item-maps-wrapper">
                        <GoogleMapsLinks
                          userCoordinates={result.userCoordinates}
                          correctCoordinates={result.correctCoordinates}
                          stadiumName={result.stadiumName}
                        />
                      </div>

                      {/* 問題修正報告ボタン */}
                      <div className="item-report-action-row">
                        <button
                          type="button"
                          className="report-problem-btn"
                          onClick={() => setReportingResult(result)}
                          title="この問題の正解座標や名称の誤りを報告・修正提案します"
                        >
                          ⚠️ この問題を報告（座標・名称の修正提案）
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <footer className="final-actions">
          {onNavigateToHistory && (
            <button
              type="button"
              className="secondary-btn history-btn"
              onClick={onNavigateToHistory}
            >
              📜 結果履歴を見る
            </button>
          )}
          <button
            type="button"
            className="geoguessr-neon-btn restart-btn"
            onClick={onRestart}
          >
            🔄 もう一度遊ぶ
          </button>
        </footer>
      </div>

      {/* 問題修正報告モーダル */}
      {reportingResult && (
        <ReportQuestionModal
          isOpen={Boolean(reportingResult)}
          onClose={() => setReportingResult(null)}
          questionId={reportingResult.questionId}
          questionTitle={reportingResult.stadiumName}
          originalName={reportingResult.stadiumName}
          originalCoordinates={reportingResult.correctCoordinates}
          userCoordinates={reportingResult.userCoordinates}
        />
      )}
    </div>
  );
};
