import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  DEFAULT_GAS_API_URL,
  getRankingApiUrl,
  setRankingApiUrl,
  getLastPlayerName,
  savePlayerName,
  getLocalRankings,
  fetchRankings,
  submitScore,
  deleteScore,
  updateScore,
  getPlayerUniqueId,
} from '../src/services/rankingService';

describe('世界ランキング サービス (rankingService)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('API URLの保存と取得ができること（初期値はデフォルトGAS URL）', () => {
    expect(getRankingApiUrl()).toBe(DEFAULT_GAS_API_URL);
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
    setRankingApiUrl('');
    const res = await fetchRankings();
    expect(res.isOnline).toBe(false);
    expect(Array.isArray(res.rankings)).toBe(true);
    expect(res.rankings.length).toBeGreaterThan(0);
  });

  it('API未設定時のスコア送信はローカル保存として成功すること', async () => {
    setRankingApiUrl('');
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

  it('端末固有のプレイヤーIDが取得・維持されること', () => {
    const id1 = getPlayerUniqueId();
    expect(id1.startsWith('PLY-')).toBe(true);
    const id2 = getPlayerUniqueId();
    expect(id2).toBe(id1);
  });

  it('deleteScore と updateScore がAPI未設定時に適切にエラー返却すること', async () => {
    setRankingApiUrl('');
    const delRes = await deleteScore('dummy-id');
    expect(delRes.success).toBe(false);

    const updRes = await updateScore({ id: 'dummy-id', playerName: '新名前' });
    expect(updRes.success).toBe(false);
  });

  it('同一プレイヤーのスコアが上位3件（ベスト3）までにフィルタリングされること', () => {
    // localStorage に同一プレイヤーの履歴を5件用意 (sakachizu_game_history_v1)
    const mockHistories = [
      { id: 'h1', totalScore: 30000, averageDistanceKm: 0.1, results: [{}], mode: { categoryName: '全般' }, playedAt: '2026-01-01' },
      { id: 'h2', totalScore: 28000, averageDistanceKm: 0.2, results: [{}], mode: { categoryName: '全般' }, playedAt: '2026-01-02' },
      { id: 'h3', totalScore: 25000, averageDistanceKm: 0.3, results: [{}], mode: { categoryName: '全般' }, playedAt: '2026-01-03' },
      { id: 'h4', totalScore: 20000, averageDistanceKm: 0.4, results: [{}], mode: { categoryName: '全般' }, playedAt: '2026-01-04' },
      { id: 'h5', totalScore: 15000, averageDistanceKm: 0.5, results: [{}], mode: { categoryName: '全般' }, playedAt: '2026-01-05' },
    ];
    localStorage.setItem('sakachizu_game_history_v1', JSON.stringify(mockHistories));

    const rankings = getLocalRankings(10, 'all');
    // 同一プレイヤー「あなた」は上位3件（30000, 28000, 25000）のみ抽出される
    const myScores = rankings.filter((r) => r.playerName === 'あなた');
    expect(myScores.length).toBe(3);
    expect(myScores[0].totalScore).toBe(30000);
    expect(myScores[1].totalScore).toBe(28000);
    expect(myScores[2].totalScore).toBe(25000);
  });
});

