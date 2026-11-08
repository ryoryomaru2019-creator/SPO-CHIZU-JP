import { describe, it, expect } from 'vitest';
import { selectRandomQuestions } from '../src/utils/questionSelection';
import { Question } from '../src/types/game';

const dummyQuestions: Question[] = [
  {
    id: 'q1',
    title: 'スタジアム1',
    question: 'Q1',
    hint: 'H1',
    categoryId: 'japan-stadium',
    difficulty: 'easy',
    tags: ['国内'],
    answer: { name: 'S1', latitude: 35.0, longitude: 139.0 },
    isPublished: true,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
  {
    id: 'q2',
    title: 'スタジアム2',
    question: 'Q2',
    hint: 'H2',
    categoryId: 'japan-stadium',
    difficulty: 'medium',
    tags: ['国内'],
    answer: { name: 'S2', latitude: 35.1, longitude: 139.1 },
    isPublished: true,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
  {
    id: 'q3',
    title: 'スタジアム3',
    question: 'Q3',
    hint: 'H3',
    categoryId: 'world-stadium',
    difficulty: 'easy',
    tags: ['海外'],
    answer: { name: 'S3', latitude: 51.0, longitude: 0.0 },
    isPublished: true,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
  {
    id: 'q4',
    title: 'スタジアム4 (非公開)',
    question: 'Q4',
    hint: 'H4',
    categoryId: 'japan-stadium',
    difficulty: 'easy',
    tags: ['非公開'],
    answer: { name: 'S4', latitude: 35.2, longitude: 139.2 },
    isPublished: false,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
  {
    id: 'q5',
    title: 'スタジアム5',
    question: 'Q5',
    hint: 'H5',
    categoryId: 'world-stadium',
    difficulty: 'hard',
    tags: ['海外'],
    answer: { name: 'S5', latitude: 40.0, longitude: 3.0 },
    isPublished: true,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
];

describe('ランダム出題 (questionSelection)', () => {
  it('指定した問題数になること', () => {
    const selected2 = selectRandomQuestions(dummyQuestions, { questionCount: 2 });
    expect(selected2.length).toBe(2);

    // 最大数より多く指定した場合は存在する公開問題数までに自動調整
    const selected10 = selectRandomQuestions(dummyQuestions, { questionCount: 10 });
    expect(selected10.length).toBe(4); // 公開問題4件
  });

  it('非公開問題が除外されること', () => {
    const allSelected = selectRandomQuestions(dummyQuestions, { questionCount: 'all' });
    const hasUnpublished = allSelected.some((q) => q.isPublished === false || q.id === 'q4');
    expect(hasUnpublished).toBe(false);
  });

  it('同一ゲーム内で重複しないこと', () => {
    const selected = selectRandomQuestions(dummyQuestions, { questionCount: 4, shuffle: true });
    const idSet = new Set(selected.map((q) => q.id));
    expect(idSet.size).toBe(selected.length);
  });

  it('カテゴリで絞り込めること', () => {
    const japanOnly = selectRandomQuestions(dummyQuestions, { categoryId: 'japan-stadium' });
    expect(japanOnly.every((q) => q.categoryId === 'japan-stadium')).toBe(true);
    expect(japanOnly.length).toBe(2); // q1, q2 (q4は非公開)

    const worldOnly = selectRandomQuestions(dummyQuestions, { categoryId: 'world-stadium' });
    expect(worldOnly.every((q) => q.categoryId === 'world-stadium')).toBe(true);
    expect(worldOnly.length).toBe(2); // q3, q5
  });

  it('難易度で絞り込めること', () => {
    const easyOnly = selectRandomQuestions(dummyQuestions, { difficulty: 'easy' });
    expect(easyOnly.every((q) => q.difficulty === 'easy')).toBe(true);
    expect(easyOnly.map((q) => q.id).sort()).toEqual(['q1', 'q3']);
  });

  it('カテゴリ未選択（all）時は全件対象になること', () => {
    const allCategories = selectRandomQuestions(dummyQuestions, {
      categoryId: 'all',
      difficulty: 'all',
      questionCount: 'all',
    });
    expect(allCategories.length).toBe(4); // q1, q2, q3, q5
  });

  it('存在しないカテゴリを指定した場合は空配列になること', () => {
    const none = selectRandomQuestions(dummyQuestions, { categoryId: 'non-existent' });
    expect(none.length).toBe(0);
  });
});

