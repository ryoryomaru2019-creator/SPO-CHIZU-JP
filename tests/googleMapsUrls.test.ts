import { describe, it, expect } from 'vitest';
import {
  createGoogleStreetViewUrl,
  createGoogleMapSearchUrl,
  safeCreateGoogleStreetViewUrl,
  safeCreateGoogleMapSearchUrl,
} from '../src/utils/googleMapsUrls';

describe('googleMapsUrls utils', () => {
  const lat = 35.6778;
  const lng = 139.7145;

  it('Street View URLが正しく生成されること（形式とパラメータの確認）', () => {
    const urlStr = createGoogleStreetViewUrl(lat, lng);
    const url = new URL(urlStr);

    expect(url.origin).toBe('https://www.google.com');
    expect(url.pathname).toBe('/maps/@');
    expect(url.searchParams.get('api')).toBe('1');
    expect(url.searchParams.get('map_action')).toBe('pano');
    expect(url.searchParams.get('viewpoint')).toBe(`${lat},${lng}`);
    // APIキーが含まれていないこと
    expect(url.searchParams.get('key')).toBeNull();
    expect(urlStr).not.toContain('key=');
  });

  it('通常地図検索URLが正しく生成されること（形式とパラメータの確認）', () => {
    const urlStr = createGoogleMapSearchUrl(lat, lng);
    const url = new URL(urlStr);

    expect(url.origin).toBe('https://www.google.com');
    expect(url.pathname).toBe('/maps/search/');
    expect(url.searchParams.get('api')).toBe('1');
    expect(url.searchParams.get('query')).toBe(`${lat},${lng}`);
    // APIキーが含まれていないこと
    expect(url.searchParams.get('key')).toBeNull();
    expect(urlStr).not.toContain('key=');
  });

  it('不正な座標の場合は例外をスローすること', () => {
    expect(() => createGoogleStreetViewUrl(100, 139.7)).toThrow();
    expect(() => createGoogleMapSearchUrl(35.6, 200)).toThrow();
  });

  it('safe版関数が不正な座標でnullを返すこと', () => {
    expect(safeCreateGoogleStreetViewUrl(100, 139.7)).toBeNull();
    expect(safeCreateGoogleMapSearchUrl(35.6, 200)).toBeNull();
    expect(safeCreateGoogleStreetViewUrl(lat, lng)).not.toBeNull();
  });
});
