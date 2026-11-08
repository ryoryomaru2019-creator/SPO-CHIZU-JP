import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getRankingApiUrl,
  setRankingApiUrl,
  getLastPlayerName,
  savePlayerName,
  getLocalRankings,
  fetchRankings,
  submitScore,
} from '../src/services/rankingService';

describe('世界ランキング サービス (rankingService)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('API URLの保存と取得ができること', () => {
    expect(getRankingApiUrl()).toBe('');
    setRankingApiUrl('https://script.google.com/macros/s/test/exec');
    expect(getRankingApiUrl()).toBe('https://script.google.com/macros/s/test/exec');
  });

  it('プレイヤー名の保存と取得ができること', () => {
    expect(getLastPlayerName()).toBe('サポーター');
    savePlayerName('レッズサポ');
    expect(getLastPlayerName()).toBe('レッズサポ');
  });

  it('ローカルランキングが生成されること', () => {
    const list = getLocalRankings(5);
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThan(0);
    expect(list[0].rank).toBe(1);
    expect(typeof list[0].totalScore).toBe('number');
  });

  it('API未設定時はローカルフォールバックでランキング取得されること', async () => {
    const res = await fetchRankings();
    expect(res.isOnline).toBe(false);
    expect(Array.isArray(res.rankings)).toBe(true);
    expect(res.rankings.length).toBeGreaterThan(0);
  });

  it('API未設定時のスコア送信はローカル保存として成功すること', async () => {
    const res = await submitScore({
      playerName: 'テスト選手',
      totalScore: 5000,
      totalDistanceKm: 1.5,
      avgTimeFormatted: '00分10秒',
      questionCount: 5,
    });

    expect(res.success).toBe(true);
    expect(res.isOnline).toBe(false);
    expect(getLastPlayerName()).toBe('テスト選手');
  });
});

