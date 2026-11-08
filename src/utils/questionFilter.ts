import { Question, Difficulty } from '../types/game';

export type GenreType = 'sports' | 'entertainment' | 'history' | 'geography';

export interface GenreDef {
  id: GenreType;
  label: string;
  icon: string;
  isAvailable: boolean;
  description: string;
}

export const GENRES: GenreDef[] = [
  {
    id: 'sports',
    label: 'スポーツ (Sports)',
    icon: '⚽',
    isAvailable: true,
    description: 'Jリーグ・全国スタジアム・クラブクイズ（全660問）',
  },
  {
    id: 'entertainment',
    label: 'エンタメ (Entertainment)',
    icon: '🎬',
    isAvailable: false,
    description: 'アニメ聖地・音楽フェス・ロケ地（近日追加予定）',
  },
  {
    id: 'history',
    label: '歴史 (History)',
    icon: '🏯',
    isAvailable: false,
    description: '日本の城郭・古戦場・世界遺産（近日追加予定）',
  },
  {
    id: 'geography',
    label: '地理・観光 (Geography)',
    icon: '🗾',
    isAvailable: false,
    description: '名所・旧跡・ご当地グルメ・絶景スポット（近日追加予定）',
  },
];

export type SportKindType =
  | 'soccer'
  | 'baseball'
  | 'basketball'
  | 'volleyball'
  | 'tennis'
  | 'rugby'
  | 'tabletennis';

export interface SportKindDef {
  id: SportKindType;
  label: string;
  icon: string;
  isAvailable: boolean;
  description: string;
}

export const SPORT_KINDS: SportKindDef[] = [
  {
    id: 'soccer',
    label: 'サッカー',
    icon: '⚽',
    isAvailable: true,
    description: 'Jリーグ・全国スタジアム（全660問）',
  },
  {
    id: 'baseball',
    label: '野球',
    icon: '⚾',
    isAvailable: false,
    description: '[DATA LOCKED] は今後のアップデートで解除されます。',
  },
  {
    id: 'basketball',
    label: 'バスケ',
    icon: '🏀',
    isAvailable: false,
    description: '[DATA LOCKED] は今後のアップデートで解除されます。',
  },
  {
    id: 'volleyball',
    label: 'バレーボール',
    icon: '🏐',
    isAvailable: false,
    description: '[DATA LOCKED] は今後のアップデートで解除されます。',
  },
  {
    id: 'tennis',
    label: 'テニス',
    icon: '🎾',
    isAvailable: false,
    description: '[DATA LOCKED] は今後のアップデートで解除されます。',
  },
  {
    id: 'rugby',
    label: 'ラグビー',
    icon: '🏉',
    isAvailable: false,
    description: '[DATA LOCKED] は今後のアップデートで解除されます。',
  },
  {
    id: 'tabletennis',
    label: '卓球',
    icon: '🏓',
    isAvailable: false,
    description: '[DATA LOCKED] は今後のアップデートで解除されます。',
  },
];

export type RegionBlock =
  | 'all'
  | 'hokkaido-tohoku'
  | 'kanto'
  | 'koshinetsu-hokuriku'
  | 'tokai'
  | 'kinki'
  | 'chugoku'
  | 'shikoku'
  | 'kyushu-okinawa'
  | 'overseas';

export interface RegionBlockDef {
  id: RegionBlock;
  label: string;
  prefectures: string[];
}

export const REGION_BLOCKS: RegionBlockDef[] = [
  {
    id: 'hokkaido-tohoku',
    label: '北海道・東北',
    prefectures: ['北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県'],
  },
  {
    id: 'kanto',
    label: '関東',
    prefectures: ['茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県'],
  },
  {
    id: 'koshinetsu-hokuriku',
    label: '甲信越・北陸',
    prefectures: ['新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県'],
  },
  {
    id: 'tokai',
    label: '東海',
    prefectures: ['岐阜県', '静岡県', '愛知県', '三重県'],
  },
  {
    id: 'kinki',
    label: '近畿',
    prefectures: ['滋賀県', '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県'],
  },
  {
    id: 'chugoku',
    label: '中国',
    prefectures: ['鳥取県', '島根県', '岡山県', '広島県', '山口県'],
  },
  {
    id: 'shikoku',
    label: '四国',
    prefectures: ['徳島県', '香川県', '愛媛県', '高知県'],
  },
  {
    id: 'kyushu-okinawa',
    label: '九州・沖縄',
    prefectures: ['福岡県', '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県'],
  },
  {
    id: 'overseas',
    label: '海外・その他',
    prefectures: [],
  },
];

