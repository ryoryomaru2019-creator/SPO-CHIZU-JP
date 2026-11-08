import { Coordinates } from '../types/game';

export type PinMode = 'single' | 'crosshair' | 'double';
export type MapLanguage = 'ja' | 'local';

export interface MapOptions {
  container: HTMLElement;
  initialCenter?: Coordinates;
  initialZoom?: number;
  tileUrl?: string;
  attribution?: string;
  language?: MapLanguage;
  interactive?: boolean;
  pinMode?: PinMode;
  allowPan?: boolean;
  allowZoom?: boolean;
  onClick?: (coords: Coordinates) => void;
  onDoubleClick?: (coords: Coordinates) => void;
  onMoveStart?: () => void;
  onMoveEnd?: () => void;
}

export interface MapProvider {
  /** 地図の初期化 */
  init(options: MapOptions): void;

  /** 地図の中心位置を設定 */
  setCenter(coords: Coordinates, zoom?: number): void;

  /** 現在の地図中心座標を取得 */
  getCenter(): Coordinates | null;

  /** ズームレベルを設定 */
  setZoom(zoom: number): void;

  /** ユーザーの回答ピンを表示/更新 */
  setUserMarker(coords: Coordinates | null): void;

  /** 正解ピンを表示/更新 */
  setCorrectMarker(coords: Coordinates | null, label?: string): void;

  /** 修正提案ピンを表示/更新 */
  setReportMarker?(coords: Coordinates | null, label?: string): void;

  /** 回答地点と正解地点を結ぶ線を表示/削除 */
  setLine(from: Coordinates | null, to: Coordinates | null): void;

  /** 結果画面用の暗さ（ダーク/スポットライト）モードを設定 */
  setDimmed(dimmed: boolean): void;

  /** 回答地と正解地を照らすスポットライト光を設定 */
  setSpotlights(userCoords: Coordinates | null, correctCoords: Coordinates | null): void;

  /** 両方のピンが収まるように表示範囲を調整 */
  fitBounds(coordsList: Coordinates[]): void;

  /** ピン決定の操作モード（シングルタップ/十字ターゲット/ダブルタップ）を設定 */
  setPinMode(mode: PinMode): void;

  /** 地図タイル言語（日本語/現地語）を設定 */
  setLanguage(lang: MapLanguage): void;

  /** 地図のサイズ変更を通知 (リサイズ対応) */
  invalidateSize(): void;

  /** 地図の破棄 */
  destroy(): void;
}
