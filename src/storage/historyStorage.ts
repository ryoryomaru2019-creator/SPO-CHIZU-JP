import { GameHistory } from '../types/game';

export const GAME_HISTORY_STORAGE_KEY = 'sakachizu_game_history_v1';

/**
 * プレイ履歴の全取得
 */
export function getHistories(): GameHistory[] {
  try {
    const raw = localStorage.getItem(GAME_HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.sort((a, b) => new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime());
    }
  } catch (err) {
    console.warn('履歴の読み込みに失敗しました（空配列を返します）:', err);
  }
  return [];
}

/**
 * プレイ履歴の1件保存
 */
export function saveHistory(history: GameHistory): boolean {
  try {
    const current = getHistories();
    const updated = [history, ...current];
    // 最大保存件数を100件に制限
    const trimmed = updated.slice(0, 100);
    localStorage.setItem(GAME_HISTORY_STORAGE_KEY, JSON.stringify(trimmed));
    return true;
  } catch (err) {
    console.warn('履歴の保存に失敗しました:', err);
    return false;
  }
}

/**
 * 個別の履歴削除
 */
export function deleteHistory(id: string): GameHistory[] {
  try {
    const current = getHistories();
    const updated = current.filter((h) => h.id !== id);
    localStorage.setItem(GAME_HISTORY_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.warn('履歴の削除に失敗しました:', err);
    return getHistories();
  }
}

/**
 * すべての履歴を削除
 */
export function clearAllHistories(): boolean {
  try {
    localStorage.removeItem(GAME_HISTORY_STORAGE_KEY);
    return true;
  } catch (err) {
    console.warn('全履歴の削除に失敗しました:', err);
    return false;
  }
}

