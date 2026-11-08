import { describe, it, expect } from 'vitest';
import { formatTime, isTimeout, MAX_GAME_TIME_MS } from '../src/utils/time';

describe('time utils', () => {
  it('0msで正しく「xx分xx秒xxxx」形式でフォーマットされること', () => {
    expect(formatTime(0)).toBe('00分00秒0000');
  });

  it('浮動小数点を含むミリ秒でも余分な桁が出ずxx分xx秒xxxx形式で厳格に出力されること', () => {
    // 12秒345ms
    expect(formatTime(12345)).toBe('00分12秒3450');
    // 1分5秒500ms
    expect(formatTime(65500)).toBe('01分05秒5000');
    // 浮動小数点誤差を含む値 (例: 1分7秒 342.29999997ms)
    expect(formatTime(67342.2999999701977)).toBe('01分07秒3422');
  });

  it('99分99秒99(MAX_GAME_TIME_MS)以上でタイムアウト判定されること', () => {
    expect(isTimeout(MAX_GAME_TIME_MS - 1)).toBe(false);
    expect(isTimeout(MAX_GAME_TIME_MS)).toBe(true);
    expect(isTimeout(MAX_GAME_TIME_MS + 1000)).toBe(true);
  });
});