export type LeagueFilter = 'all' | 'J1' | 'J2' | 'J3' | 'other';

export interface ClubInfo {
  name: string;
  league: 'J1' | 'J2' | 'J3';
  region: RegionBlock;
}

export const J_CLUBS_LIST: ClubInfo[] = [
  // J1 (20)
  { name: '鹿島アントラーズ', league: 'J1', region: 'kanto' },
  { name: '水戸ホーリーホック', league: 'J1', region: 'kanto' },
  { name: '浦和レッズ', league: 'J1', region: 'kanto' },
  { name: 'ジェフユナイテッド千葉', league: 'J1', region: 'kanto' },
  { name: '柏レイソル', league: 'J1', region: 'kanto' },
  { name: 'FC東京', league: 'J1', region: 'kanto' },
  { name: '東京ヴェルディ', league: 'J1', region: 'kanto' },
  { name: 'FC町田ゼルビア', league: 'J1', region: 'kanto' },
  { name: '川崎フロンターレ', league: 'J1', region: 'kanto' },
  { name: '横浜F・マリノス', league: 'J1', region: 'kanto' },
  { name: '清水エスパルス', league: 'J1', region: 'tokai' },
  { name: '名古屋グランパス', league: 'J1', region: 'tokai' },
  { name: '京都サンガF.C.', league: 'J1', region: 'kinki' },
  { name: 'ガンバ大阪', league: 'J1', region: 'kinki' },
  { name: 'セレッソ大阪', league: 'J1', region: 'kinki' },
  { name: 'ヴィッセル神戸', league: 'J1', region: 'kinki' },
  { name: 'ファジアーノ岡山', league: 'J1', region: 'chugoku' },
  { name: 'サンフレッチェ広島', league: 'J1', region: 'chugoku' },
  { name: 'アビスパ福岡', league: 'J1', region: 'kyushu-okinawa' },
  { name: 'V・ファーレン長崎', league: 'J1', region: 'kyushu-okinawa' },

  // J2 (20)
  { name: '北海道コンサドーレ札幌', league: 'J2', region: 'hokkaido-tohoku' },
  { name: 'ヴァンラーレ八戸', league: 'J2', region: 'hokkaido-tohoku' },
  { name: 'ベガルタ仙台', league: 'J2', region: 'hokkaido-tohoku' },
  { name: 'ブラウブリッツ秋田', league: 'J2', region: 'hokkaido-tohoku' },
  { name: 'モンテディオ山形', league: 'J2', region: 'hokkaido-tohoku' },
  { name: 'いわきFC', league: 'J2', region: 'hokkaido-tohoku' },
  { name: '栃木シティ', league: 'J2', region: 'kanto' },
  { name: 'RB大宮アルディージャ', league: 'J2', region: 'kanto' },
  { name: '横浜FC', league: 'J2', region: 'kanto' },
  { name: '湘南ベルマーレ', league: 'J2', region: 'kanto' },
  { name: 'ヴァンフォーレ甲府', league: 'J2', region: 'koshinetsu-hokuriku' },
  { name: 'アルビレックス新潟', league: 'J2', region: 'koshinetsu-hokuriku' },
  { name: 'カターレ富山', league: 'J2', region: 'koshinetsu-hokuriku' },
  { name: 'ジュビロ磐田', league: 'J2', region: 'tokai' },
  { name: '藤枝MYFC', league: 'J2', region: 'tokai' },
  { name: '徳島ヴォルティス', league: 'J2', region: 'shikoku' },
  { name: 'FC今治', league: 'J2', region: 'shikoku' },
  { name: 'サガン鳥栖', league: 'J2', region: 'kyushu-okinawa' },
  { name: '大分トリニータ', league: 'J2', region: 'kyushu-okinawa' },
  { name: 'テゲバジャーロ宮崎', league: 'J2', region: 'kyushu-okinawa' },

  // J3 (20)
  { name: '福島ユナイテッドFC', league: 'J3', region: 'hokkaido-tohoku' },
  { name: '栃木SC', league: 'J3', region: 'kanto' },
  { name: 'ザスパ群馬', league: 'J3', region: 'kanto' },
  { name: 'SC相模原', league: 'J3', region: 'kanto' },
  { name: '松本山雅FC', league: 'J3', region: 'koshinetsu-hokuriku' },
  { name: 'AC長野パルセイロ', league: 'J3', region: 'koshinetsu-hokuriku' },
  { name: 'ツエーゲン金沢', league: 'J3', region: 'koshinetsu-hokuriku' },
  { name: 'FC岐阜', league: 'J3', region: 'tokai' },
  { name: 'レイラック滋賀FC', league: 'J3', region: 'kinki' },
  { name: 'FC大阪', league: 'J3', region: 'kinki' },
  { name: '奈良クラブ', league: 'J3', region: 'kinki' },
  { name: 'ガイナーレ鳥取', league: 'J3', region: 'chugoku' },
  { name: 'レノファ山口FC', league: 'J3', region: 'chugoku' },
  { name: 'カマタマーレ讃岐', league: 'J3', region: 'shikoku' },
  { name: '愛媛FC', league: 'J3', region: 'shikoku' },
  { name: '高知ユナイテッドSC', league: 'J3', region: 'shikoku' },
  { name: 'ギラヴァンツ北九州', league: 'J3', region: 'kyushu-okinawa' },
  { name: 'ロアッソ熊本', league: 'J3', region: 'kyushu-okinawa' },
  { name: '鹿児島ユナイテッドFC', league: 'J3', region: 'kyushu-okinawa' },
  { name: 'FC琉球', league: 'J3', region: 'kyushu-okinawa' },
];

