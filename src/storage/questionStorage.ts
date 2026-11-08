import initialQuestionsData from '../data/questions.json';
import { Question } from '../types/game';
import { isValidCoordinates } from '../utils/coordinates';
import { generateId } from '../utils/id';

export const ADMIN_QUESTIONS_STORAGE_KEY = 'sakachizu_admin_questions_v1';

/**
 * 初期問題データのサニタイズ・型適合
 */
function sanitizeQuestion(q: any): Question | null {
  if (!q || typeof q !== 'object') return null;
  if (!q.id || !q.title || !q.question || !q.answer) return null;
  if (!isValidCoordinates(q.answer.latitude, q.answer.longitude)) return null;

  return {
    id: String(q.id),
    title: String(q.title),
    question: String(q.question),
    hint: String(q.hint || ''),
    categoryId: String(q.categoryId || q.category || 'japan-stadium'),
    difficulty: (['easy', 'medium', 'hard', 'expert'].includes(q.difficulty) ? q.difficulty : 'medium'),
    tags: Array.isArray(q.tags) ? q.tags.map(String) : [],
    answer: {
      name: String(q.answer.name || ''),
      address: q.answer.address ? String(q.answer.address) : undefined,
      latitude: Number(q.answer.latitude),
      longitude: Number(q.answer.longitude),
    },
    isPublished: q.isPublished !== undefined ? Boolean(q.isPublished) : true,
    createdAt: q.createdAt ? String(q.createdAt) : new Date().toISOString().split('T')[0],
    updatedAt: q.updatedAt ? String(q.updatedAt) : new Date().toISOString().split('T')[0],
  };
}

/**
 * 初期JSONデータ配列の正規化
 */
export function getInitialQuestions(): Question[] {
  if (!Array.isArray(initialQuestionsData)) return [];
  return initialQuestionsData
    .map(sanitizeQuestion)
    .filter((q): q is Question => q !== null);
}

/**
 * 問題データの取得
 * 優先度:
 * 1. localStorageに保存された管理者編集データ
 * 2. 初期JSONデータ
 */
export function getStoredQuestions(): Question[] {
  try {
    const raw = localStorage.getItem(ADMIN_QUESTIONS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const sanitized = parsed
          .map(sanitizeQuestion)
          .filter((q): q is Question => q !== null);
        if (sanitized.length > 0) {
          return sanitized;
        }
      }
    }
  } catch (err) {
    console.warn('localStorageからの問題データ読み込みに失敗しました（初期データを使用します）:', err);
  }
  return getInitialQuestions();
}

/**
 * 問題データのlocalStorage保存
 */
export function saveStoredQuestions(questions: Question[]): boolean {
  try {
    localStorage.setItem(ADMIN_QUESTIONS_STORAGE_KEY, JSON.stringify(questions));
    return true;
  } catch (err) {
    console.error('localStorageへの問題保存に失敗しました:', err);
    return false;
  }
}

/**
 * 初期JSONデータへのリセット
 */
export function resetStoredQuestions(): Question[] {
  try {
    localStorage.removeItem(ADMIN_QUESTIONS_STORAGE_KEY);
  } catch (err) {
    console.warn('localStorageリセット失敗:', err);
  }
  return getInitialQuestions();
}

/**
 * 問題の新規作成
 */
export function addQuestion(question: Omit<Question, 'id' | 'createdAt' | 'updatedAt'>): Question[] {
  const current = getStoredQuestions();
  const today = new Date().toISOString().split('T')[0];
  const newQuestion: Question = {
    ...question,
    id: generateId('q'),
    createdAt: today,
    updatedAt: today,
  };
  const updated = [newQuestion, ...current];
  saveStoredQuestions(updated);
  return updated;
}

/**
 * 問題の更新
 */
export function updateQuestion(question: Question): Question[] {
  const current = getStoredQuestions();
  const today = new Date().toISOString().split('T')[0];
  const updated = current.map((q) =>
    q.id === question.id ? { ...question, updatedAt: today } : q
  );
  saveStoredQuestions(updated);
  return updated;
}

/**
 * 問題の削除
 */
export function deleteQuestion(id: string): Question[] {
  const current = getStoredQuestions();
  const updated = current.filter((q) => q.id !== id);
  saveStoredQuestions(updated);
  return updated;
}

/**
 * 問題の複製
 */
export function duplicateQuestion(id: string): Question[] {
  const current = getStoredQuestions();
  const target = current.find((q) => q.id === id);
  if (!target) return current;

  const today = new Date().toISOString().split('T')[0];
  const duplicated: Question = {
    ...target,
    id: generateId('q'),
    title: `${target.title} (コピー)`,
    createdAt: today,
    updatedAt: today,
  };

  const updated = [duplicated, ...current];
  saveStoredQuestions(updated);
  return updated;
}

/**
 * 公開・非公開の切り替え
 */
export function togglePublishStatus(id: string): Question[] {
  const current = getStoredQuestions();
  const today = new Date().toISOString().split('T')[0];
  const updated = current.map((q) =>
    q.id === id ? { ...q, isPublished: !q.isPublished, updatedAt: today } : q
  );
  saveStoredQuestions(updated);
  return updated;
}

/**
 * JSONエクスポート
 */
export function exportQuestionsJson(questions?: Question[]): string {
  const target = questions || getStoredQuestions();
  return JSON.stringify(target, null, 2);
}

/**
 * JSONインポート
 */
export function importQuestionsJson(jsonString: string): {
  success: boolean;
  questions?: Question[];
  error?: string;
} {
  try {
    const parsed = JSON.parse(jsonString);
    if (!Array.isArray(parsed)) {
      return { success: false, error: 'インポートデータは問題配列である必要があります。' };
    }

    const sanitized = parsed
      .map(sanitizeQuestion)
      .filter((q): q is Question => q !== null);

    if (sanitized.length === 0) {
      return { success: false, error: '有効な問題データが1件も見つかりませんでした。' };
    }

    saveStoredQuestions(sanitized);
    return { success: true, questions: sanitized };
  } catch (err: any) {
    return { success: false, error: `JSONの構文解析に失敗しました: ${err.message}` };
  }
}

