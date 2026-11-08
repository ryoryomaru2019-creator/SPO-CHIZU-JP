import React, { useState, useMemo } from 'react';
import { Category, GameMode, Question } from '../types/game';
import {
  getGameModeSettings,
  saveGameModeSettings,
} from '../storage/settingsStorage';
import {
  AdvancedFilterState,
  INITIAL_FILTER_STATE,
  filterQuestions,
} from '../utils/questionFilter';
import { QuestionFilterPanel } from './QuestionFilterPanel';
import { TopPlayersPanel } from './TopPlayersPanel';
import {
  getLastPlayerName,
  savePlayerName,
  getPlayerUniqueId,
} from '../services/rankingService';
import categoriesData from '../data/categories.json';

interface StartScreenProps {
  questions: Question[];
  onStart: (mode: GameMode) => void;
  onNavigateToHistory: () => void;
  onNavigateToAdmin: () => void;
}

export const StartScreen: React.FC<StartScreenProps> = ({
  questions,
  onStart,
  onNavigateToHistory,
  onNavigateToAdmin,
}) => {
  const initialMode = useMemo(() => getGameModeSettings(), []);
  const categories: Category[] = useMemo(() => categoriesData as Category[], []);

  // Unisearch風の高度な絞り込み状態
  const [filter, setFilter] = useState<AdvancedFilterState>(() => ({
    ...INITIAL_FILTER_STATE,
    categoryId: initialMode.categoryId || 'all',
    difficulty: initialMode.difficulty || 'all',
  }));

  const [questionCount, setQuestionCount] = useState<number | 'all'>(
    initialMode.questionCount || 5
  );
  const [shuffle, setShuffle] = useState<boolean>(initialMode.shuffle !== false);

  // プレイヤー名設定ステート（「華麗にヒラメいた！」風）
  const [playerName, setPlayerName] = useState<string>(() => getLastPlayerName());
  const [playerId] = useState<string>(() => getPlayerUniqueId());
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [tempName, setTempName] = useState<string>(playerName);
  const [nameSavedNotice, setNameSavedNotice] = useState<boolean>(false);

  const handleSaveName = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = tempName.trim();
    if (!clean) return;
    savePlayerName(clean);
    setPlayerName(clean);
    setIsEditingName(false);
    setNameSavedNotice(true);
    setTimeout(() => setNameSavedNotice(false), 2500);
  };

  // 現在の条件に一致する問題一覧
  const matchingQuestions = useMemo(() => {
    return filterQuestions(questions, filter);
  }, [questions, filter]);

  const hasQuestions = matchingQuestions.length > 0;

  const handleStart = () => {
    if (!hasQuestions) return;

    const mode: GameMode = {
      categoryId: filter.categoryId,
      difficulty: filter.difficulty,
      questionCount,
      shuffle,
      customQuestionIds: matchingQuestions.map((q) => q.id),
      filterSummary: [
        filter.league !== 'all' ? filter.league : null,
        filter.region !== 'all' ? filter.region : null,
        filter.difficulty !== 'all' ? filter.difficulty : null,
      ]
        .filter(Boolean)
        .join('・'),
    };

    saveGameModeSettings(mode);
    onStart(mode);
  };

  return (
    <div className="screen-container start-screen neo-cyber-screen">
      {/* 背景の薄いサイバーパンク演出レイヤー */}
      <div className="cyber-ambient-bg" aria-hidden="true">
        <div className="cyber-grid-overlay"></div>
        <div className="cyber-coordinates-decor">
          <span>LAT 35.6812 // LON 139.7671 // SYS.ACTV</span>
          <span>LOCATION_INTEL_SCANNER_v2.6</span>
        </div>
      </div>

      <div className="card start-card neo-cyber-panel">
        {/* パネル上部スキャンライン & 四隅テクニカルマーカー */}
        <div className="panel-scanline" aria-hidden="true"></div>
        <div className="corner-bracket top-left" aria-hidden="true">+</div>
        <div className="corner-bracket top-right" aria-hidden="true">+</div>
        <div className="corner-bracket bottom-left" aria-hidden="true">+</div>
        <div className="corner-bracket bottom-right" aria-hidden="true">+</div>

        <header className="start-header neo-header-block">
          <div className="scanner-status-strip">
            <span className="scanner-badge-pill">TERMINAL ONLINE</span>
            <span className="scanner-meta">SEC-LVL: ALPHA // GEOGUESS ENGINE</span>
          </div>

          <div className="title-row">
            <div className="title-left-brand">
              <div className="logo-badge neo-logo-badge" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#00E5FF" strokeWidth="2">
                  <circle cx="12" cy="12" r="9" strokeDasharray="3 2" />
                  <line x1="12" y1="2" x2="12" y2="6" />
                  <line x1="12" y1="18" x2="12" y2="22" />
                  <line x1="2" y1="12" x2="6" y2="12" />
                  <line x1="18" y1="12" x2="22" y2="12" />
                  <circle cx="12" cy="12" r="2.5" fill="#00E5FF" />
                </svg>
              </div>
              <div>
                <h1 className="game-title neo-title">SPO-CHIZU-JP</h1>
                <p className="game-subtitle neo-subtitle">JAPAN 地理王はキミだ！</p>
              </div>
            </div>

            {/* スタート画面右上のトッププレイヤー（世界ランキング） */}
            <div className="start-top-players-box">
              <TopPlayersPanel initialOpen={false} />
            </div>
          </div>

          {/* プレイヤー名設定バー（華麗にヒラメいた！風） */}
          <div className="title-player-profile-bar">
            <div className="profile-id-chip" title="端末固有のプレイヤーID（自動識別）">
              <span className="chip-label">ID:</span>
              <strong className="chip-code">{playerId}</strong>
            </div>

            {isEditingName ? (
              <form onSubmit={handleSaveName} className="player-name-edit-form">
                <span className="profile-user-icon" aria-hidden="true">👤</span>
                <input
                  type="text"
                  className="player-name-inline-input"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  placeholder="プレイヤー名"
                  maxLength={16}
                  autoFocus
                />
                <button type="submit" className="player-name-save-btn">
                  ✓ 保存
                </button>
                <button
                  type="button"
                  className="player-name-cancel-btn"
                  onClick={() => {
                    setTempName(playerName);
                    setIsEditingName(false);
                  }}
                >
                  ✕
                </button>
              </form>
            ) : (
              <div className="player-name-display-group">
                <span className="profile-user-icon" aria-hidden="true">👤</span>
                <span className="profile-name-label">プレイヤー名:</span>
                <strong className="profile-player-name">{playerName}</strong>
                <button
                  type="button"
                  className="player-name-edit-btn"
                  onClick={() => {
                    setTempName(playerName);
                    setIsEditingName(true);
                  }}
                  title="プレイヤー名を変更"
                >
                  ✏️ 変更
                </button>
                {nameSavedNotice && <span className="name-saved-toast">保存しました！</span>}
              </div>
            )}
          </div>
        </header>

        {/* 出題設定エリア (NEO MISSION CONFIGURATION) */}
        <section className="start-settings-panel neo-settings-panel" aria-label="ゲーム出題設定">
          <div className="settings-panel-header neo-panel-header">
            <div className="header-labels-col">
              <span className="sys-code-tag">SYSTEM: CONFIG_MODULE // 01</span>
              <h2 className="settings-panel-title">
                出題設定 <span className="en-sub">MISSION CONFIGURATION</span>
              </h2>
            </div>
            <span className="settings-panel-sub neo-sub-label">
              LOCATION SCANNER // REGION DATA SYSTEM
            </span>
          </div>

          <QuestionFilterPanel
            filter={filter}
            onChangeFilter={setFilter}
            categories={categories}
            matchCount={matchingQuestions.length}
            totalCount={questions.filter((q) => q.isPublished).length}
          />

          {/* 出題数とシャッフル */}
          <div className="game-count-settings-bar neo-count-bar">
            <div className="count-selector-group">
              <label htmlFor="question-count-select" className="count-label">
                <span className="label-prefix">PARAM:</span> 出題問題数 (ROUNDS):
              </label>
              <select
                id="question-count-select"
                className="count-select neo-select"
                value={String(questionCount)}
                onChange={(e) => {
                  const val = e.target.value;
                  setQuestionCount(val === 'all' ? 'all' : parseInt(val, 10));
                }}
              >
                <option value="5">05 ROUNDS (ランダム 5問)</option>
                <option value="10">10 ROUNDS (ランダム 10問)</option>
                <option value="20">20 ROUNDS (じっくり 20問)</option>
                <option value="all">ALL TARGETS (該当する全問題を出題)</option>
              </select>
            </div>

            <label className="shuffle-toggle-label neo-checkbox-label">
              <input
                type="checkbox"
                checked={shuffle}
                onChange={(e) => setShuffle(e.target.checked)}
              />
              <span className="checkbox-custom" aria-hidden="true"></span>
              <span>🔀 RANDOMIZE SEQUENCE (シャッフル出題)</span>
            </label>
          </div>

          {!hasQuestions && (
            <div className="error-notice-box neo-error-box" role="alert">
              ⚠️ NO TARGETS MATCHED: 選択した条件に一致する探査ターゲットがありません。フィルター条件を再設定してください。
            </div>
          )}

          {/* サイバーパンク メインアクションボタン (START SCAN) */}
          <div className="start-action-row">
            <button
              type="button"
              className="neo-btn-primary start-game-btn"
              onClick={handleStart}
              disabled={!hasQuestions}
              aria-label="ゲームを開始する"
            >
              <span className="btn-hud-decor left" aria-hidden="true">[▶]</span>
              <span className="btn-main-text">START SCAN</span>
              <span className="btn-ja-text">(ゲームを開始する)</span>
              {hasQuestions && (
                <span className="btn-badge neo-badge">
                  {questionCount === 'all'
                    ? `ALL ${matchingQuestions.length} TARGETS`
                    : `${Math.min(typeof questionCount === 'number' ? questionCount : 5, matchingQuestions.length)} ROUNDS`}
                </span>
              )}
              <span className="btn-hud-decor right" aria-hidden="true">[◀]</span>
            </button>
          </div>
        </section>

        {/* ナビゲーションショートカットボタン */}
        <div className="start-nav-links neo-nav-links">
          <button
            type="button"
            className="neo-btn-secondary nav-btn"
            onClick={onNavigateToHistory}
            title="過去のプレイ履歴と詳細結果を確認"
          >
            <span className="btn-icon">📜</span>
            <span>ARCHIVE // 履歴ログ</span>
          </button>
          <button
            type="button"
            className="neo-btn-secondary nav-btn"
            onClick={onNavigateToAdmin}
            title="問題の追加・編集・ランキング連携を行う管理画面"
          >
            <span className="btn-icon">⚙️</span>
            <span>SYSTEM // 管理設定</span>
          </button>
        </div>

        {/* ゲームルール */}
        <section className="start-description neo-briefing-box">
          <div className="briefing-header">
            <span className="briefing-tag">MISSION PROTOCOL</span>
            <h3>探査ミッションの流れ</h3>
          </div>
          <ol className="briefing-steps">
            <li><strong>01. TARGET LOCK (出題)</strong>: スタジアムや地域のクイズターゲットが指定されます。</li>
            <li><strong>02. LOCATION ESTIMATE (予想)</strong>: 地図を動かし、正解だと思う地点をタップしてマーカーを投影します。</li>
            <li><strong>03. TIME BONUS (計測)</strong>: 素早く答えるほどタイムボーナス（最大+1,000点）が加算！</li>
            <li><strong>04. CONFIRM (確定)</strong>: 「ここに決定」を押して座標を確定スキャンします。</li>
            <li><strong>05. SYNC (世界ランキング)</strong>: 誤差距離とスコアがリアルタイムにオンラインランキングへ同期されます。</li>
          </ol>
        </section>
      </div>
    </div>
  );
};
