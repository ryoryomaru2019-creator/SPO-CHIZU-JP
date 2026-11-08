import { GameRules } from '../types/rules';
import { getGameRules } from '../storage/gameRulesStorage';

/**
 * スコア計算のデフォルト区間設定
 */
interface ScoreTier {
  maxDistanceKm: number;
  minScore: number;
  maxScore: number;
}

const SCORE_TIERS: ScoreTier[] = [
  { maxDistanceKm: 0.1, minScore: 5000, maxScore: 5000 },   // 100m以内: 5000点
  { maxDistanceKm: 1.0, minScore: 4000, maxScore: 5000 },   // 1km以内: 4000点以上
  { maxDistanceKm: 10.0, minScore: 2000, maxScore: 4000 },  // 10km以内: 2000点以上
  { maxDistanceKm: 50.0, minScore: 500, maxScore: 2000 },   // 50km以内: 500点以上
];

/**
 * 誤差距離(km)から距離スコアを算出します。
 * ゲームルール（GameRules）のパラメータが指定されている場合はそちらを優先します。
 */
export function calculateDistanceScore(distanceKm: number, customRules?: GameRules): number {
  if (distanceKm < 0) {
    return 0;
  }

  const rules = customRules || getGameRules();

  // 満点許容距離以内
  if (distanceKm <= rules.perfectDistanceKm) {
    return rules.maxDistanceScore;
  }

  // 0点距離超
  if (distanceKm > rules.zeroScoreDistanceKm) {
    return 0;
  }

  // デフォルト設定（5000点 / 100m / 50km）の場合は従来の4区分テーブルで精密計算
  if (
    rules.maxDistanceScore === 5000 &&
    rules.perfectDistanceKm === 0.1 &&
    rules.zeroScoreDistanceKm === 50
  ) {
    let prevMaxDistance = SCORE_TIERS[0].maxDistanceKm;
    for (let i = 1; i < SCORE_TIERS.length; i++) {
      const tier = SCORE_TIERS[i];
      if (distanceKm <= tier.maxDistanceKm) {
        const range = tier.maxDistanceKm - prevMaxDistance;
        const progress = (distanceKm - prevMaxDistance) / range;
        const score = tier.maxScore - progress * (tier.maxScore - tier.minScore);
        return Math.round(score);
      }
      prevMaxDistance = tier.maxDistanceKm;
    }
    return 0;
  }

  // 管理画面でカスタマイズされた任意パラメータの場合
  // 許容距離を超えた部分からzeroScoreDistanceKmまで線形・減衰でスコア配分
  const remainingDist = distanceKm - rules.perfectDistanceKm;
  const totalRange = rules.zeroScoreDistanceKm - rules.perfectDistanceKm;
  const progress = Math.min(1, Math.max(0, remainingDist / totalRange));
  // 緩やかなカーブ（1 - progress^0.7）
  const score = rules.maxDistanceScore * (1 - Math.pow(progress, 0.7));
  return Math.max(0, Math.min(rules.maxDistanceScore, Math.round(score)));
}

/**
 * 経過時間(ミリ秒)に応じたタイムボーナスを算出します。
 * 早いほど高得点:
 * - 5秒以内 (<= 5,000ms): 最大満点ボーナス
 * - 5秒〜bonusDecaySeconds: 時間経過に比例して減衰 (maxTimeBonus -> 0点)
 * - bonusDecaySeconds超: 0点 (減点はなし)
 */
export function calculateTimeBonus(elapsedMs: number, customRules?: GameRules): number {
  const rules = customRules || getGameRules();
  if (elapsedMs <= 0 || rules.maxTimeBonus <= 0) return 0;

  const graceMs = 5000; // 5秒の猶予時間
  const decayMs = Math.max(graceMs + 1000, rules.bonusDecaySeconds * 1000);

  if (elapsedMs <= graceMs) {
    return rules.maxTimeBonus;
  }
  if (elapsedMs >= decayMs) {
    return 0;
  }
  const ratio = (decayMs - elapsedMs) / (decayMs - graceMs);
  return Math.max(0, Math.round(rules.maxTimeBonus * ratio));
}

/**
 * 誤差距離(km)および経過時間(ms)から獲得スコアを算出します。
 */
export function calculateScore(
  distanceKm: number,
  elapsedMs?: number,
  customRules?: GameRules
): number {
  const distScore = calculateDistanceScore(distanceKm, customRules);
  const timeBonus = elapsedMs !== undefined ? calculateTimeBonus(elapsedMs, customRules) : 0;
  return distScore + timeBonus;
}

/**
 * スコア内訳（距離スコア・タイムボーナス・難易度倍率・合計）を返します。
 */
export function calculateScoreBreakdown(
  distanceKm: number,
  elapsedMs: number = 0,
  difficulty?: string,
  customRules?: GameRules
) {
  const rules = customRules || getGameRules();
  let distanceScore = calculateDistanceScore(distanceKm, rules);
  let timeBonus = calculateTimeBonus(elapsedMs, rules);

  if (rules.difficultyMultiplier && difficulty) {
    let multiplier = 1.0;
    if (difficulty === 'medium') multiplier = 1.2;
    if (difficulty === 'hard') multiplier = 1.5;
    distanceScore = Math.round(distanceScore * multiplier);
    timeBonus = Math.round(timeBonus * multiplier);
  }

  return {
    distanceScore,
    timeBonus,
    totalScore: distanceScore + timeBonus,
  };
}
