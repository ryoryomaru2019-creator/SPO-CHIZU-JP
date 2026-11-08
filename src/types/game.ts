export interface Coordinates {
  latitude: number;
  longitude: number;
}

export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';

export interface Category {
  id: string;
  name: string;
  description: string;
  isEnabled: boolean;
}

export interface AnswerLocation extends Coordinates {
  name: string;
  address?: string;
}

export interface Question {
  id: string;
  title: string;
  question: string;
  hint: string;
  categoryId: string;
  difficulty: Difficulty;
  tags: string[];
  answer: AnswerLocation;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  /** 後方互換用（必要に応じて参照可能） */
  category?: string;
}

export interface GameMode {
  categoryId?: string;
  difficulty?: Difficulty | 'all';
  questionCount: number | 'all';
  shuffle: boolean;
  customQuestionIds?: string[];
  filterSummary?: string;
}

export type PinMode = 'single' | 'crosshair' | 'double';

export type MapLanguage = 'ja' | 'local';

export type QuestionStage = 'standby' | 'countdown' | 'answering' | 'gameover';

export interface GameResult {
  questionId: string;
  questionTitle: string;
  answerLatitude: number;
  answerLongitude: number;
  correctLatitude: number;
  correctLongitude: number;
  distanceKm: number;
  distanceScore?: number;
  timeBonus?: number;
  elapsedMs?: number;
  score: number;
  stadiumName?: string;
}

export interface GameHistory {
  id: string;
  playedAt: string;
  mode: {
    categoryId?: string;
    categoryName?: string;
    difficulty?: string;
    questionCount: number;
  };
  totalScore: number;
  averageDistanceKm: number;
  correctCount: number;
  results: GameResult[];
}

export interface QuestionFilter {
  searchQuery: string;
  categoryId: string;
  difficulty: string;
  publishStatus: 'all' | 'published' | 'unpublished';
}

export interface AdminQuestionForm {
  id?: string;
  title: string;
  question: string;
  hint: string;
  categoryId: string;
  difficulty: Difficulty;
  tags: string; // カンマ区切り文字列
  venueName: string;
  address: string;
  latitude: string;
  longitude: string;
  isPublished: boolean;
}

export interface TargetPosition extends Coordinates {
  pixelX?: number;
  pixelY?: number;
}

export interface MapDisplaySettings {
  dimEnabled: boolean;
  targetEnabled: boolean;
  dimIntensity?: number;
  pinMode: PinMode;
  mapLanguage: MapLanguage;
}

export interface RoundResult {
  questionId: string;
  questionTitle: string;
  stadiumName: string;
  userCoordinates: Coordinates;
  correctCoordinates: Coordinates;
  distanceKm: number;
  distanceScore?: number;
  timeBonus?: number;
  elapsedMs?: number;
  score: number;
}

export type GameScreen = 'start' | 'playing' | 'result' | 'final';

export interface GameState {
  currentScreen: GameScreen;
  currentQuestionIndex: number;
  selectedCoordinates: Coordinates | null;
  roundResults: RoundResult[];
}
