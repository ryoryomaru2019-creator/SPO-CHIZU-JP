/**
 * サカ地図 タイマー・時間ユーティリティ
 */

/**
 * ゲームオーバーとなる最大許容時間: 99分99秒990ミリ秒
 * 99分 = 5,940,000ms
 * 99秒 = 99,000ms
 * 990ms = 990ms
 * 合計 = 6,039,990ms
 */
export const MAX_GAME_TIME_MS = 6039990;

/**
 * ミリ秒を「xx分xx秒xxxx」形式（厳格に10文字固定）の文字列にフォーマットします。
 * 小数点や浮動小数点誤差による余計な桁数増加を完全に排除します。
 * 例: 12345ms -> "00分12秒3450"
 *     67342.299ms -> "01分07秒3422"
 */
export function formatTime(ms: number): string {
  if (ms < 0) ms = 0;
  if (ms >= MAX_GAME_TIME_MS) {
    return '99分99秒9900';
  }

  const minutes = Math.floor(ms / 60000);
  const remainderAfterMinutes = ms % 60000;
  const seconds = Math.floor(remainderAfterMinutes / 1000);

  // 4桁固定（ミリ秒 × 10 の整数部分。小数点以下の浮動小数誤差をMath.floorで確実に切捨て）
  const fractionalVal = Math.floor((remainderAfterMinutes % 1000) * 10);
  const fractional = fractionalVal.toString().padStart(4, '0').slice(0, 4);

  const mm = minutes.toString().padStart(2, '0');
  const ss = seconds.toString().padStart(2, '0');

  return `${mm}分${ss}秒${fractional}`;
}

/**
 * 簡易表示用（結果画面など見やすさ重視: xx分xx秒xxx）
 */
export function formatTimeDisplay(ms: number): string {
  if (ms < 0) ms = 0;
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const millis = Math.floor(ms % 1000).toString().padStart(3, '0').slice(0, 3);

  const mm = minutes.toString().padStart(2, '0');
  const ss = seconds.toString().padStart(2, '0');

  return `${mm}分${ss}秒${millis}`;
}

/**
 * 指定時間がタイムアウト（99分99秒99以上）かどうか判定
 */
export function isTimeout(ms: number): boolean {
  return ms >= MAX_GAME_TIME_MS;
}
