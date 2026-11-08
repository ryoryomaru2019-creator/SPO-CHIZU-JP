import React from 'react';

interface ConfirmTargetButtonProps {
  visible: boolean;
  pixelPosition?: { x: number; y: number } | null;
  containerSize?: { width: number; height: number };
  justDecided?: boolean;
  onConfirm: () => void;
}

export const ConfirmTargetButton: React.FC<ConfirmTargetButtonProps> = ({
  visible,
  pixelPosition = null,
  containerSize = { width: 800, height: 600 },
  justDecided = false,
  onConfirm,
}) => {
  if (!visible) return null;

  // ボタンサイズ（概算）
  const btnWidth = 140;
  const btnHeight = 44;

  let style: React.CSSProperties;

  if (pixelPosition) {
    let left = pixelPosition.x + 14;
    let top = pixelPosition.y + 14;

    // 画面端で見切れないように自動調整
    if (left + btnWidth > containerSize.width - 10) {
      left = Math.max(10, pixelPosition.x - btnWidth - 14);
    }
    if (top + btnHeight > containerSize.height - 10) {
      top = Math.max(10, pixelPosition.y - btnHeight - 14);
    }

    style = {
      position: 'absolute',
      left: `${left}px`,
      top: `${top}px`,
      zIndex: 500,
    };
  } else {
    // 中央ターゲット基準
    style = {
      position: 'absolute',
      top: 'calc(50% + 14px)',
      left: 'calc(50% + 14px)',
      zIndex: 500,
    };
  }

  return (
    <button
      type="button"
      className={`decide-here-btn ${justDecided ? 'just-decided' : ''}`}
      style={style}
      onClick={onConfirm}
      title="ターゲットの位置に回答ピンを決定"
      aria-label="ここに決定"
    >
      📍 ここに決定
    </button>
  );
};