export interface ThemeTagDef {
  id: string;
  label: string;
  keywords: string[];
}

export const THEME_TAGS: ThemeTagDef[] = [
  { id: 'stadium', label: '🏟️ ホームスタジアム', keywords: ['スタジアム', 'ホームスタジアム', 'ホーム'] },
  { id: 'history', label: '📜 歴史・前身クラブ', keywords: ['前身', '歴史', '創設', '実業団'] },
  { id: 'name-origin', label: '💡 クラブ名の由来', keywords: ['由来', '語源', '名前'] },
  { id: 'mascot', label: '🦁 マスコット', keywords: ['マスコット', 'キャラクター'] },
  { id: 'color', label: '🎨 カラー・エンブレム', keywords: ['クラブカラー', 'エンブレム', 'カラー', '旗'] },
  { id: 'title', label: '🏆 タイトル・名勝負', keywords: ['タイトル', '優勝', '伝説', '劇的', '名勝負', '昇格'] },
  { id: 'hometown', label: '🏘️ ホームタウン・名物', keywords: ['ホームタウン', '名物', '名所', 'グルメ', '観光'] },
  { id: 'cult', label: '🔥 カルト・激ムズ', keywords: ['カルト', '激ムズ', '珍問'] },
];

export interface AdvancedFilterState {
  genre: GenreType;
  sportKind: SportKindType;
  keyword: string;
  categoryId: string; // 'all' | categoryId
  league: LeagueFilter;
  region: RegionBlock;
  clubs: string[]; // 複数選択されたクラブ名一覧
  difficulty: Difficulty | 'all';
  themes: string[]; // theme IDs
}

export const INITIAL_FILTER_STATE: AdvancedFilterState = {
  genre: 'sports',
  sportKind: 'soccer',
  keyword: '',
  categoryId: 'all',
  league: 'all',
  region: 'all',
  clubs: [],
  difficulty: 'all',
  themes: [],
};

/**
 * リーグと地域ブロックの選択状態に合致するクラブ一覧を取得
 */
export function getAvailableClubs(
  league: LeagueFilter,
  region: RegionBlock
): ClubInfo[] {
  return J_CLUBS_LIST.filter((club) => {
    if (league !== 'all' && club.league !== league) return false;
    if (region !== 'all' && club.region !== region) return false;
    return true;
  });
}

/**
 * 問題の所属地域ブロックを判定する
 */
