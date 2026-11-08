export interface GameRules {
  // タイマー・ボーナス設定
  maxTimeBonus: number; // 最大タイムボーナス点 (デフォルト: 1000)
  bonusDecaySeconds: number; // ボーナスが0点になる秒数 (デフォルト: 120)
  timeLimitSeconds: number; // 1問あたりの制限時間秒 (0 = 無制限)

  // 距離スコアリング設定
  maxDistanceScore: number; // 満点スコア (デフォルト: 5000)
  perfectDistanceKm: number; // 満点許容距離 (デフォルト: 0.1km = 100m)
  zeroScoreDistanceKm: number; // スコアが0点になる距離 (デフォルト: 3000km)

  // GeoGuessr風ゲームプレイ制限（オススメ設定）
  allowPan: boolean; // 地図の移動（パン）を許可 (false = No Move)
  allowZoom: boolean; // 地図のズームを許可 (false = No Zoom)
  allowHints: boolean; // ヒントの表示を許可 (false = ヒント禁止)
  difficultyMultiplier: boolean; // 難易度ボーナス倍率 (初級1.0x / 中級1.2x / 上級1.5x)
}

export const DEFAULT_GAME_RULES: GameRules = {
  maxTimeBonus: 1000,
  bonusDecaySeconds: 60,
  timeLimitSeconds: 0, // 無制限

  maxDistanceScore: 5000,
  perfectDistanceKm: 0.1,
  zeroScoreDistanceKm: 50,

  allowPan: true,
  allowZoom: true,
  allowHints: true,
  difficultyMultiplier: false,
};
