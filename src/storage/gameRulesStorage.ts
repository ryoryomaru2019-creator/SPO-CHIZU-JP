import { GameRules, DEFAULT_GAME_RULES } from '../types/rules';

const RULES_STORAGE_KEY = 'sakachizu_game_rules_v1';

export function getGameRules(): GameRules {
  if (typeof window === 'undefined') return { ...DEFAULT_GAME_RULES };
  try {
    const saved = localStorage.getItem(RULES_STORAGE_KEY);
    if (!saved) return { ...DEFAULT_GAME_RULES };
    const parsed = JSON.parse(saved);
    return {
      maxTimeBonus:
        typeof parsed.maxTimeBonus === 'number' && parsed.maxTimeBonus >= 0
          ? parsed.maxTimeBonus
          : DEFAULT_GAME_RULES.maxTimeBonus,
      bonusDecaySeconds:
        typeof parsed.bonusDecaySeconds === 'number' && parsed.bonusDecaySeconds > 0
          ? parsed.bonusDecaySeconds
          : DEFAULT_GAME_RULES.bonusDecaySeconds,
      timeLimitSeconds:
        typeof parsed.timeLimitSeconds === 'number' && parsed.timeLimitSeconds >= 0
          ? parsed.timeLimitSeconds
          : DEFAULT_GAME_RULES.timeLimitSeconds,

      maxDistanceScore:
        typeof parsed.maxDistanceScore === 'number' && parsed.maxDistanceScore > 0
          ? parsed.maxDistanceScore
          : DEFAULT_GAME_RULES.maxDistanceScore,
      perfectDistanceKm:
        typeof parsed.perfectDistanceKm === 'number' && parsed.perfectDistanceKm >= 0
          ? parsed.perfectDistanceKm
          : DEFAULT_GAME_RULES.perfectDistanceKm,
      zeroScoreDistanceKm:
        typeof parsed.zeroScoreDistanceKm === 'number' && parsed.zeroScoreDistanceKm > 0
          ? parsed.zeroScoreDistanceKm
          : DEFAULT_GAME_RULES.zeroScoreDistanceKm,

      allowPan: parsed.allowPan !== false,
      allowZoom: parsed.allowZoom !== false,
      allowHints: parsed.allowHints !== false,
      difficultyMultiplier: Boolean(parsed.difficultyMultiplier),
    };
  } catch (e) {
    console.warn('ゲームルールの読み込みに失敗しました（デフォルトを使用）:', e);
    return { ...DEFAULT_GAME_RULES };
  }
}

export function saveGameRules(rules: GameRules): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(RULES_STORAGE_KEY, JSON.stringify(rules));
  } catch (e) {
    console.error('ゲームルールの保存に失敗しました:', e);
  }
}

export function resetGameRules(): GameRules {
  if (typeof window === 'undefined') return { ...DEFAULT_GAME_RULES };
  try {
    localStorage.removeItem(RULES_STORAGE_KEY);
  } catch (e) {
    console.error('ゲームルールのリセットに失敗しました:', e);
  }
  return { ...DEFAULT_GAME_RULES };
}