export function getQuestionRegion(q: Question): RegionBlock {
  const qAny = q as any;
  const targetText = [
    q.title || '',
    (q.tags || []).join(' '),
    q.answer?.address || '',
    q.answer?.name || '',
    qAny.answer_location?.address || '',
    qAny.answer_location?.prefecture || '',
    qAny.answer_location?.municipality || '',
    q.question || '',
  ].join(' ');

  for (const block of REGION_BLOCKS) {
    if (block.id === 'overseas') continue;
    for (const pref of block.prefectures) {
      const shortPref = pref.replace(/[都府県]/, '');
      if (targetText.includes(pref) || targetText.includes(shortPref)) {
        return block.id;
      }
    }
  }

  return 'overseas';
}

/**
 * 問題のリーグを判定する
 */
export function getQuestionLeague(q: Question): 'J1' | 'J2' | 'J3' | 'other' {
  const qAny = q as any;
  if (qAny.league === 'J1' || qAny.league === 'J2' || qAny.league === 'J3') {
    return qAny.league;
  }
  const tags = q.tags || [];
  if (tags.includes('J1')) return 'J1';
  if (tags.includes('J2')) return 'J2';
  if (tags.includes('J3')) return 'J3';
  return 'other';
}

/**
 * 問題のクラブ名を取得する
 */
export function getQuestionClubName(q: Question): string | null {
  const qAny = q as any;
  if (qAny.club_name) return qAny.club_name;
  for (const c of J_CLUBS_LIST) {
    if (
      (q.title && q.title.includes(c.name)) ||
      (q.tags && q.tags.includes(c.name)) ||
      (q.question && q.question.includes(c.name))
    ) {
      return c.name;
    }
  }
  return null;
}

/**
 * フィルター条件に一致するかどうかを判定
 */
export function matchQuestion(q: Question, filter: AdvancedFilterState): boolean {
  if (!q.isPublished) return false;

  // 1. ジャンル（現在は 'sports' のみ問題あり）
  if (filter.genre !== 'sports') {
    return false;
  }

  // 1.5 種類区分（現在は 'soccer' のみ稼働中）
  if (filter.sportKind && filter.sportKind !== 'soccer') {
    return false;
  }

  // 2. キーワード検索（部分一致、ひらがなカタカナ・大小英字を柔軟にマッチ）
  if (filter.keyword.trim()) {
    const kw = filter.keyword.trim().toLowerCase();
    const qAny = q as any;
    const searchable = [
      q.title || '',
      q.question || '',
      q.hint || '',
      q.answer?.name || '',
      q.answer?.address || '',
      qAny.club_name || '',
      (q.tags || []).join(' '),
    ].join(' ').toLowerCase();

    if (!searchable.includes(kw)) {
      return false;
    }
  }

  // 3. リーグ
  if (filter.league !== 'all') {
    const l = getQuestionLeague(q);
    if (l !== filter.league) return false;
  }

  // 4. 地域ブロック
  if (filter.region !== 'all') {
    const r = getQuestionRegion(q);
    if (r !== filter.region) return false;
  }

  // 5. チーム（クラブ名）複数選択
  if (filter.clubs.length > 0) {
    const club = getQuestionClubName(q);
    if (!club || !filter.clubs.includes(club)) {
      return false;
    }
  }

  // 6. 難易度
  if (filter.difficulty !== 'all') {
    if (q.difficulty !== filter.difficulty) return false;
  }

  // 7. カテゴリ
  if (filter.categoryId !== 'all') {
    const qAny = q as any;
    const catIds: string[] = qAny.category_ids || [];
    if (q.categoryId !== filter.categoryId && !catIds.includes(filter.categoryId)) {
      return false;
    }
  }

  // 8. テーマタグ
  if (filter.themes.length > 0) {
    const qAny = q as any;
    const searchable = [
      q.title || '',
      q.question || '',
      (q.tags || []).join(' '),
      qAny.club_name || '',
    ].join(' ');

    const matchesAnyTheme = filter.themes.some((themeId) => {
      const def = THEME_TAGS.find((t) => t.id === themeId);
      if (!def) return false;
      return def.keywords.some((kw) => searchable.includes(kw));
    });

    if (!matchesAnyTheme) return false;
  }

  return true;
}

/**
 * 条件に合致する問題一覧をフィルタリング
 */
export function filterQuestions(
  questions: Question[],
  filter: AdvancedFilterState
): Question[] {
  return questions.filter((q) => matchQuestion(q, filter));
}
