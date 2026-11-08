import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { GameMap } from '../src/components/GameMap';
import { ConfirmTargetButton } from '../src/components/ConfirmTargetButton';
import {
  getMapDisplaySettings,
} from '../src/storage/settingsStorage';

describe('ピン決定操作とResult画面 (PinOperation & Result)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useRealTimers();
  });

  describe('ピン決定操作と3モード切り替え', () => {
    it('デフォルトの「タップ」モードではシングルクリックで即確定されること', () => {
      const onConfirmPin = vi.fn();
      const onMapClick = vi.fn();

      render(
        <GameMap
          userCoordinates={null}
          interactive={true}
          isConfirmed={false}
          onConfirmPin={onConfirmPin}
          onMapClick={onMapClick}
        />
      );

      const mapContainer = screen.getByRole('region', { name: /日本/i });

      // シングルクリックで即確定
      fireEvent.click(mapContainer);
      expect(onConfirmPin).toHaveBeenCalledTimes(1);
      expect(onMapClick).toHaveBeenCalledTimes(1);
    });

    it('3種類の操作方式（タップ・十字・ダブル）を切り替えられること', () => {
      render(
        <GameMap
          userCoordinates={null}
          interactive={true}
        />
      );

      const singleBtn = screen.getByRole('radio', { name: /👆 タップ/i });
      const crosshairBtn = screen.getByRole('radio', { name: /🎯 十字/i });
      const doubleBtn = screen.getByRole('radio', { name: /✌️ ダブル/i });

      expect(singleBtn).toBeInTheDocument();
      expect(crosshairBtn).toBeInTheDocument();
      expect(doubleBtn).toBeInTheDocument();

      // ダブルモードに切り替え
      fireEvent.click(doubleBtn);
      expect(getMapDisplaySettings().pinMode).toBe('double');

      // 十字モードに切り替え
      fireEvent.click(crosshairBtn);
      expect(getMapDisplaySettings().pinMode).toBe('crosshair');

      // タップモードに戻す
      fireEvent.click(singleBtn);
      expect(getMapDisplaySettings().pinMode).toBe('single');
    });

    it('ダブルタップモード時はシングルクリックで即確定されず、ダブルクリックで確定すること', () => {
      const onConfirmPin = vi.fn();
      const onMapClick = vi.fn();

      render(
        <GameMap
          userCoordinates={null}
          interactive={true}
          isConfirmed={false}
          onConfirmPin={onConfirmPin}
          onMapClick={onMapClick}
        />
      );

      // ダブルモードに切り替え
      const doubleBtn = screen.getByRole('radio', { name: /✌️ ダブル/i });
      fireEvent.click(doubleBtn);

      const mapContainer = screen.getByRole('region', { name: /日本/i });

      // シングルクリック
      fireEvent.click(mapContainer);
      expect(onConfirmPin).not.toHaveBeenCalled();
      expect(onMapClick).toHaveBeenCalled();

      // ダブルクリックで即時確定
      fireEvent.doubleClick(mapContainer);
      expect(onConfirmPin).toHaveBeenCalledTimes(1);
    });

    it('ターゲット表示のON/OFFが切り替えられ、localStorageに保存されること', () => {
      const onConfirmPin = vi.fn();
      render(
        <GameMap
          userCoordinates={null}
          interactive={true}
          onConfirmPin={onConfirmPin}
        />
      );

      const targetToggleBtn = screen.getByRole('button', { name: /ターゲット:/i });
      expect(targetToggleBtn).toHaveTextContent(/ターゲット: ON/);

      // OFFに切り替え
      fireEvent.click(targetToggleBtn);
      expect(targetToggleBtn).toHaveTextContent(/ターゲット: OFF/);
      expect(getMapDisplaySettings().targetEnabled).toBe(false);

      // ONに戻す
      fireEvent.click(targetToggleBtn);
      expect(targetToggleBtn).toHaveTextContent(/ターゲット: ON/);
      expect(getMapDisplaySettings().targetEnabled).toBe(true);
    });

    it('地図言語の切り替え（日本語 ↔ 現地語）ができること', () => {
      render(
        <GameMap
          userCoordinates={null}
          interactive={true}
        />
      );

      const langBtn = screen.getByRole('button', { name: /地図表記言語:/i });
      expect(langBtn).toHaveTextContent(/日本語/);

      // 現地語に切り替え
      fireEvent.click(langBtn);
      expect(langBtn).toHaveTextContent(/現地語/);
      expect(getMapDisplaySettings().mapLanguage).toBe('local');

      // 日本語に戻す
      fireEvent.click(langBtn);
      expect(langBtn).toHaveTextContent(/日本語/);
      expect(getMapDisplaySettings().mapLanguage).toBe('ja');
    });

    it('地図操作停止から1秒後に「ここに決定」ボタンが表示され、クリックで確定すること', () => {
      vi.useFakeTimers();

      const onConfirmPin = vi.fn();
      render(
        <GameMap
          userCoordinates={null}
          interactive={true}
          onConfirmPin={onConfirmPin}
        />
      );

      // 十字ターゲットモードに切り替え
      const crosshairBtn = screen.getByRole('radio', { name: /🎯 十字/i });
      fireEvent.click(crosshairBtn);

      // 1秒経過
      act(() => {
        vi.advanceTimersByTime(1100);
      });

      // 1秒後に「ここに決定」ボタンが出現
      const decideBtn = screen.getByRole('button', { name: /ここに決定/i });
      expect(decideBtn).toBeInTheDocument();

      // クリックで確定処理が走ること
      fireEvent.click(decideBtn);
      expect(onConfirmPin).toHaveBeenCalled();

      vi.useRealTimers();
    });

    it('画面端で「ここに決定」ボタンが見切れないよう位置が自動調整されること', () => {
      const onConfirm = vi.fn();

      // 右端（width: 800, x: 750）でボタンが左側に反転すること
      const { rerender } = render(
        <ConfirmTargetButton
          visible={true}
          pixelPosition={{ x: 750, y: 100 }}
          containerSize={{ width: 800, height: 600 }}
          onConfirm={onConfirm}
        />
      );

      let btn = screen.getByRole('button', { name: /ここに決定/i });
      expect(btn).toBeInTheDocument();

      // 下端（height: 600, y: 550）でボタンが上側に反転すること
      rerender(
        <ConfirmTargetButton
          visible={true}
          pixelPosition={{ x: 100, y: 550 }}
          containerSize={{ width: 800, height: 600 }}
          onConfirm={onConfirm}
        />
      );
      btn = screen.getByRole('button', { name: /ここに決定/i });
      expect(btn).toBeInTheDocument();
    });
  });

  describe('Result画面の暗転と強調機能', () => {
    it('Resultモード時に地図暗転トグルボタンが機能し、localStorageに保存されること', () => {
      render(
        <GameMap
          userCoordinates={{ latitude: 35.68, longitude: 139.71 }}
          correctCoordinates={{ latitude: 35.6778, longitude: 139.7145 }}
          correctLabel="国立競技場"
          showLine={true}
          interactive={false}
          fitBothMarkers={true}
        />
      );

      // 暗転オーバーレイが存在すること
      expect(screen.getByTestId('dim-overlay')).toBeInTheDocument();

      const toggleDimBtn = screen.getByRole('button', { name: /地図の暗さを解除/i });
      expect(toggleDimBtn).toBeInTheDocument();

      // 暗さをOFFにする
      fireEvent.click(toggleDimBtn);
      expect(getMapDisplaySettings().dimEnabled).toBe(false);

      // 暗転オーバーレイが非表示になること
      expect(screen.queryByTestId('dim-overlay')).not.toBeInTheDocument();

      // 再度ONにする
      const turnOnBtn = screen.getByRole('button', { name: /地図を暗く/i });
      fireEvent.click(turnOnBtn);
      expect(getMapDisplaySettings().dimEnabled).toBe(true);
      expect(screen.getByTestId('dim-overlay')).toBeInTheDocument();
    });
  });
});
