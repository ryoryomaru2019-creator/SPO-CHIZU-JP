import React, { useEffect } from 'react';
import { RoundResult } from '../types/game';
import { formatDistance } from '../utils/distance';
import { formatTimeDisplay } from '../utils/time';
import { GoogleMapsLinks } from './GoogleMapsLinks';

interface ResultPanelProps {
  roundResult: RoundResult;
  roundNumber: number;
  totalRounds: number;
  isLastQuestion: boolean;
  onNext: () => void;
}

export const ResultPanel: React.FC<ResultPanelProps> = ({
  roundResult,
  roundNumber,
  totalRounds,
  isLastQuestion,
  onNext,
}) => {
  const formattedDistance = formatDistance(roundResult.distanceKm);
  const hasTime = typeof roundResult.elapsedMs === 'number';
  const hasBonus = typeof roundResult.timeBonus === 'number';

  // GeoGuessr風のSpace / Enterキーでの「次へ」対応
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        const activeTag = document.activeElement?.tagName.toLowerCase();
        if (activeTag !== 'input' && activeTag !== 'textarea') {
          e.preventDefault();
          onNext();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNext]);

  return (
    <aside className="result-panel geoguessr-result-panel" aria-label="ラウンド結果パネル">
      <div className="panel-header">
        <div className="progress-badge">
          第 {roundNumber} / {totalRounds} 問
        </div>
        <div className="score-badge round-score">
          獲得: <strong>+{roundResult.score.toLocaleString()}</strong> 点
        </div>
      </div>

      <div className="result-content">
        <div className="stadium-badge">
          <span className="badge-sub">正解の会場・場所</span>
          <h2 className="stadium-name">{roundResult.stadiumName}</h2>
        </div>

        {/* GeoGuessr風メインスコアカード */}
        <div className="geoguessr-round-summary-card">
          <div className="summary-col distance-col">
            <span className="summary-val">{formattedDistance}</span>
            <span className="summary-label">正解地点からの誤差</span>
          </div>
          <div className="summary-col score-col">
            <span className="summary-val highlight">{roundResult.score} 点</span>
            <span className="summary-label">獲得ポイント</span>
          </div>
        </div>

        {/* スコア内訳表示（距離＋タイムボーナス） */}
        {hasBonus && roundResult.timeBonus! > 0 && (
          <div className="score-breakdown-card">
            <div className="breakdown-item">
              <span className="breakdown-label">距離ポイント:</span>
              <span className="breakdown-value">{roundResult.distanceScore ?? (roundResult.score - roundResult.timeBonus!)} 点</span>
            </div>
            <span className="breakdown-plus">+</span>
            <div className="breakdown-item highlight-bonus">
              <span className="breakdown-label">⚡ タイムボーナス:</span>
              <span className="breakdown-value">+{roundResult.timeBonus} 点</span>
            </div>
          </div>
        )}

        {hasTime && (
          <div className="round-time-display-row">
            <span>⏱️ 回答タイム: <strong>{formatTimeDisplay(roundResult.elapsedMs!)}</strong></span>
          </div>
        )}

        <div className="coords-detail-box">
          <div className="coords-row">
            <span className="dot user-dot" aria-hidden="true">●</span>
            <span className="dot-label">あなたの回答:</span>
            <span className="dot-coords">
              北緯 {roundResult.userCoordinates.latitude.toFixed(4)}°, 東経 {roundResult.userCoordinates.longitude.toFixed(4)}°
            </span>
          </div>
          <div className="coords-row">
            <span className="dot correct-dot" aria-hidden="true">●</span>
            <span className="dot-label">正解地点:</span>
            <span className="dot-coords">
              北緯 {roundResult.correctCoordinates.latitude.toFixed(4)}°, 東経 {roundResult.correctCoordinates.longitude.toFixed(4)}°
            </span>
          </div>
        </div>

        <GoogleMapsLinks
          userCoordinates={roundResult.userCoordinates}
          correctCoordinates={roundResult.correctCoordinates}
          stadiumName={roundResult.stadiumName}
          questionId={roundResult.questionId}
          questionTitle={roundResult.questionTitle}
        />
      </div>

      {/* GeoGuessrスタイルのネオングリーン「次へ」ボタン */}
      <footer className="result-actions geoguessr-actions">
        <button
          type="button"
          className="geoguessr-neon-btn next-round-btn"
          onClick={onNext}
          autoFocus
          aria-label={isLastQuestion ? '最終結果を見る' : '次の問題へ'}
        >
          {isLastQuestion ? '🏆 最終結果を見る' : '➡️ 次の問題へ'}
        </button>
        <span className="keyboard-hint-sub">続けるには SPACE または Enter を押してください</span>
      </footer>
    </aside>
  );
};
