import React from 'react';
import { RoundResult } from '../types/game';

interface RoundScoreBarProps {
  currentIndex: number;
  totalQuestions: number;
  results: RoundResult[];
  currentTotalScore: number;
  currentElapsedMs?: number;
}

function formatShortTime(ms?: number): string {
  if (!ms || ms <= 0) return '--:--';
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

export const RoundScoreBar: React.FC<RoundScoreBarProps> = ({
  currentIndex,
  totalQuestions,
  results,
  currentTotalScore,
}) => {
  // 表示するラウンド数（最大5問または全問）
  const displayCount = Math.min(totalQuestions, 5);
  const rounds = Array.from({ length: displayCount }, (_, i) => i);

  // 全ラウンドの合計経過時間
  const totalElapsedMs = results.reduce((sum, r) => sum + (r.elapsedMs || 0), 0);

  return (
    <div className="geoguessr-round-bar" aria-label="ラウンドスコア状況">
      <div className="round-cells-container">
        {rounds.map((roundIdx) => {
          const isDone = roundIdx < results.length;
          const isCurrent = roundIdx === currentIndex;
          const res = results[roundIdx];

          return (
            <div
              key={roundIdx}
              className={`round-cell ${isCurrent ? 'current' : ''} ${isDone ? 'completed' : ''}`}
            >
              <span className="round-label">R{roundIdx + 1}</span>
              <span className="round-score">
                {isDone && res ? res.score.toLocaleString() : isCurrent ? '…' : '-'}
              </span>
              <span className="round-time">
                {isDone && res ? formatShortTime(res.elapsedMs) : '--:--'}
              </span>
            </div>
          );
        })}

        {/* Totalセル */}
        <div className="round-cell total-cell">
          <span className="round-label">Total</span>
          <span className="round-score total-score">
            {currentTotalScore.toLocaleString()}
          </span>
          <span className="round-time total-time">
            {formatShortTime(totalElapsedMs)}
          </span>
        </div>
      </div>
    </div>
  );
};
