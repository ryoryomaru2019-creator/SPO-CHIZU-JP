import { Difficulty } from '../types/game';

export const GEMINI_API_KEY_STORAGE = 'sakachizu_gemini_api_key';

export function getGeminiApiKey(): string {
  try {
    return localStorage.getItem(GEMINI_API_KEY_STORAGE) || '';
  } catch {
    return '';
  }
}

export function setGeminiApiKey(key: string): void {
  try {
    localStorage.setItem(GEMINI_API_KEY_STORAGE, key.trim());
  } catch (err) {
    console.error('Failed to save Gemini API key:', err);
  }
}

export interface GeneratedQuestionPayload {
  title: string;
  question: string;
  hint: string;
  venueName: string;
  address?: string;
  latitude: number;
  longitude: number;
  difficulty: Difficulty;
  categoryId: string;
  tags: string[];
  evidenceUrl?: string;
  aiExplanation?: string;
}

const SYSTEM_INSTRUCTION = `あなたは日本全国のサッカースタジアム、スポーツ施設、名所、歴史的地点に関するクイズ出題の超専門家AIです。
ユーザーの要望（クラブ名、スタジアム、地域、エピソード、難易度など）に基づき、地図位置当てクイズゲーム「SPO-CHIZU-JP」用の問題を生成してください。

必ず以下のJSONオブジェクトの形式（配列で1〜3問）で出力してください。Markdownのコードブロックは使わず、純粋なJSON文字列として出力するか、JSONのみを返してください。

スキーマ仕様:
[
  {
    "title": "問題タイトル（例: 鹿島アントラーズのホームスタジアム）",
    "question": "問題文（200文字以内。歴史や名勝負のエピソードなどを織り交ぜた良問）",
    "hint": "ヒント（所在地やアクセス、周辺特徴など）",
    "venueName": "正解のスタジアム・会場名（正式名称）",
    "address": "所在地住所（都道府県 市区町村 番地）",
    "latitude": 緯度数値（日本国内の正確な十進度。例: 35.9918）,
    "longitude": 経度数値（日本国内の正確な十進度。例: 140.6433）,
    "difficulty": "easy" | "medium" | "hard" | "expert",
    "categoryId": "jleague" | "japan-stadium" | "history" | "geography",
    "tags": ["J1", "クラブ名", "地域名", "特徴タグ"],
    "evidenceUrl": "信頼できる公式URLやWikipedia、Googleマップリンクなど",
    "aiExplanation": "AIによる解説や裏付けメモ"
  }
]

緯度と経度は必ずGoogle Maps上の実在スタジアムピッチ中央付近の正確な数値を設定してください。`;

/**
 * Gemini 2.5 Flash APIを呼び出して問題を生成
 */
export async function generateQuestionWithGemini(
  prompt: string,
  apiKeyOverride?: string
): Promise<{ questions: GeneratedQuestionPayload[]; rawResponse: string }> {
  const apiKey = (apiKeyOverride || getGeminiApiKey()).trim();
  if (!apiKey) {
    throw new Error('Gemini API Keyが設定されていません。APIキーを入力してください。');
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const body = {
    system_instruction: {
      parts: [{ text: SYSTEM_INSTRUCTION }],
    },
    contents: [
      {
        parts: [
          {
            text: `以下の要望に基づき、ゲーム用の問題データを作成してください:\n\n要望: ${prompt}`,
          },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.7,
    },
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini APIエラー (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const textOutput =
    data.candidates?.[0]?.content?.parts?.[0]?.text || '';

  if (!textOutput) {
    throw new Error('Geminiから有効なテキスト応答を受信できませんでした。');
  }

  let parsed: any;
  try {
    parsed = JSON.parse(textOutput);
  } catch {
    // マークダウンのクリーンアップ
    const clean = textOutput.replace(/```json\n?|```/g, '').trim();
    parsed = JSON.parse(clean);
  }

  const questionsList: GeneratedQuestionPayload[] = Array.isArray(parsed) ? parsed : [parsed];

  // バリデーションとクレンジング
  const validated = questionsList.map((q) => ({
    title: String(q.title || '無題クイズ'),
    question: String(q.question || '問題文がありません'),
    hint: String(q.hint || ''),
    venueName: String(q.venueName || '会場名未設定'),
    address: q.address ? String(q.address) : undefined,
    latitude: typeof q.latitude === 'number' ? q.latitude : parseFloat(q.latitude) || 35.6812,
    longitude: typeof q.longitude === 'number' ? q.longitude : parseFloat(q.longitude) || 139.7671,
    difficulty: (['easy', 'medium', 'hard', 'expert'].includes(q.difficulty) ? q.difficulty : 'medium') as Difficulty,
    categoryId: String(q.categoryId || 'jleague'),
    tags: Array.isArray(q.tags) ? q.tags.map(String) : ['Jリーグ'],
    evidenceUrl: q.evidenceUrl ? String(q.evidenceUrl) : undefined,
    aiExplanation: q.aiExplanation ? String(q.aiExplanation) : undefined,
  }));

  return {
    questions: validated,
    rawResponse: textOutput,
  };
}
