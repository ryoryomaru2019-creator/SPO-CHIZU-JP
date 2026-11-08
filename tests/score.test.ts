import { describe, it, expect } from 'vitest';
import {
  calculateScore,
  calculateDistanceScore,
  calculateTimeBonus,
  calculateScoreBreakdown,
} from '../src/utils/score';

describe('score utils', () => {
  it('100m以内(0.1km以内)で満点5000点になること', () => {
    expect(calculateDistanceScore(0)).toBe(5000);
    expect(calculateScore(0)).toBe(5000);
    expect(calculateScore(0.05)).toBe(5000);
    expect(calculateScore(0.1)).toBe(5000);
  });

  it('1km以内で4000点以上5000点未満になること', () => {
    const score = calculateScore(0.5);
    expect(score).toBeGreaterThanOrEqual(4000);
    expect(score).toBeLessThanOrEqual(5000);
    expect(calculateScore(1.0)).toBe(4000);
  });

  it('10km以内で2000点以上4000点未満になること', () => {
    const score = calculateScore(5.0);
    expect(score).toBeGreaterThanOrEqual(2000);
    expect(score).toBeLessThanOrEqual(4000);
    expect(calculateScore(10.0)).toBe(2000);
  });

  it('50km以内で500点以上2000点未満になること', () => {
    const score = calculateScore(25.0);
    expect(score).toBeGreaterThanOrEqual(500);
    expect(score).toBeLessThanOrEqual(2000);
    expect(calculateScore(50.0)).toBe(500);
  });

  it('50km超で0点になること', () => {
    expect(calculateScore(50.1)).toBe(0);
    expect(calculateScore(100)).toBe(0);
    expect(calculateScore(1000)).toBe(0);
  });

  describe('タイムボーナス計算', () => {
    it('5秒以内(<= 5000ms)で満点1000点ボーナスが付与されること', () => {
      expect(calculateTimeBonus(1000)).toBe(1000);
      expect(calculateTimeBonus(4999)).toBe(1000);
      expect(calculateTimeBonus(5000)).toBe(1000);
    });

    it('5秒〜60秒で時間に応じて減衰すること', () => {
      const bonus30s = calculateTimeBonus(32500);
      expect(bonus30s).toBeGreaterThan(450);
      expect(bonus30s).toBeLessThan(550);
    });

    it('60秒以上でタイムボーナスが0点になること', () => {
      expect(calculateTimeBonus(60000)).toBe(0);
      expect(calculateTimeBonus(120000)).toBe(0);
    });

    it('距離スコアと合算され、ブレークダウンが正しく返ること', () => {
      const breakdown = calculateScoreBreakdown(0.05, 3000);
      expect(breakdown.distanceScore).toBe(5000);
      expect(breakdown.timeBonus).toBe(1000);
      expect(breakdown.totalScore).toBe(6000);

      const scoreWithTime = calculateScore(0.05, 3000);
      expect(scoreWithTime).toBe(6000);
    });
  });
});
