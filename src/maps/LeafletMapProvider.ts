import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Coordinates } from '../types/game';
import { MapOptions, MapProvider, PinMode, MapLanguage } from './MapProvider';
import { WORLD_PLACE_LABELS, WorldPlaceLabel } from '../data/worldPlaceLabels';
import { safeCreateGoogleMapSearchUrl } from '../utils/googleMapsUrls';

// デフォルトの日本中心座標とズーム
const DEFAULT_CENTER: Coordinates = { latitude: 36.2048, longitude: 138.2529 };
const DEFAULT_ZOOM = 5;

// デフォルトのタイル設定（OSM）
const DEFAULT_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const DEFAULT_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors';

const JA_TILE_URL = 'https://tile.openstreetmap.jp/styles/osm-bright-ja/{z}/{x}/{y}.png';
const JA_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors, OpenStreetMap Japan';

/**
 * ユーザー回答用のカスタムピンHTML（明るい青またはイエローの大径円形マーカー）
 */
function createUserMarkerIcon(isResult: boolean = false): L.DivIcon {
  return L.divIcon({
    className: 'custom-user-marker',
    html: `
      <div class="user-marker-pin-wrapper ${isResult ? 'result-mode' : ''}">
        <svg viewBox="0 0 36 46" width="36" height="46" class="marker-pin-svg user-pin-svg">
          <!-- ピン本体（明るいシアン/ブルー） -->
          <path d="M18 0C8.06 0 0 8.06 0 18c0 12 16.03 26.85 16.73 27.52a1.8 1.8 0 0 0 2.54 0C19.97 44.85 36 30 36 18 36 8.06 27.94 0 18 0z" fill="#0284c7"/>
          <circle cx="18" cy="17" r="9" fill="#ffffff"/>
          <circle cx="18" cy="17" r="6" fill="#0ea5e9"/>
        </svg>
        <span class="marker-floating-label user-label">あなたの回答</span>
      </div>
    `,
    iconSize: [36, 46],
    iconAnchor: [18, 46],
    popupAnchor: [0, -44],
  });
}

/**
 * 正解地点用のカスタムピンHTML（明るいゴールドまたは赤の大径マーカー）
 */
function createCorrectMarkerIcon(): L.DivIcon {
  return L.divIcon({
    className: 'custom-correct-marker',
    html: `
      <div class="correct-marker-pin-wrapper result-mode">
        <svg viewBox="0 0 40 50" width="40" height="50" class="marker-pin-svg correct-pin-svg">
          <!-- ピン本体（ゴールド / エメラルドグリーン） -->
          <path d="M20 0C8.95 0 0 8.95 0 20c0 13.33 17.81 29.83 18.59 30.58a1.9 1.9 0 0 0 2.82 0C22.19 49.83 40 33.33 40 20 40 8.95 31.05 0 20 0z" fill="#e11d48"/>
          <circle cx="20" cy="19" r="11" fill="#ffffff"/>
          <polygon points="20,11 25,15 23,21 17,21 15,15" fill="#f59e0b"/>
          <circle cx="20" cy="19" r="4" fill="#be123c"/>
        </svg>
        <span class="marker-floating-label correct-label">正解地点</span>
      </div>
    `,
    iconSize: [40, 50],
    iconAnchor: [20, 50],
    popupAnchor: [0, -48],
  });
}

/**
 * 修正提案地点用のカスタムピンHTML（ネオンイエロー / シアンの警告マーカー）
 */
function createReportMarkerIcon(): L.DivIcon {
  return L.divIcon({
    className: 'custom-report-marker',
    html: `
      <div class="report-marker-pin-wrapper result-mode">
        <svg viewBox="0 0 38 48" width="38" height="48" class="marker-pin-svg report-pin-svg">
          <path d="M19 0C8.5 0 0 8.5 0 19c0 12.67 16.92 28.34 17.66 29.05a1.8 1.8 0 0 0 2.68 0C21.08 47.34 38 31.67 38 19 38 8.5 29.5 0 19 0z" fill="#f59e0b"/>
          <circle cx="19" cy="18" r="10" fill="#111A30"/>
          <text x="19" y="24" font-size="16" text-anchor="middle" fill="#00E5FF" font-weight="900">⚠️</text>
        </svg>
        <span class="marker-floating-label report-label">修正提案地点</span>
      </div>
    `,
    iconSize: [38, 48],
    iconAnchor: [19, 48],
    popupAnchor: [0, -46],
  });
}

/**
 * 回答地・正解地を照らすスポットライト光のアイコン
 */
