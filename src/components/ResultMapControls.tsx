import React from 'react';

interface ResultMapControlsProps {
  dimEnabled: boolean;
  onToggleDim: () => void;
}

export const ResultMapControls: React.FC<ResultMapControlsProps> = ({
  dimEnabled,
  onToggleDim,
}) => {
  return (
    <div className="result-map-controls" role="toolbar" aria-label="結果地図の表示設定">
      <button
        type="button"
        className={`map-floating-btn dim-toggle-btn ${dimEnabled ? 'active' : ''}`}
        onClick={onToggleDim}
        aria-pressed={dimEnabled}
        aria-label={dimEnabled ? '地図の暗さを解除' : '地図を暗くする'}
        title={dimEnabled ? '地図の暗さを解除する' : '地図を暗くして回答地点を強調表示する'}
      >
        {dimEnabled ? '💡 地図の暗さを解除' : '🌙 地図を暗くする'}
      </button>
    </div>
  );
};

