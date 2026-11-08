import { GameMode, MapDisplaySettings } from '../types/game';

export const MAP_SETTINGS_STORAGE_KEY = 'sakachizu_map_settings_v1';
export const MODE_SETTINGS_STORAGE_KEY = 'sakachizu_game_mode_settings_v1';

export const DEFAULT_MAP_SETTINGS: MapDisplaySettings = {
  dimEnabled: true,
  targetEnabled: true,
  dimIntensity: 0.35,
  pinMode: 'single',
  mapLanguage: 'ja',
};

export const DEFAULT_GAME_MODE: GameMode = {
  categoryId: 'all',
  difficulty: 'all',
  questionCount: 5,
  shuffle: true,
};

/**
 * 地図表示設定の取得
 */
export function getMapDisplaySettings(): MapDisplaySettings {
  try {
    const raw = localStorage.getItem(MAP_SETTINGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_MAP_SETTINGS,
        ...parsed,
      };
    }
  } catch (e) {
    console.warn('地図設定の読み込みに失敗しました:', e);
  }
  return DEFAULT_MAP_SETTINGS;
}

/**
 * 地図表示設定の保存
 */
export function saveMapDisplaySettings(settings: Partial<MapDisplaySettings>): MapDisplaySettings {
  const current = getMapDisplaySettings();
  const updated = { ...current, ...settings };
  try {
    localStorage.setItem(MAP_SETTINGS_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('地図設定の保存に失敗しました:', e);
  }
  return updated;
}

/**
 * 前回ゲームモード設定の取得
 */
export function getGameModeSettings(): GameMode {
  try {
    const raw = localStorage.getItem(MODE_SETTINGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_GAME_MODE,
        ...parsed,
      };
    }
  } catch (e) {
    console.warn('ゲームモード設定の読み込みに失敗しました:', e);
  }
  return DEFAULT_GAME_MODE;
}

/**
 * 前回ゲームモード設定の保存
 */
export function saveGameModeSettings(settings: Partial<GameMode>): GameMode {
  const current = getGameModeSettings();
  const updated = { ...current, ...settings };
  try {
    localStorage.setItem(MODE_SETTINGS_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('ゲームモード設定の保存に失敗しました:', e);
  }
  return updated;
}

