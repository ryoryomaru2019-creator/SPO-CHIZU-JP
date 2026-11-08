import React, { useState, useEffect, useCallback, useRef } from 'react';
import categoriesData from './data/categories.json';
import {
  Coordinates,
  GameMode,
  GameScreen,
  Question,
  RoundResult,
  GameHistory,
  QuestionStage,
  MapDisplaySettings,
} from './types/game';
import { calculateDistanceKm } from './utils/distance';
import { calculateScoreBreakdown } from './utils/score';
import { MAX_GAME_TIME_MS } from './utils/time';
import { isValidCoordinates } from './utils/coordinates';
import { selectRandomQuestions } from './utils/questionSelection';
import { getStoredQuestions } from './storage/questionStorage';
import { saveHistory } from './storage/historyStorage';
import {
  getMapDisplaySettings,
  saveMapDisplaySettings,
} from './storage/settingsStorage';
import { generateId } from './utils/id';

import { StartScreen } from './components/StartScreen';
import { QuestionPanel } from './components/QuestionPanel';
import { GameMap } from './components/GameMap';
import { ResultPanel } from './components/ResultPanel';
import { FinalResult } from './components/FinalResult';
import { HistoryPage } from './components/HistoryPage';
import { AdminQuestionsPage } from './admin/AdminQuestionsPage';
import { ConfirmModal } from './components/ConfirmModal';
import { GameHudBar } from './components/GameHudBar';

const STORAGE_KEY = 'sakachizu_game_state_v2';

export type AppView = 'game' | 'admin' | 'history';

function detectInitialView(): AppView {
  if (typeof window === 'undefined') return 'game';
  const path = window.location.pathname;
  const hash = window.location.hash;
  if (path.startsWith('/admin') || hash.includes('admin')) {
    return 'admin';
  }
  if (path.startsWith('/history') || hash.includes('history')) {
    return 'history';
  }
  return 'game';
}

