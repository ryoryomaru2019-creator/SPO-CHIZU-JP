import { Difficulty, Question } from '../types/game';

export interface SelectQuestionsOptions {
  categoryId?: string;
  difficulty?: Difficulty | 'all';
  questionCount?: number | 'all';
  shuffle?: boolean;
  excludeQuestionIds?: string[];
  customQuestionIds?: string[];
}

/**
 * Fisher-Yatesアルゴリズムによる配列の公平なシャッフル
 */
export function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * 条件に基づいてランダムまたは順序通りに問題を選出する関数
 *
 * - 非公開問題（isPublished: false）は通常プレイから自動的に除外
 * - 同じゲーム中での問題の重複なし
 * - 指定問題数より少ない場合は存在する問題数までに自動調整
 */
export function selectRandomQuestions(
  questions: Question[],
  options: SelectQuestionsOptions = {}
): Question[] {
  if (!Array.isArray(questions) || questions.length === 0) {
    return [];
  }

  const {
    categoryId,
    difficulty,
    questionCount = 'all',
    shuffle = true,
    excludeQuestionIds = [],
    customQuestionIds,
  } = options;

  const excludeSet = new Set(excludeQuestionIds);
  const customSet = customQuestionIds && customQuestionIds.length > 0 ? new Set(customQuestionIds) : null;

  // 1. フィルタリング
  let filtered = questions.filter((q) => {
    // 非公開問題を除外
    if (q.isPublished === false) return false;

    // 除外IDチェック
    if (excludeSet.has(q.id)) return false;

    // カスタム指定IDリストがあればその中に含まれるもののみ
    if (customSet && !customSet.has(q.id)) return false;

    // カテゴリ絞り込み（customSetが指定されていない場合）
    if (!customSet && categoryId && categoryId !== 'all') {
      if (q.categoryId !== categoryId) return false;
    }

    // 難易度絞り込み（customSetが指定されていない場合）
    if (!customSet && difficulty && difficulty !== 'all') {
      if (q.difficulty !== difficulty) return false;
    }

    return true;
  });

  // 2. シャッフル（shuffleがtrueの場合）
  if (shuffle) {
    filtered = shuffleArray(filtered);
  }

  // 3. 問題数の調整
  if (questionCount === 'all' || typeof questionCount !== 'number') {
    return filtered;
  }

  const count = Math.max(1, questionCount);
  return filtered.slice(0, count);
}

