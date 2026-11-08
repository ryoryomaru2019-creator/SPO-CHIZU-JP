import { describe, it, expect, beforeEach } from 'vitest';
import {
  getGameRules,
  saveGameRules,
  resetGameRules,
} from '../src/storage/gameRulesStorage';
import { DEFAULT_GAME_RULES, GameRules } from '../src/types/rules';
import { calculateDistanceScore, calculateTimeBonus, calculateScoreBreakdown } from '../src/utils/score';

describe('ゲームルール & パラメータ設定 (gameRulesStorage)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('初期状態ではデフォルトのゲームルールが取得できること', () => {
    const rules = getGameRules();
    expect(rules).toEqual(DEFAULT_GAME_RULES);
    expect(rules.maxTimeBonus).toBe(1000);
    expect(rules.maxDistanceScore).toBe(5000);
    expect(rules.allowPan).toBe(true);
    expect(rules.allowZoom).toBe(true);
  });

  it('ルールを保存して再取得できること', () => {
    const customRules: GameRules = {
      maxTimeBonus: 2000,
      bonusDecaySeconds: 45,
      timeLimitSeconds: 60,
      maxDistanceScore: 8000,
      perfectDistanceKm: 0.5,
      zeroScoreDistanceKm: 100,
      allowPan: false,
      allowZoom: false,
      allowHints: false,
      difficultyMultiplier: true,
      scoreCardPulseSpeed: 3.0,
      scoreCardBorderColor: '#00E5FF',
      highScoreThreshold: 4500,
      highScoreBgColor: '#00e5ff33',
    };

    saveGameRules(customRules);
    const retrieved = getGameRules();
    expect(retrieved).toEqual(customRules);
  });

  it('リセットするとデフォルト値に戻ること', () => {
    saveGameRules({
      ...DEFAULT_GAME_RULES,
      maxTimeBonus: 3000,
      allowPan: false,
    });
    expect(getGameRules().maxTimeBonus).toBe(3000);

    const reset = resetGameRules();
    expect(reset).toEqual(DEFAULT_GAME_RULES);
    expect(getGameRules().maxTimeBonus).toBe(1000);
  });

  it('カスタムルールがスコア計算に反映されること', () => {
    const customRules: GameRules = {
      ...DEFAULT_GAME_RULES,
      maxTimeBonus: 2000,
      bonusDecaySeconds: 30,
      maxDistanceScore: 10000,
      perfectDistanceKm: 0.5,
      zeroScoreDistanceKm: 200,
    };

    // 満点許容距離 (0.5km以内) で満点10,000点
    expect(calculateDistanceScore(0.3, customRules)).toBe(10000);
    // タイムボーナス (5秒以内で満点2,000点)
    expect(calculateTimeBonus(2000, customRules)).toBe(2000);
    // 30秒でボーナス0点
    expect(calculateTimeBonus(30000, customRules)).toBe(0);
  });

  it('難易度倍率が有効な場合、正しくスコアに乗算されること', () => {
    const multiplierRules: GameRules = {
      ...DEFAULT_GAME_RULES,
      difficultyMultiplier: true,
    };

    // 上級（1.5倍）
    const breakdownHard = calculateScoreBreakdown(0.05, 3000, 'hard', multiplierRules);
    expect(breakdownHard.distanceScore).toBe(7500); // 5000 * 1.5
    expect(breakdownHard.timeBonus).toBe(1500);     // 1000 * 1.5
    expect(breakdownHard.totalScore).toBe(9000);
  });
});

