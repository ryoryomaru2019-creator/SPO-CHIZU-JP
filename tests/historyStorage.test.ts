import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  clearAllHistories,
  deleteHistory,
  getHistories,
  saveHistory,
} from '../src/storage/historyStorage';
import { GameHistory } from '../src/types/game';

describe('結果履歴 (historyStorage)', () => {
  const dummyHistory: GameHistory = {
    id: 'hist-001',
    playedAt: '2026-01-01T12:00:00.000Z',
    mode: {
      categoryId: 'japan-stadium',
      categoryName: '日本のスタジアム',
      difficulty: 'medium',
      questionCount: 5,
    },
    totalScore: 18450,
    averageDistanceKm: 4.2,
    correctCount: 3,
    results: [
      {
        questionId: 'q001',
        questionTitle: 'パナソニックスタジアム吹田',
        stadiumName: 'Panasonic Stadium Suita',
        answerLatitude: 34.7000,
        answerLongitude: 135.5000,
        correctLatitude: 34.8026,
        correctLongitude: 135.5383,
        distanceKm: 12.4,
        score: 1200,
      },
    ],
  };

  beforeEach(() => {
    localStorage.clear();
  });

  it('ゲーム結果が正常に保存されること', () => {
    const success = saveHistory(dummyHistory);
    expect(success).toBe(true);

    const list = getHistories();
    expect(list.length).toBe(1);
    expect(list[0].id).toBe('hist-001');
    expect(list[0].totalScore).toBe(18450);
  });

  it('詳細結果が含まれて取得できること', () => {
    saveHistory(dummyHistory);
    const list = getHistories();
    const item = list[0];

    expect(item.results.length).toBe(1);
    expect(item.results[0].questionTitle).toBe('パナソニックスタジアム吹田');
    expect(item.results[0].correctLatitude).toBe(34.8026);
    expect(item.results[0].distanceKm).toBe(12.4);
  });

  it('個別履歴を削除できること', () => {
    saveHistory(dummyHistory);
    saveHistory({ ...dummyHistory, id: 'hist-002' });

    expect(getHistories().length).toBe(2);

    const updated = deleteHistory('hist-001');
    expect(updated.length).toBe(1);
    expect(updated[0].id).toBe('hist-002');
  });

  it('全履歴を削除できること', () => {
    saveHistory(dummyHistory);
    saveHistory({ ...dummyHistory, id: 'hist-002' });
    expect(getHistories().length).toBe(2);

    const success = clearAllHistories();
    expect(success).toBe(true);
    expect(getHistories().length).toBe(0);
  });

  it('localStorageが利用できない場合（例外スロー）でも安全にフォールバックすること', () => {
    // localStorage.getItemでエラーを擬似的に発生
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('QuotaExceeded or SecurityError');
    });

    expect(() => getHistories()).not.toThrow();
    expect(getHistories()).toEqual([]);

    getItemSpy.mockRestore();

    // localStorage.setItemでエラーを擬似的に発生
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('PrivateBrowsingStorageDisabled');
    });

    expect(() => saveHistory(dummyHistory)).not.toThrow();
    const result = saveHistory(dummyHistory);
    expect(result).toBe(false);

    setItemSpy.mockRestore();
  });
});

