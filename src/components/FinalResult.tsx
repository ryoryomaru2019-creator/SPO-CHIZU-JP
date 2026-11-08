import React, { useState, useEffect } from 'react';
import { RoundResult } from '../types/game';
import { formatDistance } from '../utils/distance';
import { formatTimeDisplay } from '../utils/time';
import { GoogleMapsLinks } from './GoogleMapsLinks';
import {
  submitScore,
  getLastPlayerName,
  fetchRankings,
  RankingEntry,
  getRankingApiUrl,
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
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitMessage, setSubmitMessage] = useState<{ text: string; isError?: boolean } | null>(null);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [topRankings, setTopRankings] = useState<RankingEntry[]>([]);
  const [isOnline, setIsOnline] = useState<boolean>(false);

  const hasApiConfigured = Boolean(getRankingApiUrl());

  useEffect(() => {
    fetchRankings(5).then((res) => {
      setTopRankings(res.rankings);
      setIsOnline(res.isOnline);
    });
  }, []);

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
        mode: 'standard',
        categoryName: 'Jリーグ会場',
      });

      if (res.success) {
        setIsSubmitted(true);
        setSubmitMessage({ text: res.message });
        // 最新ランキングを再取得
        const updated = await fetchRankings(5);
        setTopRankings(updated.rankings);
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
              <div>
                <h3 className="submit-card-title">世界ランキングにスコアを登録</h3>
                <p className="submit-card-subtitle">
                  {isOnline
                    ? 'Googleスプレッドシート連携でリアルタイムに世界ランキングへ反映されます！'
                    : hasApiConfigured
                    ? 'オンライン通信を試行中...'
                    : 'ニックネームを入力してランキングに登録できます（管理画面でGAS URLを設定可能）'}
                </p>
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

            {/* トッププレイヤー簡易プレビュー */}
            {topRankings.length > 0 && (
              <div className="top-rankings-preview">
                <span className="preview-title">👑 現在のトップスコア:</span>
                <div className="preview-badges">
                  {topRankings.slice(0, 3).map((r, i) => (
                    <span key={r.id || i} className="preview-chip">
                      #{r.rank || i + 1} {r.playerName} (<strong>{r.totalScore.toLocaleString()}</strong>点)
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* 問題ごとの結果一覧 */}
        <section className="results-list-section">
          <h2>問題ごとの結果一覧</h2>
          <div className="results-list">
            {roundResults.map((result, index) => (
              <div key={result.questionId} className="result-item-card geoguessr-result-item">
                <div className="item-summary">
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
                  </div>
                </div>

                <div className="item-maps-wrapper">
                  <GoogleMapsLinks
                    userCoordinates={result.userCoordinates}
                    correctCoordinates={result.correctCoordinates}
                    stadiumName={result.stadiumName}
                  />
                </div>
              </div>
            ))}
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
    </div>
  );
};
