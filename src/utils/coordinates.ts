import { Coordinates } from '../types/game';

/**
 * 緯度・経度の有効性を検証します。
 * - 緯度: -90度 〜 90度
 * - 経度: -180度 〜 180度
 */
export function isValidCoordinates(latitude: number, longitude: number): boolean {
  if (
    typeof latitude !== 'number' ||
    typeof longitude !== 'number' ||
    Number.isNaN(latitude) ||
    Number.isNaN(longitude) ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    return false;
  }

  return (
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

/**
 * 緯度・経度が無効な場合に例外をスローします。
 */
export function validateCoordinates(latitude: number, longitude: number): void {
  if (!isValidCoordinates(latitude, longitude)) {
    throw new Error(
      `不正な座標です: 緯度=${latitude}, 経度=${longitude}。緯度は-90〜90、経度は-180〜180の範囲で指定してください。`
    );
  }
}

/**
 * Googleマップからコピーされた文字列（例: "35.695957259827004, 139.68212457142732"）や
 * カンマ/スペース/URL形式の文字列から緯度経度を安全に抽出・パースします。
 */
export function parseCoordinatesString(raw: string): Coordinates | null {
  if (!raw || typeof raw !== 'string') return null;

  // 全角英数・記号を半角に正規化
  let normalized = raw
    .replace(/[！-～]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0))
    .replace(/　/g, ' ')
    .trim();

  // Google Maps URL (@35.6959,139.6821) のパターン
  const urlMatch = normalized.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (urlMatch) {
    const lat = parseFloat(urlMatch[1]);
    const lng = parseFloat(urlMatch[2]);
    if (isValidCoordinates(lat, lng)) {
      return { latitude: lat, longitude: lng };
    }
  }

  // 余計な日本語文字（北緯、南緯、東経、西経、度、°など）を取り除いてカンマまたはスペースで分割
  normalized = normalized
    .replace(/[°度]/g, '')
    .replace(/北緯|緯度|lat(?:itude)?/gi, '')
    .replace(/東経|経度|lng|lon(?:gitude)?/gi, '')
    .trim();

  // カンマ、スラッシュ、セミコロン、またはスペースで2つの数値に分割
  const parts = normalized.split(/[,/;\s]+/).filter((p) => p.length > 0);
  if (parts.length >= 2) {
    const lat = parseFloat(parts[0]);
    const lng = parseFloat(parts[1]);
    if (isValidCoordinates(lat, lng)) {
      return { latitude: lat, longitude: lng };
    }
  }

  return null;
}
