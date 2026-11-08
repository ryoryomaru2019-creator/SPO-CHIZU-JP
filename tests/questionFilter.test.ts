import { describe, it, expect } from 'vitest';
import {
  getQuestionRegion,
  getQuestionLeague,
  getAvailableClubs,
  filterQuestions,
  INITIAL_FILTER_STATE,
  AdvancedFilterState,
} from '../src/utils/questionFilter';
import { Question } from '../src/types/game';

const dummyQuestions: Question[] = [
  {
    id: 'q-kashima',
    title: '鹿島アントラーズのホーム',
    question: 'カシマサッカースタジアムはどこ？',
    hint: '茨城県鹿嶋市',
    categoryId: 'jleague',
    difficulty: 'medium',
    tags: ['Jリーグ', 'J1', '鹿島アントラーズ', '茨城県'],
    answer: {
      name: '県立カシマサッカースタジアム',
      address: '茨城県鹿嶋市神向寺後山26-2',
      latitude: 35.9918,
      longitude: 140.6433,
    },
    isPublished: true,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
  {
    id: 'q-sapporo',
    title: '北海道コンサドーレ札幌のホーム',
    question: '札幌ドームはどこ？',
    hint: '北海道札幌市',
    categoryId: 'jleague',
    difficulty: 'easy',
    tags: ['Jリーグ', 'J2', '北海道コンサドーレ札幌', '北海道'],
    answer: {
      name: '大和ハウス プレミストドーム',
      address: '北海道札幌市豊平区羊ケ丘1',
      latitude: 43.0151,
      longitude: 141.4097,
    },
    isPublished: true,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
  {
    id: 'q-campnou',
    title: 'FCバルセロナのカンプノウ',
    question: 'カンプ・ノウはどこ？',
    hint: 'スペイン・バルセロナ',
    categoryId: 'world-stadium',
    difficulty: 'hard',
    tags: ['海外', 'スペイン', 'バルセロナ'],
    answer: {
      name: 'カンプ・ノウ',
      address: 'C/ d\'Arístides Maillol, 12, 08028 Barcelona, Spain',
      latitude: 41.3809,
      longitude: 2.1228,
    },
    isPublished: true,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
];

describe('Unisearch風 絞り込みフィルター (questionFilter)', () => {
  it('地域ブロックが正しく判定されること', () => {
    expect(getQuestionRegion(dummyQuestions[0])).toBe('kanto');
    expect(getQuestionRegion(dummyQuestions[1])).toBe('hokkaido-tohoku');
    expect(getQuestionRegion(dummyQuestions[2])).toBe('overseas');
  });

  it('リーグが正しく判定されること', () => {
    expect(getQuestionLeague(dummyQuestions[0])).toBe('J1');
    expect(getQuestionLeague(dummyQuestions[1])).toBe('J2');
    expect(getQuestionLeague(dummyQuestions[2])).toBe('other');
  });

  it('キーワード検索で絞り込めること', () => {
    const filter: AdvancedFilterState = {
      ...INITIAL_FILTER_STATE,
      keyword: '鹿島',
    };
    const result = filterQuestions(dummyQuestions, filter);
    expect(result.length).toBe(1);
    expect(result[0].id).toBe('q-kashima');
  });

  it('地域ブロックで絞り込めること', () => {
    const filter: AdvancedFilterState = {
      ...INITIAL_FILTER_STATE,
      region: 'hokkaido-tohoku',
    };
    const result = filterQuestions(dummyQuestions, filter);
    expect(result.length).toBe(1);
    expect(result[0].id).toBe('q-sapporo');
  });

  it('リーグ区分で絞り込めること', () => {
    const filter: AdvancedFilterState = {
      ...INITIAL_FILTER_STATE,
      league: 'J2',
    };
    const result = filterQuestions(dummyQuestions, filter);
    expect(result.length).toBe(1);
    expect(result[0].id).toBe('q-sapporo');
  });

  it('リーグや地域に連動して利用可能なチーム一覧を取得できること', () => {
    const j1Clubs = getAvailableClubs('J1', 'all');
    expect(j1Clubs.length).toBe(20);
    expect(j1Clubs.some((c) => c.name === '鹿島アントラーズ')).toBe(true);

    const kantoJ1Clubs = getAvailableClubs('J1', 'kanto');
    expect(kantoJ1Clubs.length).toBe(10);

    const tohokuJ2Clubs = getAvailableClubs('J2', 'hokkaido-tohoku');
    expect(tohokuJ2Clubs.some((c) => c.name === '北海道コンサドーレ札幌')).toBe(true);
  });

  it('チーム複数選択フィルターで正しく絞り込めること', () => {
    const filter: AdvancedFilterState = {
      ...INITIAL_FILTER_STATE,
      clubs: ['鹿島アントラーズ'],
    };
    const result = filterQuestions(dummyQuestions, filter);
    expect(result.length).toBe(1);
    expect(result[0].id).toBe('q-kashima');
  });

  it('ジャンル区分でスポーツ以外のジャンル選択時は未実装として空配列を返すこと', () => {
    const filter: AdvancedFilterState = {
      ...INITIAL_FILTER_STATE,
      genre: 'entertainment',
    };
    const result = filterQuestions(dummyQuestions, filter);
    expect(result.length).toBe(0);
  });

  it('条件が複合した場合に正しくAND検索されること', () => {
    const filter: AdvancedFilterState = {
      ...INITIAL_FILTER_STATE,
      league: 'J1',
      difficulty: 'medium',
      region: 'kanto',
    };
    const result = filterQuestions(dummyQuestions, filter);
    expect(result.length).toBe(1);
    expect(result[0].id).toBe('q-kashima');
  });
});
