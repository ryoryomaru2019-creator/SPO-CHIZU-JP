import { describe, it, expect } from 'vitest';
import questions from '../src/data/questions.json';
import categories from '../src/data/categories.json';
import { isValidCoordinates } from '../src/utils/coordinates';

describe('questions.json & categories.json', () => {
  it('カテゴリデータが配列であり、4つの基本カテゴリが存在すること', () => {
    expect(Array.isArray(categories)).toBe(true);
    expect(categories.length).toBeGreaterThanOrEqual(4);
    const ids = categories.map((c) => c.id);
    expect(ids).toContain('japan-stadium');
    expect(ids).toContain('jleague');
    expect(ids).toContain('national-team');
    expect(ids).toContain('world-stadium');
  });

  it('各問題が必要な新スキーマのフィールドを持ち、座標が有効な範囲内であること', () => {
    const validCategoryIds = new Set(categories.map((c) => c.id));

    questions.forEach((q) => {
      expect(q.id).toBeDefined();
      expect(typeof q.id).toBe('string');
      expect(q.title).toBeDefined();
      expect(q.question).toBeDefined();
      expect(q.hint).toBeDefined();
      expect(q.categoryId).toBeDefined();
      expect(validCategoryIds.has(q.categoryId)).toBe(true);
      expect(['easy', 'medium', 'hard', 'expert']).toContain(q.difficulty);
      expect(Array.isArray(q.tags)).toBe(true);
      expect(typeof q.isPublished).toBe('boolean');
      expect(q.answer).toBeDefined();
      expect(q.answer.name).toBeDefined();
      expect(typeof q.answer.latitude).toBe('number');
      expect(typeof q.answer.longitude).toBe('number');

      expect(isValidCoordinates(q.answer.latitude, q.answer.longitude)).toBe(true);
    });
  });

  it('パナソニック スタジアム 吹田の座標が万博記念競技場ではなく正しい吹田サッカースタジアムの位置（34.8026, 135.5383）であること', () => {
    const suitaQuestion = questions.find(
      (q) =>
        q.title.includes('パナソニックスタジアム吹田') ||
        q.answer.name.includes('Panasonic Stadium Suita')
    );
    expect(suitaQuestion).toBeDefined();
    expect(suitaQuestion?.answer.address).toContain('吹田市千里万博公園3-3');
    // 34.8026, 135.5383 (万博記念競技場の 34.8103, 135.5427 ではない)
    expect(suitaQuestion?.answer.latitude).toBeCloseTo(34.8026, 3);
    expect(suitaQuestion?.answer.longitude).toBeCloseTo(135.5383, 3);
  });
});
