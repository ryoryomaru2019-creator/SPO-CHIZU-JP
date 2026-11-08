import React from 'react';

interface MapTargetProps {
  visible: boolean;
  pixelPosition?: { x: number; y: number } | null;
  onHover?: () => void;
}

export const MapTarget: React.FC<MapTargetProps> = ({
  visible,
  pixelPosition = null,
  onHover,
}) => {
  if (!visible) return null;

  const style: React.CSSProperties = pixelPosition
    ? {
        position: 'absolute',
        left: `${pixelPosition.x}px`,
        top: `${pixelPosition.y}px`,
        transform: 'translate(-50%, -50%)',
        zIndex: 450,
      }
    : {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 450,
      };

  return (
    <div
      className="map-crosshair-target"
      style={style}
      onMouseEnter={onHover}
      aria-hidden="true"
      title="中心十字ターゲット（地図を移動させて狙いを定めます）"
    >
      <svg
        width="44"
        height="44"
        viewBox="0 0 44 44"
        className="crosshair-svg"
      >
        {/* 外側コントラスト用白縁取り */}
        <circle cx="22" cy="22" r="14" fill="none" stroke="#ffffff" strokeWidth="4" />
        <line x1="22" y1="2" x2="22" y2="12" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" />
        <line x1="22" y1="32" x2="22" y2="42" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" />
        <line x1="2" y1="22" x2="12" y2="22" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" />
        <line x1="32" y1="22" x2="42" y2="22" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" />

        {/* メイン線（深緑） */}
        <circle cx="22" cy="22" r="14" fill="none" stroke="#1b4d3e" strokeWidth="2" />
        <line x1="22" y1="2" x2="22" y2="12" stroke="#1b4d3e" strokeWidth="2" strokeLinecap="round" />
        <line x1="22" y1="32" x2="22" y2="42" stroke="#1b4d3e" strokeWidth="2" strokeLinecap="round" />
        <line x1="2" y1="22" x2="12" y2="22" stroke="#1b4d3e" strokeWidth="2" strokeLinecap="round" />
        <line x1="32" y1="22" x2="42" y2="22" stroke="#1b4d3e" strokeWidth="2" strokeLinecap="round" />

        {/* センターの照準ドット */}
        <circle cx="22" cy="22" r="3.5" fill="#2ecc71" stroke="#ffffff" strokeWidth="1.5" />
      </svg>
    </div>
  );
};