export const App: React.FC = () => {
  // 現在のページビュー (通常ゲーム / 管理画面 / 履歴画面)
  const [currentView, setCurrentView] = useState<AppView>(detectInitialView);

  // 全問題データ（管理者編集データまたは初期JSON）
  const [allQuestions, setAllQuestions] = useState<Question[]>(() => getStoredQuestions());

  // 現在のゲームセッション用問題リスト
  const [activeQuestions, setActiveQuestions] = useState<Question[]>([]);
  // 現在の出題モード設定
  const [currentMode, setCurrentMode] = useState<GameMode>({
    categoryId: 'all',
    difficulty: 'all',
    questionCount: 5,
    shuffle: true,
  });

  const [currentScreen, setCurrentScreen] = useState<GameScreen>('start');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [selectedCoordinates, setSelectedCoordinates] = useState<Coordinates | null>(null);
  const [isPinConfirmed, setIsPinConfirmed] = useState<boolean>(false);
  const [roundResults, setRoundResults] = useState<RoundResult[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 中断・リスタート確認モーダル ('home' | 'restart' | null)
  const [confirmModalType, setConfirmModalType] = useState<'home' | 'restart' | null>(null);

  // サイドバー表示・非表示（ツマミ操作）
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);

  // ヘッダーおよびゲームHUDバーの折りたたみ・展開機能
  const [isHeaderOpen, setIsHeaderOpen] = useState<boolean>(true);
  const [isHudBarOpen, setIsHudBarOpen] = useState<boolean>(true);

  // 地図サイズ再計算を複数回発火させて黒帯や未描画を根絶するヘルパー
  const triggerMapResize = useCallback(() => {
    if (typeof window === 'undefined') return;
    [50, 150, 300, 450].forEach((delay) => {
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('resize'));
        }
      }, delay);
    });
  }, []);

  const toggleHeader = useCallback(() => {
    setIsHeaderOpen((prev) => !prev);
    triggerMapResize();
  }, [triggerMapResize]);

  const toggleHudBar = useCallback(() => {
    setIsHudBarOpen((prev) => !prev);
    triggerMapResize();
  }, [triggerMapResize]);

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen((prev) => !prev);
    triggerMapResize();
  }, [triggerMapResize]);

  // 画面遷移や開閉状態変更時にLeafletマップサイズを自動追従
  useEffect(() => {
    if (currentScreen === 'playing' || currentScreen === 'result') {
      triggerMapResize();
    }
  }, [currentScreen, isHeaderOpen, isHudBarOpen, isSidebarOpen, triggerMapResize]);

  // 地図表示・操作設定
  const [mapSettings, setMapSettings] = useState<MapDisplaySettings>(() => getMapDisplaySettings());
  const handleUpdateMapSettings = useCallback((settings: Partial<MapDisplaySettings>) => {
    const updated = saveMapDisplaySettings(settings);
    setMapSettings(updated);
  }, []);

  // タイマー・カウントダウン関連State
  const [questionStage, setQuestionStage] = useState<QuestionStage>('standby');
  const [elapsedMs, setElapsedMs] = useState<number>(0);
  const [countdownValue, setCountdownValue] = useState<number | string>(3);

  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const countdownTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // タイマー停止関数
  const stopTimer = useCallback(() => {
    if (timerRef.current !== null) {
      cancelAnimationFrame(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // アンマウント時のタイマークリア
  useEffect(() => {
    return () => {
      stopTimer();
      countdownTimersRef.current.forEach((t) => clearTimeout(t));
    };
  }, [stopTimer]);

  // 「問題スタート！」ボタン押下時のカウントダウン＆タイマースタート処理
  const handleStartQuestion = useCallback(() => {
    setQuestionStage('countdown');
    setCountdownValue(3);

    // 既存のタイマーをクリア
    countdownTimersRef.current.forEach((t) => clearTimeout(t));
    countdownTimersRef.current = [];

    const t1 = setTimeout(() => {
      setCountdownValue(2);
    }, 750);

    const t2 = setTimeout(() => {
      setCountdownValue(1);
    }, 1500);

    const t3 = setTimeout(() => {
      setCountdownValue('GO!');
    }, 2250);

    const t4 = setTimeout(() => {
      // GO!後に回答ステージへ移行し、ミリ秒タイマーを即座に開始
      setQuestionStage('answering');
      startTimeRef.current = performance.now();
      setElapsedMs(0);

      const tick = () => {
        const now = performance.now();
        const currentElapsed = now - startTimeRef.current;
        if (currentElapsed >= MAX_GAME_TIME_MS) {
          setElapsedMs(MAX_GAME_TIME_MS);
          setQuestionStage('gameover');
          timerRef.current = null;
          return;
        }
        setElapsedMs(currentElapsed);
        timerRef.current = requestAnimationFrame(tick);
      };
      timerRef.current = requestAnimationFrame(tick);
    }, 2850);

    countdownTimersRef.current = [t1, t2, t3, t4];
  }, [stopTimer]);

  // URLとブラウザ戻る/進む履歴の同期
  const navigateTo = useCallback((view: AppView, path: string) => {
    setCurrentView(view);
    if (typeof window !== 'undefined' && window.location.pathname !== path) {
      window.history.pushState(null, '', path);
    }
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentView(detectInitialView());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // 画面復帰時に問題データの最新化
  const refreshQuestions = useCallback(() => {
    setAllQuestions(getStoredQuestions());
  }, []);

  // sessionStorageからのゲーム状態復元
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.currentScreen && parsed.currentQuestionIndex !== undefined) {
          setCurrentScreen(parsed.currentScreen);
          setCurrentQuestionIndex(parsed.currentQuestionIndex);
          setSelectedCoordinates(parsed.selectedCoordinates);
          setIsPinConfirmed(Boolean(parsed.isPinConfirmed));
          setRoundResults(parsed.roundResults || []);
          if (Array.isArray(parsed.activeQuestions) && parsed.activeQuestions.length > 0) {
            setActiveQuestions(parsed.activeQuestions);
          }
          if (parsed.currentMode) {
            setCurrentMode(parsed.currentMode);
          }
        }
      }
    } catch (e) {
      console.warn('セッション復元の読み込みをスキップしました:', e);
    }
  }, []);

  // 状態変更時のsessionStorage保存
  useEffect(() => {
    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          currentScreen,
          currentQuestionIndex,
          selectedCoordinates,
          isPinConfirmed,
          roundResults,
          activeQuestions,
          currentMode,
        })
      );
    } catch (e) {
      console.warn('セッション保存に失敗しました:', e);
    }
  }, [
    currentScreen,
    currentQuestionIndex,
    selectedCoordinates,
    isPinConfirmed,
    roundResults,
    activeQuestions,
    currentMode,
  ]);

  const currentQuestion = activeQuestions[currentQuestionIndex];
  const totalQuestions = activeQuestions.length;
  const totalScore = roundResults.reduce((acc, r) => acc + r.score, 0);

  // ゲーム開始
  const handleStartGame = (mode: GameMode) => {
    stopTimer();
    countdownTimersRef.current.forEach((t) => clearTimeout(t));
    refreshQuestions();
    const freshQuestions = getStoredQuestions();

    const selected = selectRandomQuestions(freshQuestions, {
      categoryId: mode.categoryId,
      difficulty: mode.difficulty,
      questionCount: mode.questionCount,
      shuffle: mode.shuffle,
      customQuestionIds: mode.customQuestionIds,
    });

    if (selected.length === 0) {
      setErrorMessage('出題可能な問題がありません。カテゴリや難易度を変更してください。');
      return;
    }

    setActiveQuestions(selected);
    setCurrentMode(mode);
    setCurrentQuestionIndex(0);
    setSelectedCoordinates(null);
    setIsPinConfirmed(false);
    setQuestionStage('standby');
    setElapsedMs(0);
    setRoundResults([]);
    setErrorMessage(null);
    setCurrentScreen('playing');
  };

  // 仮ターゲット位置の移動
  const handleMapClick = useCallback((coords: Coordinates) => {
    if (!isValidCoordinates(coords.latitude, coords.longitude)) {
      setErrorMessage('無効な座標が指定されました。');
      return;
    }
    setErrorMessage(null);
    // クリックしただけでは即確定にしない（仮ターゲット状態）
    setSelectedCoordinates(coords);
  }, []);

  // ピン確定（「ここに決定」またはダブルクリック/ダブルタップ）
  const handleConfirmPin = useCallback((coords: Coordinates) => {
    if (!isValidCoordinates(coords.latitude, coords.longitude)) {
      setErrorMessage('無効な座標が選択されました。');
      return;
    }
    setErrorMessage(null);
    setSelectedCoordinates(coords);
    setIsPinConfirmed(true);
  }, []);

  // 回答送信・結果確定
  const handleSubmitAnswer = () => {
    if (!selectedCoordinates || !currentQuestion || !isPinConfirmed) return;

    stopTimer();
    const finalElapsed = elapsedMs;

    try {
      const distanceKm = calculateDistanceKm(
        selectedCoordinates.latitude,
        selectedCoordinates.longitude,
        currentQuestion.answer.latitude,
        currentQuestion.answer.longitude
      );

      const breakdown = calculateScoreBreakdown(distanceKm, finalElapsed);

      const newResult: RoundResult = {
        questionId: currentQuestion.id,
        questionTitle: currentQuestion.title,
        stadiumName: currentQuestion.answer.name,
        userCoordinates: selectedCoordinates,
        correctCoordinates: {
          latitude: currentQuestion.answer.latitude,
          longitude: currentQuestion.answer.longitude,
        },
        distanceKm,
        distanceScore: breakdown.distanceScore,
        timeBonus: breakdown.timeBonus,
        elapsedMs: finalElapsed,
        score: breakdown.totalScore,
      };

      const updatedResults = [...roundResults, newResult];
      setRoundResults(updatedResults);
      setCurrentScreen('result');
    } catch (err) {
      console.error(err);
      setErrorMessage('回答の計算中にエラーが発生しました。');
    }
  };

  // 次の問題または最終結果
  const handleNextQuestion = () => {
    stopTimer();
    countdownTimersRef.current.forEach((t) => clearTimeout(t));

    if (currentQuestionIndex + 1 < totalQuestions) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setSelectedCoordinates(null);
      setIsPinConfirmed(false);
      setQuestionStage('standby');
      setElapsedMs(0);
      setErrorMessage(null);
      setCurrentScreen('playing');
    } else {
      // 最終結果画面へ移行し、履歴をlocalStorageに保存
      try {
        const catInfo = categoriesData.find((c) => c.id === currentMode.categoryId);
        const historyItem: GameHistory = {
          id: generateId('hist'),
          playedAt: new Date().toISOString(),
          mode: {
            categoryId: currentMode.categoryId,
            categoryName: currentMode.categoryId === 'all' ? '全カテゴリ' : (catInfo?.name || currentMode.categoryId),
            difficulty: currentMode.difficulty,
            questionCount: roundResults.length,
          },
          totalScore: roundResults.reduce((acc, r) => acc + r.score, 0),
          averageDistanceKm:
            roundResults.length > 0
              ? roundResults.reduce((acc, r) => acc + r.distanceKm, 0) / roundResults.length
              : 0,
          correctCount: roundResults.filter((r) => r.distanceKm <= 10).length,
          results: roundResults.map((r) => ({
            questionId: r.questionId,
            questionTitle: r.questionTitle,
            stadiumName: r.stadiumName,
            answerLatitude: r.userCoordinates.latitude,
            answerLongitude: r.userCoordinates.longitude,
            correctLatitude: r.correctCoordinates.latitude,
            correctLongitude: r.correctCoordinates.longitude,
            distanceKm: r.distanceKm,
            distanceScore: r.distanceScore,
            timeBonus: r.timeBonus,
            elapsedMs: r.elapsedMs,
            score: r.score,
          })),
        };
        saveHistory(historyItem);
      } catch (err) {
        console.warn('履歴の保存に失敗しました:', err);
      }

      setCurrentScreen('final');
    }
  };

  // もう一度遊ぶ（スタート画面へ）
  const handleRestart = () => {
    stopTimer();
    countdownTimersRef.current.forEach((t) => clearTimeout(t));
    sessionStorage.removeItem(STORAGE_KEY);
    setCurrentScreen('start');
    setCurrentQuestionIndex(0);
    setSelectedCoordinates(null);
    setIsPinConfirmed(false);
    setQuestionStage('standby');
    setElapsedMs(0);
    setRoundResults([]);
    setErrorMessage(null);
  };

  return (
    <div className="app-container">
      {/* 未来型HUDナビゲーションヘッダー (NEO CARTOGRAPHER) */}
      {isHeaderOpen ? (
        <header className="app-header neo-hud-header">
          <div className="header-inner">
            <div
              className="logo neo-logo"
              onClick={() => {
                if (currentView !== 'game') {
                  navigateTo('game', '/');
                } else {
                  handleRestart();
                }
              }}
              role="button"
              tabIndex={0}
              title="NEO CARTOGRAPHER ホームへ"
            >
              <div className="scanner-sphere-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="20" height="20" className="hud-globe-svg">
                  <circle cx="12" cy="12" r="9" fill="none" stroke="#00E5FF" strokeWidth="1.5" strokeDasharray="3 2" />
                  <ellipse cx="12" cy="12" rx="9" ry="4" fill="none" stroke="#00E5FF" strokeWidth="1" />
                  <line x1="12" y1="3" x2="12" y2="21" stroke="#00E5FF" strokeWidth="1" />
                  <circle cx="12" cy="12" r="2.5" fill="#00E5FF" />
                </svg>
              </div>
              <div className="logo-title-group">
                <span className="logo-primary neon-main-title">SPO-CHIZU-JP</span>
                <span className="logo-sub neon-sub-system">
                  <span className="sys-badge">NEO CARTOGRAPHER</span>
                </span>
              </div>
            </div>

            {/* 右側: ステータス＆ナビゲーション */}
            <div className="header-right-hud">
              {/* 接続状態インジケーター */}
              <div className="hud-signal-status neon-signal-box" title="システム稼働状態: 正常">
                <span className="signal-dot neon-led" aria-hidden="true"></span>
                <span className="signal-label neon-mono">ONLINE</span>
              </div>

              {/* ゲーム中のラウンド・スコアサマリー */}
              {currentView === 'game' && (currentScreen === 'playing' || currentScreen === 'result') && (
                <div className="header-game-stats-hud neon-stats-hud">
                  <span className="hud-stat-item neon-stat-item">
                    <span className="stat-tag neon-mono">RND</span>
                    <span className="stat-num neon-mono-val">{String(currentQuestionIndex + 1).padStart(2, '0')}/{String(totalQuestions).padStart(2, '0')}</span>
                  </span>
                  <span className="hud-stat-item score-hud-item neon-stat-item">
                    <span className="stat-tag neon-mono">PTS</span>
                    <span className="stat-num highlight neon-gold-val">{totalScore.toLocaleString()}</span>
                  </span>
                </div>
              )}

              <nav className="header-nav">
                {/* ゲームプレイ中のクイック操作（🏠️タイトルへ & 🔄最初からやり直す） */}
                {currentView === 'game' && (currentScreen === 'playing' || currentScreen === 'result') && (
                  <div className="header-game-actions" role="group" aria-label="ゲーム中断操作">
                    <button
                      type="button"
                      className="header-action-icon-btn neo-chamfer-btn"
                      onClick={() => setConfirmModalType('home')}
                      title="ゲームを終了してタイトル画面に戻る"
                      aria-label="タイトルへ戻る"
                    >
                      <span className="btn-icon" aria-hidden="true">🏠️</span>
                      <span className="action-btn-text">タイトルへ</span>
                    </button>
                    <button
                      type="button"
                      className="header-action-icon-btn neo-chamfer-btn"
                      onClick={() => setConfirmModalType('restart')}
                      title="現在の設定で第1問目からやり直す"
                      aria-label="最初からやり直す"
                    >
                      <span className="btn-icon" aria-hidden="true">🔄</span>
                      <span className="action-btn-text">最初から</span>
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  className={`header-nav-btn neo-nav-item ${currentView === 'game' ? 'active' : ''}`}
                  onClick={() => {
                    if (currentScreen === 'playing' || currentScreen === 'result') {
                      setConfirmModalType('home');
                    } else {
                      navigateTo('game', '/');
                    }
                  }}
                  title="ゲーム画面へ"
                  aria-label="ゲーム画面へ"
                >
                  <span className="btn-icon" aria-hidden="true">🎮</span>
                  <span className="nav-btn-text">GAME</span>
                </button>
                <button
                  type="button"
                  className={`header-nav-btn neo-nav-item ${currentView === 'history' ? 'active' : ''}`}
                  onClick={() => navigateTo('history', '/history')}
                  title="結果履歴を見る"
                  aria-label="結果履歴を見る"
                >
                  <span className="btn-icon" aria-hidden="true">📜</span>
                  <span className="nav-btn-text">ARCHIVE</span>
                </button>
                <button
                  type="button"
                  className={`header-nav-btn neo-nav-item ${currentView === 'admin' ? 'active' : ''}`}
                  onClick={() => navigateTo('admin', '/admin/questions')}
                  title="問題管理画面・各種設定へ"
                  aria-label="問題管理画面・各種設定へ"
                >
                  <span className="btn-icon" aria-hidden="true">⚙️</span>
                  <span className="nav-btn-text">SYSTEM</span>
                </button>

                {/* ヘッダー折りたたみトグルボタン（常備） */}
                <button
                  type="button"
                  className="header-collapse-toggle-btn neo-chamfer-btn"
                  onClick={toggleHeader}
                  title="ヘッダーを折りたたんで画面を広げる"
                  aria-label="ヘッダーを折りたたむ"
                >
                  <span className="btn-icon" aria-hidden="true">▲</span>
                  <span className="action-btn-text">ヘッダー閉じる</span>
                </button>
              </nav>
            </div>
          </div>
        </header>
      ) : (
        /* ヘッダー非表示時のコンパクト再展開タブ（常備） */
        <div className="header-reopen-bar" role="banner" aria-label="ヘッダー折りたたみ中">
          <button
            type="button"
            className="header-reopen-pill-btn neo-chamfer-btn"
            onClick={toggleHeader}
            title="ヘッダー（ナビゲーション）を展開する"
            aria-label="ヘッダーを展開する"
          >
            <span className="pulse-dot" aria-hidden="true"></span>
            <span className="btn-icon" aria-hidden="true">▼</span>
            <span className="reopen-label">SPO-CHIZU-JP ヘッダー表示</span>
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="error-banner" role="alert">
          {errorMessage}
        </div>
      )}

      <main className={`main-content ${!isHeaderOpen ? 'has-collapsed-header' : ''} ${currentView === 'game' && currentScreen === 'start' ? 'start-screen-active' : ''}`}>
        {/* 管理画面ビュー */}
        {currentView === 'admin' && (
          <AdminQuestionsPage
            onBackToGame={() => {
              refreshQuestions();
              navigateTo('game', '/');
            }}
          />
        )}

        {/* 履歴画面ビュー */}
        {currentView === 'history' && (
          <HistoryPage onBackToGame={() => navigateTo('game', '/')} />
        )}

        {/* ゲーム画面ビュー */}
        {currentView === 'game' && (
          <>
            {currentScreen === 'start' && (
              <StartScreen
                questions={allQuestions}
                onStart={handleStartGame}
                onNavigateToHistory={() => navigateTo('history', '/history')}
                onNavigateToAdmin={() => navigateTo('admin', '/admin/questions')}
              />
            )}

            {currentScreen === 'playing' && currentQuestion && (
              <div className="game-screen-wrapper">
                {/* 独立したゲームHUDバー（折りたたみ＆再展開可能） */}
                <GameHudBar
                  currentRound={currentQuestionIndex + 1}
                  totalQuestions={totalQuestions}
                  results={roundResults}
                  totalScore={totalScore}
                  elapsedMs={elapsedMs}
                  mapSettings={mapSettings}
                  onChangeMapSettings={handleUpdateMapSettings}
                  isResultScreen={false}
                  isOpen={isHudBarOpen}
                  onToggleOpen={toggleHudBar}
                />

                <div
                  className={`game-layout geoguessr-theme ${!isSidebarOpen ? 'sidebar-collapsed' : ''} ${!isHudBarOpen ? 'hud-collapsed' : ''}`}
                  style={{
                    flex: '1 1 0%',
                    height: isHudBarOpen ? 'calc(100% - 54px)' : 'calc(100% - 24px)',
                    minHeight: 0,
                    position: 'relative',
                  }}
                >
                  {/* サイドバー開閉ツマミ */}
                  <button
                    type="button"
                    className={`sidebar-toggle-handle ${isSidebarOpen ? 'open' : 'closed'}`}
                    onClick={toggleSidebar}
                    aria-label={isSidebarOpen ? 'サイドバーを閉じる' : 'サイドバーを開く'}
                    title={isSidebarOpen ? 'サイドバーを隠して地図を広げる' : 'サイドバーを表示する'}
                  >
                    <span className="handle-chevron" aria-hidden="true">
                      {isSidebarOpen ? '◀' : '▶'}
                    </span>
                    <span className="handle-label">
                      {isSidebarOpen ? '隠す' : 'メニュー'}
                    </span>
                  </button>

                  <QuestionPanel
                    question={currentQuestion}
                    questionNumber={currentQuestionIndex + 1}
                    totalQuestions={totalQuestions}
                    totalScore={totalScore}
                    selectedCoordinates={selectedCoordinates}
                    isConfirmed={isPinConfirmed}
                    questionStage={questionStage}
                    elapsedMs={elapsedMs}
                    countdownValue={countdownValue}
                    onStartQuestion={handleStartQuestion}
                    onRestartGame={handleRestart}
                    onSubmitAnswer={handleSubmitAnswer}
                  />
                  <GameMap
                    userCoordinates={selectedCoordinates}
                    isConfirmed={isPinConfirmed}
                    interactive={true}
                    questionStage={questionStage}
                    elapsedMs={elapsedMs}
                    mapSettings={mapSettings}
                    showInlineControls={false}
                    onMapClick={handleMapClick}
                    onConfirmPin={handleConfirmPin}
                  />
                </div>
              </div>
            )}

            {currentScreen === 'result' && roundResults.length > 0 && (
              <div className="game-screen-wrapper">
                {/* 結果画面HUDバー */}
                <GameHudBar
                  currentRound={currentQuestionIndex + 1}
                  totalQuestions={totalQuestions}
                  results={roundResults}
                  totalScore={totalScore}
                  elapsedMs={elapsedMs}
                  mapSettings={mapSettings}
                  onChangeMapSettings={handleUpdateMapSettings}
                  isResultScreen={true}
                  isOpen={isHudBarOpen}
                  onToggleOpen={toggleHudBar}
                />

                <div
                  className={`game-layout result-layout geoguessr-theme ${!isSidebarOpen ? 'sidebar-collapsed' : ''} ${!isHudBarOpen ? 'hud-collapsed' : ''}`}
                  style={{
                    flex: '1 1 0%',
                    height: isHudBarOpen ? 'calc(100% - 54px)' : 'calc(100% - 24px)',
                    minHeight: 0,
                    position: 'relative',
                  }}
                >
                  {/* 結果画面でもサイドバー開閉ツマミ利用可能 */}
                  <button
                    type="button"
                    className={`sidebar-toggle-handle ${isSidebarOpen ? 'open' : 'closed'}`}
                    onClick={toggleSidebar}
                    aria-label={isSidebarOpen ? 'サイドバーを閉じる' : 'サイドバーを開く'}
                    title={isSidebarOpen ? 'サイドバーを隠して地図を広げる' : 'サイドバーを表示する'}
                  >
                    <span className="handle-chevron" aria-hidden="true">
                      {isSidebarOpen ? '◀' : '▶'}
                    </span>
                    <span className="handle-label">
                      {isSidebarOpen ? '隠す' : 'メニュー'}
                    </span>
                  </button>

                  <ResultPanel
                    roundResult={roundResults[roundResults.length - 1]}
                    roundNumber={currentQuestionIndex + 1}
                    totalRounds={totalQuestions}
                    isLastQuestion={currentQuestionIndex + 1 >= totalQuestions}
                    onNext={handleNextQuestion}
                  />
                  <GameMap
                    userCoordinates={roundResults[roundResults.length - 1].userCoordinates}
                    correctCoordinates={roundResults[roundResults.length - 1].correctCoordinates}
                    correctLabel={roundResults[roundResults.length - 1].stadiumName}
                    showLine={true}
                    interactive={false}
                    fitBothMarkers={true}
                    mapSettings={mapSettings}
                    showInlineControls={false}
                  />
                </div>
              </div>
            )}

            {currentScreen === 'final' && (
              <FinalResult
                roundResults={roundResults}
                onRestart={handleRestart}
                onNavigateToHistory={() => navigateTo('history', '/history')}
              />
            )}
          </>
        )}
      </main>

      {/* 「🏠️ タイトルに戻る」確認モーダル */}
      <ConfirmModal
        isOpen={confirmModalType === 'home'}
        title="🏠️ タイトルに戻る"
        message={`ゲームを終了してタイトルに戻りますか？\n（現在のゲームの進捗は破棄されます）`}
        confirmText="はい"
        cancelText="いいえ"
        confirmButtonClass="confirm-danger-btn"
        onConfirm={() => {
          setConfirmModalType(null);
          handleRestart();
        }}
        onCancel={() => setConfirmModalType(null)}
      />

      {/* 「🔄 最初からやり直す」確認モーダル */}
      <ConfirmModal
        isOpen={confirmModalType === 'restart'}
        title="🔄 ゲームのリスタート"
        message={`最初からやり直しますか？\n（第1問目から新しくゲームを開始します）`}
        confirmText="はい"
        cancelText="いいえ"
        confirmButtonClass="primary-btn"
        onConfirm={() => {
          setConfirmModalType(null);
          handleStartGame(currentMode);
        }}
        onCancel={() => setConfirmModalType(null)}
      />
    </div>
  );
};

export default App;
