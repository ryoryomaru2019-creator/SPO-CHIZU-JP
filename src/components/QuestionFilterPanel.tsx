import React, { useMemo, useState } from 'react';
import { Category, Difficulty } from '../types/game';
import {
  AdvancedFilterState,
  LeagueFilter,
  RegionBlock,
  GenreType,
  SportKindType,
  GENRES,
  SPORT_KINDS,
  REGION_BLOCKS,
  THEME_TAGS,
  getAvailableClubs,
} from '../utils/questionFilter';

interface QuestionFilterPanelProps {
  filter: AdvancedFilterState;
  onChangeFilter: (newFilter: AdvancedFilterState) => void;
  categories: Category[];
  matchCount: number;
  totalCount: number;
}

export const QuestionFilterPanel: React.FC<QuestionFilterPanelProps> = ({
  filter,
  onChangeFilter,
  categories,
  matchCount,
  totalCount,
}) => {
  // 各セクションの折りたたみ開閉状態
  const [collapsed, setCollapsed] = useState<{ [key: string]: boolean }>({
    genre: false,
    sportKind: false,
    league: false,
    region: false,
    clubs: false,
    difficulty: false,
    theme: false,
  });

  const toggleSection = (key: string) => {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  };
  // ジャンル変更
  const handleGenreChange = (genre: GenreType) => {
    onChangeFilter({ ...filter, genre });
  };

  // 種類区分変更
  const handleSportKindChange = (sportKind: SportKindType) => {
    onChangeFilter({ ...filter, sportKind });
  };

  // キーワード変更
  const handleKeywordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChangeFilter({ ...filter, keyword: e.target.value });
  };

  // リーグ変更
  const handleLeagueChange = (league: LeagueFilter) => {
    const available = getAvailableClubs(league, filter.region);
    const validClubs = filter.clubs.filter((c) => available.some((a) => a.name === c));
    onChangeFilter({ ...filter, league, clubs: validClubs });
  };

  // 地域変更
  const handleRegionChange = (region: RegionBlock) => {
    const available = getAvailableClubs(filter.league, region);
    const validClubs = filter.clubs.filter((c) => available.some((a) => a.name === c));
    onChangeFilter({ ...filter, region, clubs: validClubs });
  };

  // チーム選択トグル
  const handleToggleClub = (clubName: string) => {
    const exists = filter.clubs.includes(clubName);
    const newClubs = exists
      ? filter.clubs.filter((c) => c !== clubName)
      : [...filter.clubs, clubName];
    onChangeFilter({ ...filter, clubs: newClubs });
  };

  // 現在表示されている候補クラブの全選択 / 全解除
  const currentAvailableClubs = useMemo(() => {
    return getAvailableClubs(filter.league, filter.region);
  }, [filter.league, filter.region]);

  const handleSelectAllClubs = () => {
    const allNames = currentAvailableClubs.map((c) => c.name);
    onChangeFilter({ ...filter, clubs: Array.from(new Set([...filter.clubs, ...allNames])) });
  };

  const handleClearClubs = () => {
    onChangeFilter({ ...filter, clubs: [] });
  };

  // 難易度変更
  const handleDifficultyChange = (difficulty: Difficulty | 'all') => {
    onChangeFilter({ ...filter, difficulty });
  };

  // カテゴリ変更
  const handleCategoryChange = (categoryId: string) => {
    onChangeFilter({ ...filter, categoryId });
  };

  // テーマタグトグル
  const handleToggleTheme = (themeId: string) => {
    const exists = filter.themes.includes(themeId);
    const newThemes = exists
      ? filter.themes.filter((id) => id !== themeId)
      : [...filter.themes, themeId];
    onChangeFilter({ ...filter, themes: newThemes });
  };

  // アクティブフィルター全解除
  const handleClearAll = () => {
    onChangeFilter({
      genre: 'sports',
      sportKind: 'soccer',
      keyword: '',
      categoryId: 'all',
      league: 'all',
      region: 'all',
      clubs: [],
      difficulty: 'all',
      themes: [],
    });
  };

  // アクティブな条件チップのリストを作成
  const activeChips: { label: string; onRemove: () => void }[] = [];

  if (filter.genre !== 'sports') {
    const g = GENRES.find((x) => x.id === filter.genre);
    activeChips.push({
      label: `MODULE: ${g?.id.toUpperCase() || filter.genre}`,
      onRemove: () => onChangeFilter({ ...filter, genre: 'sports' }),
    });
  }

  if (filter.sportKind && filter.sportKind !== 'soccer') {
    const sk = SPORT_KINDS.find((x) => x.id === filter.sportKind);
    activeChips.push({
      label: `SPORT: ${sk?.label || filter.sportKind}`,
      onRemove: () => handleSportKindChange('soccer'),
    });
  }

  if (filter.keyword.trim()) {
    activeChips.push({
      label: `KEYWORD: "${filter.keyword.trim()}"`,
      onRemove: () => onChangeFilter({ ...filter, keyword: '' }),
    });
  }

  if (filter.league !== 'all') {
    activeChips.push({
      label: `LEAGUE: ${filter.league}`,
      onRemove: () => handleLeagueChange('all'),
    });
  }

  if (filter.region !== 'all') {
    const reg = REGION_BLOCKS.find((r) => r.id === filter.region);
    activeChips.push({
      label: `REGION: ${reg ? reg.label : filter.region}`,
      onRemove: () => handleRegionChange('all'),
    });
  }

  filter.clubs.forEach((clubName) => {
    activeChips.push({
      label: `TEAM: ${clubName}`,
      onRemove: () => handleToggleClub(clubName),
    });
  });

  if (filter.difficulty !== 'all') {
    const diffNames: Record<Difficulty, string> = {
      easy: 'EASY (初級)',
      medium: 'MEDIUM (中級)',
      hard: 'HARD (上級)',
      expert: 'EXPERT (激ムズ)',
    };
    activeChips.push({
      label: `DIFF: ${diffNames[filter.difficulty as Difficulty] || filter.difficulty}`,
      onRemove: () => onChangeFilter({ ...filter, difficulty: 'all' }),
    });
  }

  if (filter.categoryId !== 'all') {
    const cat = categories.find((c) => c.id === filter.categoryId);
    activeChips.push({
      label: `CAT: ${cat ? cat.name : filter.categoryId}`,
      onRemove: () => onChangeFilter({ ...filter, categoryId: 'all' }),
    });
  }

  filter.themes.forEach((themeId) => {
    const theme = THEME_TAGS.find((t) => t.id === themeId);
    if (theme) {
      activeChips.push({
        label: `THEME: ${theme.label.split(' ')[1] || theme.label}`,
        onRemove: () => handleToggleTheme(themeId),
      });
    }
  });

  return (
    <div className="unisearch-filter-panel neo-filter-panel" aria-label="問題の絞り込みフィルター">
      {/* 0. ジャンル選択 (MODULE SELECTION // 01) カード型タイル */}
      <div className="filter-genre-section neo-genre-section">
        <div className="section-label-bar clickable" onClick={() => toggleSection('genre')}>
          <div className="label-left-group">
            <span className="section-dot" aria-hidden="true">■</span>
            <label className="facet-label neo-facet-label">
              ジャンル選択 <span className="en-code">MODULE SELECTION // 01</span>
            </label>
          </div>
          <button
            type="button"
            className="section-fold-btn"
            aria-label={collapsed.genre ? 'ジャンル選択を展開' : 'ジャンル選択を折りたたむ'}
          >
            {collapsed.genre ? '▼ 展開' : '▲ 閉じる'}
          </button>
        </div>

        {!collapsed.genre && (
          <div className="genre-tile-grid" role="radiogroup" aria-label="ジャンル区分選択">
            {GENRES.map((g) => {
              const isSelected = filter.genre === g.id;
              return (
                <div
                  key={g.id}
                  role="radio"
                  tabIndex={0}
                  aria-checked={isSelected}
                  className={`genre-card-tile ${isSelected ? 'selected' : ''} ${!g.isAvailable ? 'locked' : ''}`}
                  onClick={() => handleGenreChange(g.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleGenreChange(g.id);
                    }
                  }}
                >
                  <div className="tile-accent-line" aria-hidden="true"></div>
                  <div className="tile-header">
                    <span className="tile-icon" aria-hidden="true">{g.icon}</span>
                    <span className={`tile-status-tag ${isSelected ? 'active-tag' : !g.isAvailable ? 'lock-tag' : 'ready-tag'}`}>
                      {isSelected ? 'SELECTED' : !g.isAvailable ? 'DATA LOCKED' : 'READY'}
                    </span>
                  </div>
                  <div className="tile-body">
                    <div className="tile-en-name">{g.id.toUpperCase()}</div>
                    <div className="tile-ja-name">{g.label.split(' ')[0]}</div>
                    <div className="tile-meta-desc">
                      {g.isAvailable ? `${totalCount} TARGETS LOADED` : 'COMING SOON'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {filter.genre !== 'sports' && (
        <div className="genre-notice-banner neo-locked-banner" role="status">
          <span className="notice-icon">🔒</span>
          <span>
            [DATA LOCKED] 「{GENRES.find((g) => g.id === filter.genre)?.label}」は今後のアップデートで暗号解除されます。現在は「SPORTS」セクターが稼働中です。
          </span>
        </div>
      )}

      {/* 1. キーワード検索ボックス (SCAN SEARCH) */}
      <div className="filter-search-row neo-search-row">
        <div className="search-input-wrapper neo-input-wrapper">
          <span className="search-icon" aria-hidden="true">⌕</span>
          <input
            type="search"
            className="filter-search-input neo-search-input"
            placeholder="クラブ名、スタジアム名、地域名で高速検索 (SEARCH KEYWORD)..."
            value={filter.keyword}
            onChange={handleKeywordChange}
            aria-label="問題キーワード検索"
          />
          {filter.keyword && (
            <button
              type="button"
              className="clear-search-btn neo-clear-btn"
              onClick={() => onChangeFilter({ ...filter, keyword: '' })}
              title="検索語をクリア"
              aria-label="検索語をクリア"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* 2. 選択中のアクティブフィルターチップ (ACTIVE SCAN PARAMETERS) */}
      {activeChips.length > 0 && (
        <div className="active-filters-bar neo-active-bar">
          <div className="active-chips-list">
            <span className="active-label neo-active-label">
              <span className="active-led" aria-hidden="true"></span>
              ACTIVE SIGNALS:
            </span>
            {activeChips.map((chip, idx) => (
              <span key={idx} className="filter-chip neo-chip active-chip">
                <span className="chip-label-text">{chip.label}</span>
                <button
                  type="button"
                  className="chip-remove-btn"
                  onClick={chip.onRemove}
                  aria-label={`${chip.label} を解除`}
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
          <button
            type="button"
            className="clear-all-filters-btn neo-reset-btn"
            onClick={handleClearAll}
          >
            [RESET // 全解除]
          </button>
        </div>
      )}

      {/* 2.5 種類区分 (CATEGORY // SPORT TYPE) */}
      <div className="filter-facet-group neo-facet-group">
        <div className="section-label-bar clickable" onClick={() => toggleSection('sportKind')}>
          <div className="label-left-group">
            <span className="section-dot" aria-hidden="true">■</span>
            <label className="facet-label neo-facet-label">
              種類区分 <span className="en-code">SPORT TYPE // 02</span>
            </label>
          </div>
          <button
            type="button"
            className="section-fold-btn"
            aria-label={collapsed.sportKind ? '種類区分を展開' : '種類区分を折りたたむ'}
          >
            {collapsed.sportKind ? '▼ 展開' : '▲ 閉じる'}
          </button>
        </div>

        {!collapsed.sportKind && (
          <>
            <div className="chips-container" role="radiogroup" aria-label="スポーツ種類選択">
              {SPORT_KINDS.map((sk) => {
                const isSelected = (filter.sportKind || 'soccer') === sk.id;
                return (
                  <button
                    key={sk.id}
                    type="button"
                    className={`filter-chip neo-chip sport-kind-chip ${isSelected ? 'selected' : ''} ${!sk.isAvailable ? 'chip-locked' : ''}`}
                    onClick={() => handleSportKindChange(sk.id)}
                    aria-checked={isSelected}
                    title={!sk.isAvailable ? `${sk.label}: [DATA LOCKED] は今後のアップデートで解除されます。` : sk.label}
                  >
                    <span className="chip-icon" aria-hidden="true">{sk.icon}</span>
                    <span className="chip-name">{sk.label}</span>
                    {isSelected && <span className="chip-check" aria-hidden="true"> ✓</span>}
                    {!sk.isAvailable && <span className="chip-lock-tag" aria-hidden="true"> [LOCKED]</span>}
                  </button>
                );
              })}
            </div>

            {filter.sportKind && filter.sportKind !== 'soccer' && (
              <div className="sport-locked-notice neo-locked-banner" role="status">
                <span className="notice-icon">🔒</span>
                <span>
                  [DATA LOCKED] 「{SPORT_KINDS.find((s) => s.id === filter.sportKind)?.label}」は今後のアップデートで解除されます。現在は「サッカー」セクターが稼働中です。
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {/* 3. リーグ区分 (LEAGUE SECTOR) */}
      <div className="filter-facet-group neo-facet-group">
        <div className="section-label-bar clickable" onClick={() => toggleSection('league')}>
          <div className="label-left-group">
            <span className="section-dot" aria-hidden="true">■</span>
            <label className="facet-label neo-facet-label">
              リーグ区分 <span className="en-code">LEAGUE SECTOR</span>
            </label>
          </div>
          <button
            type="button"
            className="section-fold-btn"
            aria-label={collapsed.league ? 'リーグ区分を展開' : 'リーグ区分を折りたたむ'}
          >
            {collapsed.league ? '▼ 展開' : '▲ 閉じる'}
          </button>
        </div>
        {!collapsed.league && (
          <div className="chips-container" role="radiogroup" aria-label="リーグ選択">
            {(['all', 'J1', 'J2', 'J3', 'other'] as const).map((l) => (
              <button
                key={l}
                type="button"
                className={`filter-chip neo-chip ${filter.league === l ? 'selected' : ''}`}
                onClick={() => handleLeagueChange(l)}
                aria-checked={filter.league === l}
              >
                {filter.league === l && <span className="chip-check" aria-hidden="true">✓ </span>}
                {l === 'all' ? 'ALL LEAGUES (60クラブ)' : l === 'other' ? 'GLOBAL / OTHER' : `${l} SECTOR (20クラブ)`}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 4. 地域・地方ブロック (GEOGRAPHIC REGION) */}
      <div className="filter-facet-group neo-facet-group">
        <div className="section-label-bar clickable" onClick={() => toggleSection('region')}>
          <div className="label-left-group">
            <span className="section-dot" aria-hidden="true">■</span>
            <label className="facet-label neo-facet-label">
              地域・地方ブロック <span className="en-code">GEOGRAPHIC REGION</span>
            </label>
          </div>
          <button
            type="button"
            className="section-fold-btn"
            aria-label={collapsed.region ? '地域・地方ブロックを展開' : '地域・地方ブロックを折りたたむ'}
          >
            {collapsed.region ? '▼ 展開' : '▲ 閉じる'}
          </button>
        </div>
        {!collapsed.region && (
          <div className="chips-container" role="radiogroup" aria-label="地域ブロック選択">
            <button
              type="button"
              className={`filter-chip neo-chip ${filter.region === 'all' ? 'selected' : ''}`}
              onClick={() => handleRegionChange('all')}
              aria-checked={filter.region === 'all'}
            >
              {filter.region === 'all' && <span className="chip-check" aria-hidden="true">✓ </span>}
              🗾 ALL JAPAN (全国すべて)
            </button>
            {REGION_BLOCKS.map((reg) => (
              <button
                key={reg.id}
                type="button"
                className={`filter-chip neo-chip ${filter.region === reg.id ? 'selected' : ''}`}
                onClick={() => handleRegionChange(reg.id)}
                aria-checked={filter.region === reg.id}
              >
                {filter.region === reg.id && <span className="chip-check" aria-hidden="true">✓ </span>}
                {reg.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 5. チーム（クラブ）フィルター (TARGET TEAMS // MULTI-SELECT) */}
      {currentAvailableClubs.length > 0 && (
        <div className="filter-facet-group neo-facet-group team-facet-group">
          <div className="facet-header-with-actions neo-facet-header-actions">
            <div className="section-label-bar clickable" onClick={() => toggleSection('clubs')}>
              <div className="label-left-group">
                <span className="section-dot" aria-hidden="true">■</span>
                <label className="facet-label neo-facet-label">
                  対象チーム <span className="en-code">TARGET CLUBS // {currentAvailableClubs.length} AVAILABLE</span>
                  <span className="facet-sub-note">
                    [ 選択中: {filter.clubs.length} ]
                  </span>
                </label>
              </div>
              <button
                type="button"
                className="section-fold-btn"
                aria-label={collapsed.clubs ? '対象チームを展開' : '対象チームを折りたたむ'}
              >
                {collapsed.clubs ? '▼ 展開' : '▲ 閉じる'}
              </button>
            </div>
            {!collapsed.clubs && (
              <div className="team-quick-actions">
                <button
                  type="button"
                  className="neo-action-mini-btn"
                  onClick={handleSelectAllClubs}
                >
                  [SELECT ALL]
                </button>
                {filter.clubs.length > 0 && (
                  <button
                    type="button"
                    className="neo-action-mini-btn clear-btn"
                    onClick={handleClearClubs}
                  >
                    [CLEAR]
                  </button>
                )}
              </div>
            )}
          </div>

          {!collapsed.clubs && (
            <div className="chips-container team-chips-scrollable neo-scrollable" aria-label="チーム選択">
              {currentAvailableClubs.map((club) => {
                const isSelected = filter.clubs.includes(club.name);
                return (
                  <button
                    key={club.name}
                    type="button"
                    className={`filter-chip neo-chip team-chip ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleToggleClub(club.name)}
                    aria-pressed={isSelected}
                  >
                    <span className="club-league-tag">{club.league}</span>
                    <span className="club-title">{club.name}</span>
                    {isSelected && <span className="chip-check" aria-hidden="true"> ✓</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 6. 難易度タグ (SECURITY / DIFFICULTY LEVEL) */}
      <div className="filter-facet-group neo-facet-group">
        <div className="section-label-bar clickable" onClick={() => toggleSection('difficulty')}>
          <div className="label-left-group">
            <span className="section-dot" aria-hidden="true">■</span>
            <label className="facet-label neo-facet-label">
              難易度レベル <span className="en-code">SECURITY // DIFFICULTY</span>
            </label>
          </div>
          <button
            type="button"
            className="section-fold-btn"
            aria-label={collapsed.difficulty ? '難易度レベルを展開' : '難易度レベルを折りたたむ'}
          >
            {collapsed.difficulty ? '▼ 展開' : '▲ 閉じる'}
          </button>
        </div>
        {!collapsed.difficulty && (
          <div className="chips-container" role="radiogroup" aria-label="難易度選択">
            {(['all', 'easy', 'medium', 'hard', 'expert'] as const).map((d) => (
              <button
                key={d}
                type="button"
                className={`filter-chip neo-chip diff-${d} ${filter.difficulty === d ? 'selected' : ''}`}
                onClick={() => handleDifficultyChange(d)}
                aria-checked={filter.difficulty === d}
              >
                {filter.difficulty === d && <span className="chip-check" aria-hidden="true">✓ </span>}
                {d === 'all'
                  ? 'ALL LEVELS (全難易度)'
                  : d === 'easy'
                  ? '🟢 LV.1 EASY (初級)'
                  : d === 'medium'
                  ? '🟡 LV.2 MEDIUM (中級)'
                  : d === 'hard'
                  ? '🟠 LV.3 HARD (上級)'
                  : '🟣 LV.4 EXPERT (激ムズ)'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 7. クイズテーマ・ジャンルタグ (TOPIC // THEME TAGS) */}
      <div className="filter-facet-group neo-facet-group">
        <div className="section-label-bar clickable" onClick={() => toggleSection('theme')}>
          <div className="label-left-group">
            <span className="section-dot" aria-hidden="true">■</span>
            <label className="facet-label neo-facet-label">
              クイズテーマ <span className="en-code">INTEL THEME TAGS</span>
            </label>
          </div>
          <button
            type="button"
            className="section-fold-btn"
            aria-label={collapsed.theme ? 'クイズテーマを展開' : 'クイズテーマを折りたたむ'}
          >
            {collapsed.theme ? '▼ 展開' : '▲ 閉じる'}
          </button>
        </div>
        {!collapsed.theme && (
          <div className="chips-container" aria-label="テーマ選択">
            {THEME_TAGS.map((theme) => {
              const isSelected = filter.themes.includes(theme.id);
              return (
                <button
                  key={theme.id}
                  type="button"
                  className={`filter-chip neo-chip ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleToggleTheme(theme.id)}
                  aria-pressed={isSelected}
                >
                  {isSelected && <span className="chip-check" aria-hidden="true">✓ </span>}
                  {theme.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 8. カテゴリ詳細 (DETAILED SPEC // DROPDOWN) */}
      <div className="filter-dropdown-row neo-dropdown-row">
        <div className="dropdown-field">
          <label htmlFor="filter-category-select" className="facet-label neo-facet-label">
            カテゴリ詳細 <span className="en-code">CATEGORY SPEC</span>:
          </label>
          <select
            id="filter-category-select"
            className="filter-select neo-select"
            value={filter.categoryId}
            onChange={(e) => handleCategoryChange(e.target.value)}
          >
            <option value="all">ALL CATEGORIES (すべてのカテゴリ)</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <div className="dropdown-field">
          <label htmlFor="filter-difficulty-select" className="facet-label neo-facet-label">
            難易度詳細 <span className="en-code">DIFFICULTY SPEC</span>:
          </label>
          <select
            id="filter-difficulty-select"
            className="filter-select neo-select"
            value={filter.difficulty}
            onChange={(e) => handleDifficultyChange(e.target.value as any)}
          >
            <option value="all">ALL LEVELS (すべての難易度)</option>
            <option value="easy">LV.1 EASY (初級)</option>
            <option value="medium">LV.2 MEDIUM (中級)</option>
            <option value="hard">LV.3 HARD (上級)</option>
            <option value="expert">LV.4 EXPERT (激ムズ)</option>
          </select>
        </div>
      </div>

      {/* 9. 該当件数リアルタイム表示バー (RADAR SCAN STATUS) */}
      <div className="filter-status-summary neo-radar-status">
        <div className="radar-status-info">
          <span className="radar-blip" aria-hidden="true"></span>
          <span className="match-count-badge">
            TARGETS LOCKED: <strong className="count-highlight">{matchCount}</strong> / {totalCount} UNITS
          </span>
        </div>
        {matchCount === 0 && (
          <span className="no-match-warning neo-warning-text">
            ⚠️ NO TARGETS DETECTED: 探査ターゲットが存在しません。条件を再設定してください。
          </span>
        )}
      </div>
    </div>
  );
};