function createSpotlightIcon(type: 'user' | 'correct'): L.DivIcon {
  const isUser = type === 'user';
  const size = isUser ? 200 : 240;
  const half = size / 2;
  return L.divIcon({
    className: `spotlight-aura-marker ${isUser ? 'user-spotlight-marker' : 'correct-spotlight-marker'}`,
    html: `<div class="spotlight-aura ${isUser ? 'user-spotlight' : 'correct-spotlight'}"></div>`,
    iconSize: [size, size],
    iconAnchor: [half, half],
  });
}

/**
 * 日本語カタカナラベルのHTMLバッジアイコン（大陸・国名・都市名）
 */
function createPlaceBadgeIcon(label: WorldPlaceLabel): L.DivIcon {
  const typeClass = `is-${label.type}`;
  const badgeClass = `badge-${label.type}`;
  const localHtml = label.localName ? `<span class="badge-local">${label.localName}</span>` : '';
  return L.divIcon({
    className: `japanese-map-badge-wrapper ${typeClass}`,
    html: `
      <div class="japanese-map-badge ${badgeClass}">
        <span class="badge-ja">${label.name}</span>
        ${localHtml}
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

export class LeafletMapProvider implements MapProvider {
  private map: L.Map | null = null;
  private tileLayer: L.TileLayer | null = null;
  private userMarker: L.Marker | null = null;
  private correctMarker: L.Marker | null = null;
  private reportMarker: L.Marker | null = null;
  private line: L.Polyline | null = null;
  private userSpotlight: L.Marker | null = null;
  private correctSpotlight: L.Marker | null = null;
  private japaneseLabelsLayer: L.LayerGroup | null = null;
  private zoomEndHandler: (() => void) | null = null;
  private currentLanguage: MapLanguage = 'ja';
  private clickHandler: ((coords: Coordinates) => void) | null = null;
  private doubleClickHandler: ((coords: Coordinates) => void) | null = null;
  private containerElement: HTMLElement | null = null;
  private touchEndHandler: ((e: TouchEvent) => void) | null = null;
  private lastTouchTime: number = 0;
  private lastTouchPos: { x: number; y: number } | null = null;
  private pinMode: PinMode = 'single';

  init(options: MapOptions): void {
    if (this.map) {
      this.destroy();
    }

    this.containerElement = options.container;
    this.pinMode = options.pinMode || 'single';
    const center = options.initialCenter || DEFAULT_CENTER;
    const zoom = options.initialZoom ?? DEFAULT_ZOOM;

    const initialLang = options.language || 'ja';
    const tileUrl =
      options.tileUrl ||
      import.meta.env.VITE_MAP_TILE_URL ||
      (initialLang === 'ja' ? JA_TILE_URL : DEFAULT_TILE_URL);

    const attribution =
      options.attribution ||
      import.meta.env.VITE_MAP_ATTRIBUTION ||
      (initialLang === 'ja' ? JA_ATTRIBUTION : DEFAULT_ATTRIBUTION);

    const allowZoom = options.interactive ? options.allowZoom !== false : true;
    const allowPan = options.interactive ? options.allowPan !== false : true;

    // ダブルタップモード時のみ、ダブルクリックによる不意なズームを抑止
    this.map = L.map(options.container, {
      zoomControl: false, // デフォルト左上を無効化（HUDと被らないよう左下に再配置）
      attributionControl: true,
      doubleClickZoom: allowZoom && this.pinMode !== 'double',
      scrollWheelZoom: allowZoom,
      touchZoom: allowZoom,
      boxZoom: allowZoom,
      dragging: allowPan,
      tapHold: false, // iOS対応
    }).setView([center.latitude, center.longitude], zoom);

    // ズームコントロールを左下に配置して上部HUDとの重複を完全防止
    if (allowZoom) {
      L.control.zoom({ position: 'bottomleft' }).addTo(this.map);
    }

    // スポットライト用の専用ペインを作成（タイル(200)の上、オーバーレイ(400)やピン(600)の下）
    if (!this.map.getPane('spotlightPane')) {
      const pane = this.map.createPane('spotlightPane');
      pane.style.zIndex = '350';
      pane.style.pointerEvents = 'none';
    }

    // 暗転オーバーレイより線が上に見えるようにライン用ペインのz-index調整
    const overlayPane = this.map.getPane('overlayPane');
    if (overlayPane) {
      overlayPane.style.zIndex = '450';
    }

    // 日本語カタカナラベル用の専用ペイン（線の下、ピンの下、タイルやスポットライトの上）
    if (!this.map.getPane('labelsPane')) {
      const labelsPane = this.map.createPane('labelsPane');
      labelsPane.style.zIndex = '420';
      labelsPane.style.pointerEvents = 'none';
    }

    this.tileLayer = L.tileLayer(tileUrl, {
      attribution,
      maxZoom: 18,
      minZoom: 3,
      keepBuffer: 8,           // 画面外のタイルを8タイル分バッファ保持してリサイズ・パン時の黒帯を完全撲滅
      updateWhenIdle: false,   // パン中・ズーム中にもアイドルを待たずに即座にタイルをフェッチ
      updateWhenZooming: false,
      tileSize: 256,
      crossOrigin: true,
    }).addTo(this.map);

    this.currentLanguage = initialLang;
    this.japaneseLabelsLayer = L.layerGroup().addTo(this.map);
    this.zoomEndHandler = () => {
      this.updateJapaneseLabels();
    };
    this.map.on('zoomend', this.zoomEndHandler);
    this.updateJapaneseLabels();

    this.clickHandler = options.onClick || null;
    this.doubleClickHandler = options.onDoubleClick || null;

    // クリックイベント
    this.map.on('click', (e: L.LeafletMouseEvent) => {
      if (this.clickHandler) {
        this.clickHandler({
          latitude: Number(e.latlng.lat.toFixed(6)),
          longitude: Number(e.latlng.lng.toFixed(6)),
        });
      }
    });

    // ダブルクリックイベント
    this.map.on('dblclick', (e: L.LeafletMouseEvent) => {
      if (this.doubleClickHandler) {
        this.doubleClickHandler({
          latitude: Number(e.latlng.lat.toFixed(6)),
          longitude: Number(e.latlng.lng.toFixed(6)),
        });
      }
    });

    // スマホ用ダブルタップ検出
    const container = options.container;
    this.touchEndHandler = (e: TouchEvent) => {
      if (!this.map || !this.doubleClickHandler || !options.interactive) return;
      if (e.changedTouches.length !== 1) return;

      const touch = e.changedTouches[0];
      const now = Date.now();
      const rect = container.getBoundingClientRect();
      const touchX = touch.clientX - rect.left;
      const touchY = touch.clientY - rect.top;

      if (this.lastTouchPos && now - this.lastTouchTime < 350) {
        const dx = touchX - this.lastTouchPos.x;
        const dy = touchY - this.lastTouchPos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 25) {
          const latlng = this.map.containerPointToLatLng(L.point(touchX, touchY));
          this.doubleClickHandler({
            latitude: Number(latlng.lat.toFixed(6)),
            longitude: Number(latlng.lng.toFixed(6)),
          });
          this.lastTouchTime = 0;
          this.lastTouchPos = null;
          return;
        }
      }
      this.lastTouchTime = now;
      this.lastTouchPos = { x: touchX, y: touchY };
    };
    container.addEventListener('touchend', this.touchEndHandler);

    // 地図移動イベント
    this.map.on('movestart', () => options.onMoveStart?.());
    this.map.on('moveend', () => options.onMoveEnd?.());
  }

  setCenter(coords: Coordinates, zoom?: number): void {
    if (!this.map) return;
    if (typeof zoom === 'number') {
      this.map.setView([coords.latitude, coords.longitude], zoom);
    } else {
      this.map.panTo([coords.latitude, coords.longitude]);
    }
  }

  getCenter(): Coordinates | null {
    if (!this.map) return null;
    const center = this.map.getCenter();
    return {
      latitude: Number(center.lat.toFixed(6)),
      longitude: Number(center.lng.toFixed(6)),
    };
  }

  setZoom(zoom: number): void {
    if (!this.map) return;
    this.map.setZoom(zoom);
  }

  setUserMarker(coords: Coordinates | null): void {
    if (!this.map) return;

    if (!coords) {
      if (this.userMarker) {
        this.map.removeLayer(this.userMarker);
        this.userMarker = null;
      }
      return;
    }

    if (this.userMarker) {
      this.userMarker.setLatLng([coords.latitude, coords.longitude]);
    } else {
      this.userMarker = L.marker([coords.latitude, coords.longitude], {
        icon: createUserMarkerIcon(false),
        title: 'あなたの回答地点',
        draggable: true,
      }).addTo(this.map);

      this.userMarker.on('dragend', () => {
        if (!this.userMarker || !this.clickHandler) return;
        const pos = this.userMarker.getLatLng();
        this.clickHandler({
          latitude: Number(pos.lat.toFixed(6)),
          longitude: Number(pos.lng.toFixed(6)),
        });
      });
    }

    // Googleマップで確認Popupをバインド
    const gmapUrl = safeCreateGoogleMapSearchUrl(coords.latitude, coords.longitude);
    const popupHtml = `
      <div class="marker-popup-bubble">
        <div class="marker-popup-header">📍 あなたの回答地点</div>
        <div class="marker-popup-coords">北緯 ${coords.latitude.toFixed(6)}°, 東経 ${coords.longitude.toFixed(6)}°</div>
        ${gmapUrl ? `<a href="${gmapUrl}" target="_blank" rel="noopener noreferrer" class="marker-popup-gmap-btn user-btn">🗺️ Googleマップで確認</a>` : ''}
      </div>
    `;
    this.userMarker.bindPopup(popupHtml, { className: 'custom-leaflet-popup' });
  }

  setCorrectMarker(coords: Coordinates | null, label?: string): void {
    if (!this.map) return;

    if (!coords) {
      if (this.correctMarker) {
        this.map.removeLayer(this.correctMarker);
        this.correctMarker = null;
      }
      return;
    }

    if (this.correctMarker) {
      this.correctMarker.setLatLng([coords.latitude, coords.longitude]);
    } else {
      this.correctMarker = L.marker([coords.latitude, coords.longitude], {
        icon: createCorrectMarkerIcon(),
        title: label || '正解地点',
      }).addTo(this.map);
    }

    if (label) {
      this.correctMarker.bindTooltip(label, {
        permanent: false,
        direction: 'top',
        className: 'marker-tooltip',
      });
    }

    // Googleマップで確認Popupをバインド
    const gmapUrl = safeCreateGoogleMapSearchUrl(coords.latitude, coords.longitude);
    const popupHtml = `
      <div class="marker-popup-bubble">
        <div class="marker-popup-header">🏟️ 正解地点${label ? ` (${label})` : ''}</div>
        <div class="marker-popup-coords">北緯 ${coords.latitude.toFixed(6)}°, 東経 ${coords.longitude.toFixed(6)}°</div>
        ${gmapUrl ? `<a href="${gmapUrl}" target="_blank" rel="noopener noreferrer" class="marker-popup-gmap-btn correct-btn">🗺️ Googleマップで確認</a>` : ''}
      </div>
    `;
    this.correctMarker.bindPopup(popupHtml, { className: 'custom-leaflet-popup' });
  }

  setReportMarker(coords: Coordinates | null, label?: string): void {
    if (!this.map) return;

    if (!coords) {
      if (this.reportMarker) {
        this.map.removeLayer(this.reportMarker);
        this.reportMarker = null;
      }
      return;
    }

    if (this.reportMarker) {
      this.reportMarker.setLatLng([coords.latitude, coords.longitude]);
    } else {
      this.reportMarker = L.marker([coords.latitude, coords.longitude], {
        icon: createReportMarkerIcon(),
        title: label || '修正提案地点',
      }).addTo(this.map);
    }

    // Googleマップで確認Popupをバインド
    const gmapUrl = safeCreateGoogleMapSearchUrl(coords.latitude, coords.longitude);
    const popupHtml = `
      <div class="marker-popup-bubble">
        <div class="marker-popup-header">⚠️ 修正提案地点${label ? ` (${label})` : ''}</div>
        <div class="marker-popup-coords">北緯 ${coords.latitude.toFixed(6)}°, 東経 ${coords.longitude.toFixed(6)}°</div>
        ${gmapUrl ? `<a href="${gmapUrl}" target="_blank" rel="noopener noreferrer" class="marker-popup-gmap-btn report-btn">🗺️ Googleマップで確認</a>` : ''}
      </div>
    `;
    this.reportMarker.bindPopup(popupHtml, { className: 'custom-leaflet-popup' });
  }

  setLine(from: Coordinates | null, to: Coordinates | null): void {
    if (!this.map) return;

    if (this.line) {
      this.map.removeLayer(this.line);
      this.line = null;
    }

    if (from && to) {
      // 明るい黄色または白の太線で視認性を最大化
      this.line = L.polyline(
        [
          [from.latitude, from.longitude],
          [to.latitude, to.longitude],
        ],
        {
          color: '#facc15',
          weight: 5,
          opacity: 1.0,
          dashArray: '8, 8',
          className: 'result-connecting-line',
        }
      ).addTo(this.map);
    }
  }

  setDimmed(dimmed: boolean): void {
    if (!this.containerElement) return;
    if (dimmed) {
      this.containerElement.classList.add('result-dimmed');
    } else {
      this.containerElement.classList.remove('result-dimmed');
    }
  }

  setSpotlights(userCoords: Coordinates | null, correctCoords: Coordinates | null): void {
    if (!this.map) return;

    // ユーザー地点のスポットライト
    if (!userCoords) {
      if (this.userSpotlight) {
        this.map.removeLayer(this.userSpotlight);
        this.userSpotlight = null;
      }
    } else {
      if (this.userSpotlight) {
        this.userSpotlight.setLatLng([userCoords.latitude, userCoords.longitude]);
      } else {
        this.userSpotlight = L.marker([userCoords.latitude, userCoords.longitude], {
          icon: createSpotlightIcon('user'),
          pane: 'spotlightPane',
          interactive: false,
        }).addTo(this.map);
      }
    }

    // 正解地点のスポットライト
    if (!correctCoords) {
      if (this.correctSpotlight) {
        this.map.removeLayer(this.correctSpotlight);
        this.correctSpotlight = null;
      }
    } else {
      if (this.correctSpotlight) {
        this.correctSpotlight.setLatLng([correctCoords.latitude, correctCoords.longitude]);
      } else {
        this.correctSpotlight = L.marker([correctCoords.latitude, correctCoords.longitude], {
          icon: createSpotlightIcon('correct'),
          pane: 'spotlightPane',
          interactive: false,
        }).addTo(this.map);
      }
    }
  }

  fitBounds(coordsList: Coordinates[]): void {
    if (!this.map || coordsList.length === 0) return;

    const latLngs = coordsList.map(
      (c) => [c.latitude, c.longitude] as [number, number]
    );
    const bounds = L.latLngBounds(latLngs);
    this.map.fitBounds(bounds, {
      padding: [50, 50],
      maxZoom: 15,
    });
  }

  private updateJapaneseLabels(): void {
    if (!this.map || !this.japaneseLabelsLayer) return;
    this.japaneseLabelsLayer.clearLayers();

    // 日本語表示モード以外の場合はラベルを表示しない
    if (this.currentLanguage !== 'ja') return;

    const currentZoom = this.map.getZoom();
    for (const place of WORLD_PLACE_LABELS) {
      if (
        currentZoom >= place.minZoom &&
        (!place.maxZoom || currentZoom <= place.maxZoom)
      ) {
        const marker = L.marker(
          [place.coordinates.latitude, place.coordinates.longitude],
          {
            icon: createPlaceBadgeIcon(place),
            pane: 'labelsPane',
            interactive: false,
          }
        );
        this.japaneseLabelsLayer.addLayer(marker);
      }
    }
  }

  setPinMode(mode: PinMode): void {
    this.pinMode = mode;
    if (this.map) {
      if (mode === 'double') {
        this.map.doubleClickZoom.disable();
      } else {
        this.map.doubleClickZoom.enable();
      }
    }
  }

  setLanguage(lang: MapLanguage): void {
    this.currentLanguage = lang;
    if (this.tileLayer) {
      const url = lang === 'ja' ? JA_TILE_URL : DEFAULT_TILE_URL;
      this.tileLayer.setUrl(url);
    }
    this.updateJapaneseLabels();
  }

  invalidateSize(): void {
    if (this.map) {
      this.map.invalidateSize({ debounceMoveend: false, pan: false });
    }
  }

  destroy(): void {
    if (this.containerElement && this.touchEndHandler) {
      this.containerElement.removeEventListener('touchend', this.touchEndHandler);
      this.touchEndHandler = null;
    }
    if (this.containerElement) {
      this.containerElement.classList.remove('result-dimmed');
      this.containerElement = null;
    }
    if (this.map && this.zoomEndHandler) {
      this.map.off('zoomend', this.zoomEndHandler);
      this.zoomEndHandler = null;
    }
    if (this.japaneseLabelsLayer && this.map) {
      this.map.removeLayer(this.japaneseLabelsLayer);
      this.japaneseLabelsLayer.clearLayers();
      this.japaneseLabelsLayer = null;
    }
    if (this.userSpotlight && this.map) {
      this.map.removeLayer(this.userSpotlight);
      this.userSpotlight = null;
    }
    if (this.correctSpotlight && this.map) {
      this.map.removeLayer(this.correctSpotlight);
      this.correctSpotlight = null;
    }
    if (this.userMarker && this.map) {
      this.map.removeLayer(this.userMarker);
      this.userMarker = null;
    }
    if (this.correctMarker && this.map) {
      this.map.removeLayer(this.correctMarker);
      this.correctMarker = null;
    }
    if (this.reportMarker && this.map) {
      this.map.removeLayer(this.reportMarker);
      this.reportMarker = null;
    }
    if (this.line && this.map) {
      this.map.removeLayer(this.line);
      this.line = null;
    }
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
    this.tileLayer = null;
    this.clickHandler = null;
    this.doubleClickHandler = null;
  }
}
