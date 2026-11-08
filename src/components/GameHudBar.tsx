import React from 'react';
import { MapDisplaySettings, PinMode, RoundResult } from '../types/game';
import { TopPlayersPanel } from './TopPlayersPanel';
import { RoundScoreBar } from './RoundScoreBar';

interface GameHudBarProps {
  currentRound: number;
  totalQuestions: number;
  results: RoundResult[];
  totalScore: number;
  elapsedMs: number;
  mapSettings: MapDisplaySettings;
  onChangeMapSettings: (settings: Partial<MapDisplaySettings>) => void;
  isResultScreen?: boolean;
  isOpen?: boolean;
  onToggleOpen?: () => void;
}

export const GameHudBar: React.FC<GameHudBarProps> = ({
  currentRound,
  totalQuestions,
  results,
  totalScore,
  elapsedMs,
  mapSettings,
  onChangeMapSettings,
  isResultScreen = false,
  isOpen = true,
  onToggleOpen,
}) => {
  const handleSelectPinMode = (mode: PinMode) => {
    onChangeMapSettings({ pinMode: mode });
  };

  const handleToggleTarget = () => {
    onChangeMapSettings({ targetEnabled: !mapSettings.targetEnabled });
  };

  const handleToggleLanguage = () => {
    const nextLang = mapSettings.mapLanguage === 'ja' ? 'local' : 'ja';
    onChangeMapSettings({ mapLanguage: nextLang });
  };

  const handleToggleDim = () => {
    onChangeMapSettings({ dimEnabled: !mapSettings.dimEnabled });
  };

  if (!isOpen) {
    return (
      <div className="game-hud-collapsed-bar" role="toolbar" aria-label="ゲームHUD折りたたみ中">
        <button
          type="button"
          className="hud-reopen-pill-btn neo-chamfer-btn"
          onClick={onToggleOpen}
          title="HUDバー（ランキング・操作・スコア）を展開する"
          aria-label="HUDバーを展開する"
        >
          <span className="btn-icon" aria-hidden="true">▼</span>
          <span className="hud-pill-label">HUDバー展開</span>
          <span className="hud-mini-score">PTS: {totalScore.toLocaleString()}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="game-hud-bar" role="toolbar" aria-label="ゲーム状況および地図操作バー">
      {/* 1. 左側: トッププレイヤー ランキング（ドロップダウン式） */}
      <div className="hud-section hud-left-section">
        <TopPlayersPanel initialOpen={false} currentRound={currentRound} />
      </div>

      {/* 2. 中央: 地図操作コントロール（絶対配置ではなくフロー配置） */}
      <div className="hud-section hud-center-section">
        {!isResultScreen ? (
          <div className="map-controls-inline-group">
            {/* ピン決定方式タブ */}
            <div className="pin-mode-chips-wrapper" role="radiogroup" aria-label="ピン決定方式">
              <button
                type="button"
                role="radio"
                aria-checked={mapSettings.pinMode === 'single'}
                className={`hud-chip-btn ${mapSettings.pinMode === 'single' ? 'active' : ''}`}
                onClick={() => handleSelectPinMode('single')}
                title="ワンタップ（ワンクリック）でピンを決定"
              >
                <span className="chip-icon" aria-hidden="true">👆</span>
                <span className="chip-text">タップ</span>
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={mapSettings.pinMode === 'crosshair'}
                className={`hud-chip-btn ${mapSettings.pinMode === 'crosshair' ? 'active' : ''}`}
                onClick={() => handleSelectPinMode('crosshair')}
                title="十字ターゲットを合わせて「ここに決定」でピンを決定"
              >
                <span className="chip-icon" aria-hidden="true">🎯</span>
                <span className="chip-text">十字</span>
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={mapSettings.pinMode === 'double'}
                className={`hud-chip-btn ${mapSettings.pinMode === 'double' ? 'active' : ''}`}
                onClick={() => handleSelectPinMode('double')}
                title="ダブルタップ（ダブルクリック）でピンを決定"
              >
                <span className="chip-icon" aria-hidden="true">✌️</span>
                <span className="chip-text">ダブル</span>
              </button>
            </div>

            {/* 十字ターゲットON/OFF */}
            <button
              type="button"
              className={`hud-chip-btn toggle-chip-btn ${mapSettings.targetEnabled ? 'active' : ''}`}
              onClick={handleToggleTarget}
              aria-pressed={mapSettings.targetEnabled}
              title={mapSettings.targetEnabled ? '十字ターゲットを非表示にする' : '十字ターゲットを表示する'}
            >
              <span className="chip-icon" aria-hidden="true">🎯</span>
              <span className="chip-text">ターゲット: {mapSettings.targetEnabled ? 'ON' : 'OFF'}</span>
            </button>

            {/* 言語切り替え */}
            <button
              type="button"
              className="hud-chip-btn language-chip-btn"
              onClick={handleToggleLanguage}
              title="地名の表示言語を切り替える（日本語 ↔ 現地語）"
              aria-label={`地図表記言語: ${mapSettings.mapLanguage === 'ja' ? '日本語' : '現地語'}`}
            >
              <span className="chip-icon" aria-hidden="true">🌐</span>
              <span className="chip-text">{mapSettings.mapLanguage === 'ja' ? '表示中: 日本語' : '表示中: 現地語'}</span>
            </button>
          </div>
        ) : (
          <div className="map-controls-inline-group result-controls-group">
            {/* 結果画面: 暗転トグル */}
            <button
              type="button"
              className={`hud-chip-btn toggle-chip-btn ${mapSettings.dimEnabled ? 'active' : ''}`}
              onClick={handleToggleDim}
              title={mapSettings.dimEnabled ? '背景の暗転効果を解除する' : '背景を暗転してピンを目立たせる'}
            >
              <span className="chip-icon" aria-hidden="true">💡</span>
              <span className="chip-text">スポットライト: {mapSettings.dimEnabled ? 'ON' : 'OFF'}</span>
            </button>

            {/* 結果画面: 言語切り替え */}
            <button
              type="button"
              className="hud-chip-btn language-chip-btn"
              onClick={handleToggleLanguage}
              title="地図の表示言語を切り替える"
            >
              <span className="chip-icon" aria-hidden="true">🌐</span>
              <span className="chip-text">{mapSettings.mapLanguage === 'ja' ? '日本語' : '現地語'}</span>
            </button>
          </div>
        )}
      </div>

      {/* 3. 右側: ラウンドスコアバー & 折りたたみボタン */}
      <div className="hud-section hud-right-section">
        <RoundScoreBar
          currentIndex={currentRound - 1}
          totalQuestions={totalQuestions}
          results={results}
          currentTotalScore={totalScore}
          currentElapsedMs={elapsedMs}
        />
        {onToggleOpen && (
          <button
            type="button"
            className="hud-collapse-toggle-btn neo-chamfer-btn"
            onClick={onToggleOpen}
            title="HUDバーを隠して地図を広げる"
            aria-label="HUDバーを折りたたむ"
          >
            <span className="btn-icon" aria-hidden="true">▲</span>
            <span className="hud-toggle-text">隠す</span>
          </button>
        )}
      </div>
    </div>
  );
};

