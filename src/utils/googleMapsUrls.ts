import { isValidCoordinates, validateCoordinates } from './coordinates';

/**
 * 指定した座標のGoogle Maps Street View用URLを生成します。
 * 形式: https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=緯度,経度
 */
export function createGoogleStreetViewUrl(
  latitude: number,
  longitude: number
): string {
  validateCoordinates(latitude, longitude);

  const url = new URL('https://www.google.com/maps/@');
  url.searchParams.set('api', '1');
  url.searchParams.set('map_action', 'pano');
  url.searchParams.set('viewpoint', `${latitude},${longitude}`);

  return url.toString();
}

/**
 * 指定した座標のGoogle Maps通常地図検索用URLを生成します。
 * 形式: https://www.google.com/maps/search/?api=1&query=緯度,経度
 */
export function createGoogleMapSearchUrl(
  latitude: number,
  longitude: number
): string {
  validateCoordinates(latitude, longitude);

  const url = new URL('https://www.google.com/maps/search/');
  url.searchParams.set('api', '1');
  url.searchParams.set('query', `${latitude},${longitude}`);

  return url.toString();
}

/**
 * 安全にGoogle Maps Street View URLを取得します（無効な座標の場合はnull）。
 */
export function safeCreateGoogleStreetViewUrl(
  latitude: number,
  longitude: number
): string | null {
  if (!isValidCoordinates(latitude, longitude)) {
    return null;
  }
  try {
    return createGoogleStreetViewUrl(latitude, longitude);
  } catch {
    return null;
  }
}

/**
 * 安全にGoogle Maps 通常地図URLを取得します（無効な座標の場合はnull）。
 */
export function safeCreateGoogleMapSearchUrl(
  latitude: number,
  longitude: number
): string | null {
  if (!isValidCoordinates(latitude, longitude)) {
    return null;
  }
  try {
    return createGoogleMapSearchUrl(latitude, longitude);
  } catch {
    return null;
  }
}
