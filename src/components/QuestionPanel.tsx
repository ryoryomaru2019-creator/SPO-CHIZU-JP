import React, { useState } from 'react';
import { Coordinates, Question, QuestionStage } from '../types/game';
import { getGameRules } from '../storage/gameRulesStorage';

interface QuestionPanelProps {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
  totalScore: number;
  selectedCoordinates: Coordinates | null;
  isConfirmed?: boolean;
  onSubmitAnswer: () => void;
  questionStage?: QuestionStage;
  elapsedMs?: number;
  countdownValue?: number | string;
  onStartQuestion?: () => void;
  onRestartGame?: () => void;
}

export const QuestionPanel: React.FC<QuestionPanelProps> = ({
  question,
  questionNumber,
  totalQuestions,
  totalScore,
  selectedCoordinates,
  isConfirmed = true,
  onSubmitAnswer,
  questionStage = 'answering',
  countdownValue = 3,
  onStartQuestion,
  onRestartGame,
}) => {
  const [showHint, setShowHint] = useState<boolean>(false);

  const hasConfirmedPin = selectedCoordinates !== null && isConfirmed;
  const isAnswering = questionStage === 'answering';

  return (
    <aside className="question-panel" aria-label="問題情報パネル">
      <div className="panel-header">
        <div className="progress-badge" aria-label={`問題 ${questionNumber} / ${totalQuestions}`}>
          問題 {questionNumber} / {totalQuestions}
        </div>
        <div className="score-badge" aria-label={`現在の合計スコア: ${totalScore}点`}>
          合計スコア: <strong>{totalScore}</strong> 点
        </div>
      </div>

      {/* 1. スタート待ち（出題前）: 問題内容・地図を隠しスタートを促す */}
      {questionStage === 'standby' && (
        <div className="question-standby-wrapper">
          <div className="standby-card">
            <div className="standby-icon" aria-hidden="true">🏟️</div>
            <h2 className="standby-title">第 {questionNumber} 問</h2>
            <p className="standby-desc">
              「問題スタート！」を押すと問題文が出題され、地図が開いて計測が始まります。
            </p>
            <div className="standby-rule-tip">
              💡 速く正確に答えるほど高得点！（最大+1,000点ボーナス）
            </div>
            <button
              type="button"
              className="primary-btn start-question-btn"
              onClick={onStartQuestion}
              autoFocus
              aria-label="問題スタート！カウントダウンを開始します"
            >
              🚀 問題スタート！
            </button>
          </div>
        </div>
      )}

      {/* 2. カウントダウン中 */}
      {questionStage === 'countdown' && (
        <div className="question-countdown-wrapper">
          <div className="question-countdown-box" role="alert" aria-live="assertive">
            <div className="countdown-subtitle">第 {questionNumber} 問</div>
            <div className={`countdown-display count-${countdownValue === 'GO!' ? 'go' : countdownValue}`}>
              {countdownValue}
            </div>
            <p className="countdown-subtext">まもなく問題が出題されます！</p>
          </div>
        </div>
      )}

      {/* 3. タイムアップ・ゲームオーバー */}
      {questionStage === 'gameover' && (
        <div className="question-gameover-box" role="alert">
          <div className="gameover-title">⏰ タイムアップ！</div>
          <p className="gameover-desc">
            制限時間（99分99秒99）を超過したため、ゲームオーバーとなりました。
          </p>
          <button
            type="button"
            className="primary-btn restart-game-btn"
            onClick={onRestartGame}
          >
            🔄 最初からやり直す
          </button>
        </div>
      )}

      {/* 4. 出題・回答中: 問題と回答ボタンを表示（経過時間は地図下部に配置） */}
      {isAnswering && (
        <>
          <div className="question-content">
            <div className="question-meta-tags">
              {question.difficulty && (
                <span className={`difficulty-badge ${question.difficulty}`}>
                  {question.difficulty === 'easy' ? '初級' : question.difficulty === 'medium' ? '中級' : question.difficulty === 'hard' ? '上級' : '激ムズ'}
                </span>
              )}
              {question.tags && question.tags.length > 0 && (
                <div className="tags-list">
                  {question.tags.map((tag) => (
                    <span key={tag} className="tag-pill">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <h2 className="question-title">{question.title}</h2>
            <p className="question-text">{question.question}</p>

            <div className="hint-container">
              {getGameRules().allowHints ? (
                <>
                  <button
                    type="button"
                    className="hint-toggle-btn"
                    onClick={() => setShowHint((prev) => !prev)}
                    aria-expanded={showHint}
                    aria-controls="question-hint"
                  >
                    💡 {showHint ? 'ヒントを隠す' : 'ヒントを見る'}
                  </button>
                  {showHint && (
                    <div id="question-hint" className="hint-body" role="region">
                      {question.hint}
                    </div>
                  )}
                </>
              ) : (
                <div className="hint-disabled-notice" title="管理画面のルール設定でヒントが禁止されています">
                  🚫 No Hints（ヒント禁止モード中）
                </div>
              )}
            </div>
          </div>

          <div className="selection-status-box">
            <div className="coords-info">
              <span className="coords-label">📍 指定中の回答座標:</span>
              {hasConfirmedPin ? (
                <span className="coords-value">
                  北緯 {selectedCoordinates.latitude.toFixed(4)}°, 東経 {selectedCoordinates.longitude.toFixed(4)}°
                </span>
              ) : (
                <span className="coords-empty">
                  地図上をタップするか、「ここに決定」を押してピンを確定してください
                </span>
              )}
            </div>

            <button
              type="button"
              className="primary-btn submit-btn"
              disabled={!hasConfirmedPin}
              onClick={onSubmitAnswer}
              aria-label={hasConfirmedPin ? '回答を確定する' : 'ピンを決定すると回答を確定できます'}
            >
              ⚽ 回答を確定する
            </button>
          </div>
        </>
      )}
    </aside>
  );
};
