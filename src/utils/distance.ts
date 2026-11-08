import { validateCoordinates } from './coordinates';

const EARTH_RADIUS_KM = 6371;

/**
 * 度をラジアンに変換します。
 */
function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * 2地点間の距離をHaversine（半正弦）の公式を用いて計算します (km)。
 */
export function calculateDistanceKm(
  latitude1: number,
  longitude1: number,
  latitude2: number,
  longitude2: number
): number {
  validateCoordinates(latitude1, longitude1);
  validateCoordinates(latitude2, longitude2);

  const dLat = toRadians(latitude2 - latitude1);
  const dLon = toRadians(longitude2 - longitude1);
  const lat1Rad = toRadians(latitude1);
  const lat2Rad = toRadians(latitude2);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c;
}

/**
 * 距離を表示用文字列にフォーマットします。
 * - 1km未満: 整数メートル (例: 450m)
 * - 1km以上: 小数第1位までのkm (例: 2.4km, 128.7km)
 */
export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    const meters = Math.round(distanceKm * 1000);
    return `${meters}m`;
  }
  return `${distanceKm.toFixed(1)}km`;
}
