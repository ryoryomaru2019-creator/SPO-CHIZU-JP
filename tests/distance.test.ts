import { describe, it, expect } from 'vitest';
import { calculateDistanceKm, formatDistance } from '../src/utils/distance';

describe('distance utils', () => {
  it('同一地点の距離が0kmであること', () => {
    const d = calculateDistanceKm(35.6778, 139.7145, 35.6778, 139.7145);
    expect(d).toBeCloseTo(0, 4);
  });

  it('国立競技場と日産スタジアムの距離を概ね正確に計算できること (約21km)', () => {
    // 国立競技場: 35.6778, 139.7145
    // 日産スタジアム: 35.5101, 139.6063
    const d = calculateDistanceKm(35.6778, 139.7145, 35.5101, 139.6063);
    expect(d).toBeGreaterThan(19);
    expect(d).toBeLessThan(23);
  });

  it('formatDistanceで1km未満はm表示、1km以上はkm表示になること', () => {
    expect(formatDistance(0.45)).toBe('450m');
    expect(formatDistance(0.05)).toBe('50m');
    expect(formatDistance(1.0)).toBe('1.0km');
    expect(formatDistance(2.41)).toBe('2.4km');
    expect(formatDistance(128.67)).toBe('128.7km');
  });
});
