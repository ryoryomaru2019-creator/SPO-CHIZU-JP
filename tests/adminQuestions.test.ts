import { describe, it, expect, beforeEach } from 'vitest';
import {
  addQuestion,
  deleteQuestion,
  duplicateQuestion,
  exportQuestionsJson,
  getStoredQuestions,
  importQuestionsJson,
  resetStoredQuestions,
  togglePublishStatus,
  updateQuestion,
} from '../src/storage/questionStorage';
import { Question } from '../src/types/game';
import { isValidCoordinates } from '../src/utils/coordinates';

describe('問題管理 (Admin Questions)', () => {
  beforeEach(() => {
    localStorage.clear();
    resetStoredQuestions();
  });

  it('問題の新規作成ができること', () => {
    const initialList = getStoredQuestions();
    const newQuestionData = {
      title: 'テスト新スタジアム',
      question: '新しく建設されたスタジアムはどこでしょうか？',
      hint: 'テストヒント',
      categoryId: 'japan-stadium',
      difficulty: 'easy' as const,
      tags: ['テスト', '新設'],
      answer: {
        name: 'ピースタ (PEACE STADIUM Connected by SoftBank)',
        address: '長崎県長崎市幸町',
        latitude: 32.7533,
        longitude: 129.8667,
      },
      isPublished: true,
    };

    const updated = addQuestion(newQuestionData);
    expect(updated.length).toBe(initialList.length + 1);

    const created = updated[0];
    expect(created.id).toBeDefined();
    expect(created.title).toBe('テスト新スタジアム');
    expect(created.answer.latitude).toBe(32.7533);
    expect(created.isPublished).toBe(true);
  });

  it('問題の編集ができること', () => {
    const questions = getStoredQuestions();
    const target = questions[0];

    const edited: Question = {
      ...target,
      title: '更新されたタイトル',
      answer: {
        ...target.answer,
        name: '更新された会場名',
      },
    };

    const updated = updateQuestion(edited);
    const found = updated.find((q) => q.id === target.id);
    expect(found?.title).toBe('更新されたタイトル');
    expect(found?.answer.name).toBe('更新された会場名');
  });

  it('問題の削除ができること', () => {
    const questions = getStoredQuestions();
    const targetId = questions[0].id;
    const initialLen = questions.length;

    const updated = deleteQuestion(targetId);
    expect(updated.length).toBe(initialLen - 1);
    expect(updated.find((q) => q.id === targetId)).toBeUndefined();
  });

  it('問題の複製ができること', () => {
    const questions = getStoredQuestions();
    const target = questions[0];

    const updated = duplicateQuestion(target.id);
    expect(updated.length).toBe(questions.length + 1);

    const duplicated = updated[0];
    expect(duplicated.id).not.toBe(target.id);
    expect(duplicated.title).toContain(target.title);
    expect(duplicated.title).toContain('コピー');
    expect(duplicated.answer.latitude).toBe(target.answer.latitude);
  });

  it('公開・非公開の切り替えができること', () => {
    const questions = getStoredQuestions();
    const target = questions[0];
    const originalStatus = target.isPublished;

    const updated = togglePublishStatus(target.id);
    const toggled = updated.find((q) => q.id === target.id);
    expect(toggled?.isPublished).toBe(!originalStatus);
  });

  it('不正な座標の拒否・検証ができること', () => {
    // 緯度 > 90
    expect(isValidCoordinates(91.0, 135.0)).toBe(false);
    // 緯度 < -90
    expect(isValidCoordinates(-90.1, 135.0)).toBe(false);
    // 経度 > 180
    expect(isValidCoordinates(35.0, 180.5)).toBe(false);
    // 経度 < -180
    expect(isValidCoordinates(35.0, -181.0)).toBe(false);
    // NaN
    expect(isValidCoordinates(NaN, 135.0)).toBe(false);
    expect(isValidCoordinates(35.0, NaN)).toBe(false);
    // 正常値
    expect(isValidCoordinates(34.8026, 135.5383)).toBe(true);
  });

  it('JSONエクスポートとインポートが正常に動作すること', () => {
    const questions = getStoredQuestions();
    const exportedJson = exportQuestionsJson(questions);
    expect(typeof exportedJson).toBe('string');
    expect(exportedJson).toContain('Panasonic Stadium Suita');

    // インポート
    const result = importQuestionsJson(exportedJson);
    expect(result.success).toBe(true);
    expect(result.questions?.length).toBe(questions.length);

    // 不正なJSONのインポート拒否
    const invalidResult = importQuestionsJson('{"invalid": true}');
    expect(invalidResult.success).toBe(false);
    expect(invalidResult.error).toBeDefined();
  });
});
