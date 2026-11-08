import { describe, it, expect } from 'vitest';
import {
  isValidCoordinates,
  validateCoordinates,
  parseCoordinatesString,
} from '../src/utils/coordinates';

describe('coordinates utils', () => {
  it('正しい緯度・経度を正当と判定すること', () => {
    expect(isValidCoordinates(35.6778, 139.7145)).toBe(true);
    expect(isValidCoordinates(0, 0)).toBe(true);
    expect(isValidCoordinates(-90, -180)).toBe(true);
    expect(isValidCoordinates(90, 180)).toBe(true);
  });

  it('範囲外の緯度・経度を不正と判定すること', () => {
    expect(isValidCoordinates(90.1, 139.7)).toBe(false);
    expect(isValidCoordinates(-90.1, 139.7)).toBe(false);
    expect(isValidCoordinates(35.6, 180.1)).toBe(false);
    expect(isValidCoordinates(35.6, -180.1)).toBe(false);
  });

  it('NaN, Infinity, 数値以外を不正と判定すること', () => {
    expect(isValidCoordinates(NaN, 139.7)).toBe(false);
    expect(isValidCoordinates(35.6, Infinity)).toBe(false);
    // @ts-expect-error test invalid type
    expect(isValidCoordinates('35.6', 139.7)).toBe(false);
  });

  it('validateCoordinatesが不正値で例外をスローすること', () => {
    expect(() => validateCoordinates(35.6778, 139.7145)).not.toThrow();
    expect(() => validateCoordinates(999, 139.7)).toThrow();
  });

  describe('parseCoordinatesString', () => {
    it('Googleマップからコピーされたカンマ区切りの座標を正しく抽出できること', () => {
      const input = '35.695957259827004, 139.68212457142732';
      const parsed = parseCoordinatesString(input);
      expect(parsed).not.toBeNull();
      expect(parsed?.latitude).toBeCloseTo(35.695957, 5);
      expect(parsed?.longitude).toBeCloseTo(139.682125, 5);
    });

    it('スペース区切りやタブ区切りでも抽出できること', () => {
      const input = '35.695957 139.682124';
      const parsed = parseCoordinatesString(input);
      expect(parsed).not.toBeNull();
      expect(parsed?.latitude).toBeCloseTo(35.695957, 5);
      expect(parsed?.longitude).toBeCloseTo(139.682124, 5);
    });

    it('GoogleマップのURLに含まれる@座標形式から抽出できること', () => {
      const input = 'https://www.google.com/maps/@35.681234,139.767123,17z';
      const parsed = parseCoordinatesString(input);
      expect(parsed).not.toBeNull();
      expect(parsed?.latitude).toBeCloseTo(35.681234, 5);
      expect(parsed?.longitude).toBeCloseTo(139.767123, 5);
    });

    it('全角数字や全角カンマでもパースできること', () => {
      const input = '３５．６９５９， １３９．６８２１';
      const parsed = parseCoordinatesString(input);
      expect(parsed).not.toBeNull();
      expect(parsed?.latitude).toBeCloseTo(35.6959, 3);
      expect(parsed?.longitude).toBeCloseTo(139.6821, 3);
    });

    it('不正なテキストの場合はnullを返すこと', () => {
      expect(parseCoordinatesString('無効なテキスト')).toBeNull();
      expect(parseCoordinatesString('')).toBeNull();
      expect(parseCoordinatesString('999, 999')).toBeNull();
    });
  });
});
