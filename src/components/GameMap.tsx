import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Coordinates, PinMode, MapLanguage, QuestionStage, MapDisplaySettings } from '../types/game';
import { MapProvider } from '../maps/MapProvider';
import { LeafletMapProvider } from '../maps/LeafletMapProvider';
import { MapTarget } from './MapTarget';
import { ConfirmTargetButton } from './ConfirmTargetButton';
import { ResultMapControls } from './ResultMapControls';
import { formatTime } from '../utils/time';
import { calculateTimeBonus } from '../utils/score';
import {
  getMapDisplaySettings,
  saveMapDisplaySettings,
} from '../storage/settingsStorage';
import { getGameRules } from '../storage/gameRulesStorage';

interface GameMapProps {
  userCoordinates: Coordinates | null;
  correctCoordinates?: Coordinates | null;
  correctLabel?: string;
  showLine?: boolean;
  interactive?: boolean;
  isConfirmed?: boolean;
  onConfirmPin?: (coords: Coordinates) => void;
  onMapClick?: (coords: Coordinates) => void;
  fitBothMarkers?: boolean;
  elapsedMs?: number;
  questionStage?: QuestionStage;
  mapSettings?: MapDisplaySettings;
  showInlineControls?: boolean;
}

export const GameMap: React.FC<GameMapProps> = ({
  userCoordinates,
  correctCoordinates = null,
  correctLabel = '',
  showLine = false,
  interactive = true,
  isConfirmed: _isConfirmed = false,
  onConfirmPin,
  onMapClick,
  fitBothMarkers = false,
  elapsedMs = 0,
  questionStage = 'answering',
  mapSettings: externalMapSettings,
  showInlineControls = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapProviderRef = useRef<MapProvider | null>(null);
  const [initError, setInitError] = useState<string | null>(null);

  // 地図表示設定（外部指定優先、なければlocalStorage連携）
  const [internalSettings, setMapSettings] = useState(() => getMapDisplaySettings());
  const mapSettings = externalMapSettings || internalSettings;
  const mapSettingsRef = useRef(mapSettings);
  useEffect(() => {
    mapSettingsRef.current = mapSettings;
    // 言語設定が外部から変わった場合、即座にマッププロバイダーへ適用
    if (mapProviderRef.current && mapSettings.mapLanguage) {
      mapProviderRef.current.setLanguage(mapSettings.mapLanguage);
    }
  }, [mapSettings]);

  // 画面上のピクセル位置（中央基準）
  const targetPixelPos = null;
  const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({
    width: 800,
    height: 600,
  });

  // 「ここに決定」ボタンの表示状態
  const [showDecideButton, setShowDecideButton] = useState<boolean>(false);
  const [justDecided, setJustDecided] = useState<boolean>(false);

  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // コールバックのRef保持（再生成による地図ズームリセットを完全に抑止）
  const onConfirmPinRef = useRef(onConfirmPin);
  useEffect(() => {
    onConfirmPinRef.current = onConfirmPin;
  }, [onConfirmPin]);

  const onMapClickRef = useRef(onMapClick);
  useEffect(() => {
    onMapClickRef.current = onMapClick;
  }, [onMapClick]);

  // コンテナサイズ更新
  const updateContainerSize = useCallback(() => {
    if (containerRef.current) {
      setContainerSize({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
      });
    }
  }, []);

  // アイドルタイマー（1秒間操作がなければ「ここに決定」を表示）
  const startIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }
    idleTimerRef.current = setTimeout(() => {
      setShowDecideButton(true);
    }, 1000);
  }, []);

  // 操作中（移動中・ズーム中）はボタンを隠しタイマー再起動
  const handleMapMoveStart = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
    setShowDecideButton(false);
  }, []);

  const handleMapMoveEnd = useCallback(() => {
    // 十字ターゲットモードまたはターゲット表示中なら、移動停止1秒後に「ここに決定」ボタンを表示
    if (mapSettings.pinMode === 'crosshair' || mapSettings.targetEnabled) {
      startIdleTimer();
    }
  }, [mapSettings.pinMode, mapSettings.targetEnabled, startIdleTimer]);

  // ピン決定モード切り替え
  const handleSelectPinMode = (mode: PinMode) => {
    const isCrosshair = mode === 'crosshair';
    const updated = saveMapDisplaySettings({
      pinMode: mode,
      targetEnabled: isCrosshair,
    });
    setMapSettings(updated);

    if (mapProviderRef.current) {
      mapProviderRef.current.setPinMode(mode);
    }

    if (isCrosshair) {
      startIdleTimer();
    } else {
      setShowDecideButton(false);
    }
  };

  // ターゲット表示ON/OFF切り替え（個別ボタン用）
  const handleToggleTarget = () => {
    const nextState = !mapSettings.targetEnabled;
    const updated = saveMapDisplaySettings({
      targetEnabled: nextState,
      pinMode: nextState ? 'crosshair' : 'single',
    });
    setMapSettings(updated);
    if (!nextState) {
      setShowDecideButton(false);
    } else {
      startIdleTimer();
    }
  };

  // 地図言語（日本語 / 現地語）切り替え
  const handleToggleLanguage = () => {
    const nextLang: MapLanguage = mapSettings.mapLanguage === 'ja' ? 'local' : 'ja';
    const updated = saveMapDisplaySettings({ mapLanguage: nextLang });
    setMapSettings(updated);
    if (mapProviderRef.current) {
      mapProviderRef.current.setLanguage(nextLang);
    }
  };

  // 暗転ON/OFF切り替え
  const handleToggleDim = () => {
    const nextState = !mapSettings.dimEnabled;
    const updated = saveMapDisplaySettings({ dimEnabled: nextState });
    setMapSettings(updated);
  };

  // 「ここに決定」ボタン押下によるピン確定（十字ターゲットの現在位置＝地図中心を常に使用）
  const handleConfirmCurrentTarget = useCallback(() => {
    const provider = mapProviderRef.current;
    if (!provider) return;

    // バグ修正: 以前のタップ座標ではなく、現在の十字照準（地図中央）の最新座標を取得して確定
    const centerCoords = provider.getCenter();
    if (centerCoords) {
      if (onConfirmPinRef.current) {
        onConfirmPinRef.current(centerCoords);
      } else if (onMapClickRef.current) {
        onMapClickRef.current(centerCoords);
      }
      setJustDecided(true);
      setTimeout(() => setJustDecided(false), 800);
    }
  }, []);

  // クリック / タップ時の処理
  const handleMapClickInternal = useCallback((coords: Coordinates) => {
    const currentMode = mapSettingsRef.current.pinMode;

    if (currentMode === 'single') {
      // シングルタップモード: タップした位置に即座にピンを確定！
      onMapClickRef.current?.(coords);
      onConfirmPinRef.current?.(coords);
      setJustDecided(true);
      setTimeout(() => setJustDecided(false), 800);
    } else if (currentMode === 'crosshair') {
      // 十字ターゲットモード: タップしても即確定はせず、通知のみ行い、停止1秒後に決定ボタン表示
      onMapClickRef.current?.(coords);
      setShowDecideButton(false);
      startIdleTimer();
    } else if (currentMode === 'double') {
      // ダブルタップモード: シングルクリックでは確定せず、仮位置のプレビューのみ
      onMapClickRef.current?.(coords);
    }
  }, [startIdleTimer]);

  // ダブルクリック / ダブルタップ時の処理
  const handleMapDoubleClickInternal = useCallback((coords: Coordinates) => {
    const currentMode = mapSettingsRef.current.pinMode;

    if (currentMode === 'double' || currentMode === 'single') {
      // ダブルクリックで即時確定
      if (onConfirmPinRef.current) {
        onConfirmPinRef.current(coords);
      } else if (onMapClickRef.current) {
        onMapClickRef.current(coords);
      }
      setJustDecided(true);
      setTimeout(() => setJustDecided(false), 800);
    }
  }, []);

  // 地図の初期化
  useEffect(() => {
    if (!containerRef.current) return;

    try {
      updateContainerSize();

      const provider = new LeafletMapProvider();
      const gameRules = getGameRules();
      provider.init({
        container: containerRef.current,
        interactive,
        pinMode: mapSettings.pinMode,
        language: mapSettings.mapLanguage,
        allowPan: gameRules.allowPan,
        allowZoom: gameRules.allowZoom,
        onClick: (coords) => {
          if (interactive) {
            handleMapClickInternal(coords);
          }
        },
        onDoubleClick: (coords) => {
          if (interactive) {
            handleMapDoubleClickInternal(coords);
          }
        },
        onMoveStart: handleMapMoveStart,
        onMoveEnd: handleMapMoveEnd,
      });

      mapProviderRef.current = provider;

      // 初期言語の適用
      if (mapSettings.mapLanguage) {
        provider.setLanguage(mapSettings.mapLanguage);
      }

      if (interactive && (mapSettings.pinMode === 'crosshair' || mapSettings.targetEnabled)) {
        startIdleTimer();
      }

      // レンダリング遅延・CSS確定後のマップ描画保証（黒画面バグ防止）
      requestAnimationFrame(() => {
        provider.invalidateSize();
        updateContainerSize();
      });
      const tInit1 = setTimeout(() => {
        provider.invalidateSize();
        updateContainerSize();
      }, 60);
      const tInit2 = setTimeout(() => {
        provider.invalidateSize();
        updateContainerSize();
      }, 200);
      const tInit3 = setTimeout(() => {
        provider.invalidateSize();
        updateContainerSize();
      }, 500);

      const handleResize = () => {
        provider.invalidateSize();
        updateContainerSize();
      };
      window.addEventListener('resize', handleResize);

      // ResizeObserver による確実なコンテナサイズ追従
      let resizeObserver: ResizeObserver | null = null;
      if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
        resizeObserver = new ResizeObserver(() => {
          provider.invalidateSize();
          updateContainerSize();
        });
        resizeObserver.observe(containerRef.current);
      }

      return () => {
        clearTimeout(tInit1);
        clearTimeout(tInit2);
        clearTimeout(tInit3);
        if (resizeObserver) {
          resizeObserver.disconnect();
        }
        if (idleTimerRef.current) {
          clearTimeout(idleTimerRef.current);
        }
        window.removeEventListener('resize', handleResize);
        provider.destroy();
        mapProviderRef.current = null;
      };
    } catch (err) {
      console.error('地図の初期化に失敗しました:', err);
      setInitError('地図の読み込みに失敗しました。ページを再読み込みしてください。');
    }
  }, [interactive]); // interactive変更時のみ再初期化

  // questionStage変更時（出題スタート時など）に即座に地図サイズを再計算してフルスクリーン描画
  useEffect(() => {
    const provider = mapProviderRef.current;
    if (provider) {
      provider.invalidateSize();
      updateContainerSize();
      const t = setTimeout(() => {
        provider.invalidateSize();
        updateContainerSize();
      }, 80);
      return () => clearTimeout(t);
    }
  }, [questionStage, updateContainerSize]);

  // マーカー・ライン・視点更新
  useEffect(() => {
    const provider = mapProviderRef.current;
    if (!provider) return;

    // 回答ピン更新
    provider.setUserMarker(userCoordinates);

    // 正解ピン更新
    provider.setCorrectMarker(correctCoordinates, correctLabel);

    // 直線更新
    if (showLine && userCoordinates && correctCoordinates) {
      provider.setLine(userCoordinates, correctCoordinates);
    } else {
      provider.setLine(null, null);
    }

    // 両マーカーに合わせた表示範囲調整
    if (fitBothMarkers && userCoordinates && correctCoordinates) {
      provider.fitBounds([userCoordinates, correctCoordinates]);
    }
  }, [userCoordinates, correctCoordinates, correctLabel, showLine, fitBothMarkers]);

  // 結果画面での暗さ・スポットライト光の制御
  const isResultScreen = !interactive && fitBothMarkers && Boolean(correctCoordinates);
  useEffect(() => {
    const provider = mapProviderRef.current;
    if (!provider) return;

    if (isResultScreen) {
      provider.setDimmed(mapSettings.dimEnabled);
      if (mapSettings.dimEnabled) {
        provider.setSpotlights(userCoordinates, correctCoordinates);
      } else {
        provider.setSpotlights(null, null);
      }
    } else {
      provider.setDimmed(false);
      provider.setSpotlights(null, null);
    }
  }, [isResultScreen, mapSettings.dimEnabled, userCoordinates, correctCoordinates]);

  // 十字ターゲットを表示すべきか（回答中のみ表示し、待機中・カウントダウン中は非表示）
  const isTargetVisible =
    interactive &&
    questionStage === 'answering' &&
    (mapSettings.pinMode === 'crosshair' || mapSettings.targetEnabled);

  return (
    <div
      className="game-map-wrapper"
      style={{
        flex: '1 1 0%',
        width: '100%',
        height: '100%',
        minHeight: '100%',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* 操作・設定フローティングツールバー（HUDバー利用時は非表示にして完全重なり防止） */}
      {showInlineControls && (
        <div className="map-floating-controls" role="toolbar" aria-label="地図の操作設定">
          {interactive && (
            <>
              {/* ピン決定方式セレクター */}
              <div className="pin-mode-selector-group" role="radiogroup" aria-label="ピン決定の操作方法">
                <button
                  type="button"
                  role="radio"
                  aria-checked={mapSettings.pinMode === 'single'}
                  className={`pin-mode-tab-btn ${mapSettings.pinMode === 'single' ? 'active' : ''}`}
                  onClick={() => handleSelectPinMode('single')}
                  title="ワンタップ（ワンクリック）でピンを決定"
                >
                  👆 タップ
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={mapSettings.pinMode === 'crosshair'}
                  className={`pin-mode-tab-btn ${mapSettings.pinMode === 'crosshair' ? 'active' : ''}`}
                  onClick={() => handleSelectPinMode('crosshair')}
                  title="十字ターゲットを合わせて「ここに決定」でピンを決定"
                >
                  🎯 十字
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={mapSettings.pinMode === 'double'}
                  className={`pin-mode-tab-btn ${mapSettings.pinMode === 'double' ? 'active' : ''}`}
                  onClick={() => handleSelectPinMode('double')}
                  title="ダブルタップ（ダブルクリック）でピンを決定"
                >
                  ✌️ ダブル
                </button>
              </div>

              {/* 十字ターゲット表示ON/OFFトグルボタン */}
              <button
                type="button"
                className={`map-floating-btn target-toggle-btn ${mapSettings.targetEnabled ? 'active' : ''}`}
                onClick={handleToggleTarget}
                aria-pressed={mapSettings.targetEnabled}
                title={mapSettings.targetEnabled ? '十字ターゲットを非表示にする' : '十字ターゲットを表示する'}
              >
                {mapSettings.targetEnabled ? '🎯 ターゲット: ON' : '🎯 ターゲット: OFF'}
              </button>

              {/* 海外地図用 日本語 / 現地語 切り替えボタン */}
              <button
                type="button"
                className="map-floating-btn language-toggle-btn"
                onClick={handleToggleLanguage}
                title={
                  mapSettings.mapLanguage === 'ja'
                    ? '現在：日本語表記。クリックで現地語表記に切り替え'
                    : '現在：現地語表記。クリックで日本語表記に切り替え'
                }
                aria-label={`地図表記言語: 表示中：${mapSettings.mapLanguage === 'ja' ? '日本語' : '現地語'}`}
              >
                🌐 表示中：{mapSettings.mapLanguage === 'ja' ? '日本語' : '現地語'}
              </button>
            </>
          )}

          {isResultScreen && (
            <>
              <ResultMapControls
                dimEnabled={mapSettings.dimEnabled}
                onToggleDim={handleToggleDim}
              />
              {/* 結果画面でも言語切り替え可能 */}
              <button
                type="button"
                className="map-floating-btn language-toggle-btn"
                onClick={handleToggleLanguage}
                title="地図の表示言語を切り替える"
              >
                🌐 表示中：{mapSettings.mapLanguage === 'ja' ? '日本語' : '現地語'}
              </button>
            </>
          )}
        </div>
      )}

      {initError ? (
        <div className="map-error-notice" role="alert">
          <p>{initError}</p>
        </div>
      ) : (
        <div
          ref={containerRef}
          className="map-container"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100%',
            height: '100%',
          }}
          tabIndex={0}
          role="region"
          aria-label="日本・世界地図。タップ、十字ターゲットの「ここに決定」、またはダブルタップでピンを決定できます。"
        />
      )}

      {/* 結果画面の暗転半透明オーバーレイ */}
      {isResultScreen && mapSettings.dimEnabled && (
        <div
          className="result-map-dim-overlay"
          aria-hidden="true"
          data-testid="dim-overlay"
        />
      )}

      {/* 回答モード中: 十字ターゲット表示（crosshairモード時のみ） */}
      {isTargetVisible && (
        <>
          <MapTarget
            visible={true}
            pixelPosition={targetPixelPos}
            onHover={() => setShowDecideButton(true)}
          />

          <ConfirmTargetButton
            visible={showDecideButton}
            pixelPosition={targetPixelPos}
            containerSize={containerSize}
            justDecided={justDecided}
            onConfirm={handleConfirmCurrentTarget}
          />
        </>
      )}

      {/* 出題前・カウントダウン中の地図プレビュー防止カーテン */}
      {interactive && (questionStage === 'standby' || questionStage === 'countdown') && (
        <div className="map-standby-curtain" role="presentation" aria-hidden="true">
          <div className="curtain-content">
            <span className="curtain-lock-icon">🔒</span>
            {questionStage === 'standby' ? (
              <div className="typewriter-ready-container">
                <span className="typewriter-ready-text">Ready....</span>
              </div>
            ) : (
              <span className="curtain-lock-title neon-pulse">SYSTEM INITIALIZING...</span>
            )}
            <span className="curtain-lock-text">
              {questionStage === 'standby'
                ? '左パネルの「問題スタート！」を押すと計測とスキャンが開始されます'
                : 'まもなく出題されます...'}
            </span>
          </div>
        </div>
      )}

      {/* 回答中の経過時間表示（地図下部に小さく固定幅・等幅フォントで設置しコンテナ揺れ防止） */}
      {interactive && questionStage === 'answering' && (
        <div className="map-bottom-timer-bar" role="timer" aria-label={`経過時間: ${formatTime(elapsedMs)}`}>
          <div className="map-timer-pill">
            <span className="timer-icon" aria-hidden="true">⏱️</span>
            <span className="timer-text">{formatTime(elapsedMs)}</span>
            <div className="timer-bonus-tag">
              <span className="bonus-points">+{calculateTimeBonus(elapsedMs)}点</span>
              <span className="bonus-sub-label">BONUS</span>
            </div>
          </div>
        </div>
      )}

      <div className="map-accessibility-info sr-only">
        操作方法: 地図上部の切り替えボタンで「タップ」「十字」「ダブル」の3種類のピン決定操作が可能です。言語ボタンで日本語と現地語の切り替えも可能です。
      </div>
    </div>
  );
};
