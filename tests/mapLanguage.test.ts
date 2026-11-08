import { describe, it, expect } from 'vitest';
import { WORLD_PLACE_LABELS } from '../src/data/worldPlaceLabels';
import { LeafletMapProvider } from '../src/maps/LeafletMapProvider';

describe('海外主要国・都市の日本語カタカナラベル', () => {
  it('主要国（スペイン、イギリス、フランス、ドイツ、イタリア等）が登録されていること', () => {
    const spain = WORLD_PLACE_LABELS.find((p) => p.name === 'スペイン');
    const uk = WORLD_PLACE_LABELS.find((p) => p.name === 'イギリス');
    const france = WORLD_PLACE_LABELS.find((p) => p.name === 'フランス');
    const germany = WORLD_PLACE_LABELS.find((p) => p.name === 'ドイツ');
    const italy = WORLD_PLACE_LABELS.find((p) => p.name === 'イタリア');

    expect(spain).toBeDefined();
    expect(spain?.type).toBe('country');
    expect(spain?.localName).toBe('España');

    expect(uk).toBeDefined();
    expect(france).toBeDefined();
    expect(germany).toBeDefined();
    expect(italy).toBeDefined();
  });

  it('主要サッカー都市（バルセロナ、マドリード、ロンドン、パリ、ミュンヘン等）が登録されていること', () => {
    const barcelona = WORLD_PLACE_LABELS.find((p) => p.name === 'バルセロナ');
    const madrid = WORLD_PLACE_LABELS.find((p) => p.name === 'マドリード');
    const london = WORLD_PLACE_LABELS.find((p) => p.name === 'ロンドン');
    const paris = WORLD_PLACE_LABELS.find((p) => p.name === 'パリ');
    const munich = WORLD_PLACE_LABELS.find((p) => p.name === 'ミュンヘン');

    expect(barcelona).toBeDefined();
    expect(barcelona?.type).toBe('city');
    expect(barcelona?.localName).toBe('Barcelona');
    expect(barcelona?.coordinates.latitude).toBeCloseTo(41.3879, 2);
    expect(barcelona?.coordinates.longitude).toBeCloseTo(2.1699, 2);

    expect(madrid).toBeDefined();
    expect(london).toBeDefined();
    expect(paris).toBeDefined();
    expect(munich).toBeDefined();
  });

  it('すべてのラベルの緯度・経度が有効な範囲内であること', () => {
    for (const place of WORLD_PLACE_LABELS) {
      expect(place.coordinates.latitude).toBeGreaterThanOrEqual(-90);
      expect(place.coordinates.latitude).toBeLessThanOrEqual(90);
      expect(place.coordinates.longitude).toBeGreaterThanOrEqual(-180);
      expect(place.coordinates.longitude).toBeLessThanOrEqual(180);
      expect(place.minZoom).toBeGreaterThanOrEqual(1);
      expect(place.minZoom).toBeLessThanOrEqual(18);
    }
  });

  it('LeafletMapProviderでsetLanguage("local")とsetLanguage("ja")がエラーなく切り替えられること', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const provider = new LeafletMapProvider();
    provider.init({
      container,
      language: 'ja',
    });

    // 初期状態はja
    expect(() => provider.setLanguage('local')).not.toThrow();
    expect(() => provider.setLanguage('ja')).not.toThrow();

    provider.destroy();
    document.body.removeChild(container);
  });
});

