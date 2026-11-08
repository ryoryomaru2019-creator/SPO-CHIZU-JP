import React from 'react';
import { Difficulty } from '../types/game';

interface DifficultySelectorProps {
  selectedDifficulty: Difficulty | 'all';
  onSelectDifficulty: (difficulty: Difficulty | 'all') => void;
}

export const DifficultySelector: React.FC<DifficultySelectorProps> = ({
  selectedDifficulty,
  onSelectDifficulty,
}) => {
  return (
    <div className="selector-group">
      <label htmlFor="difficulty-select" className="selector-label">
        ⭐ 難易度
      </label>
      <select
        id="difficulty-select"
        className="form-select"
        value={selectedDifficulty}
        onChange={(e) => onSelectDifficulty(e.target.value as Difficulty | 'all')}
      >
        <option value="all">すべての難易度</option>
        <option value="easy">初級 (Easy - 有名メイン会場など)</option>
        <option value="medium">中級 (Medium - Jクラブ本拠地など)</option>
        <option value="hard">上級 (Hard - 特徴的な地方専用スタジアムなど)</option>
        <option value="expert">激ムズ (Expert - ファン向けカルト知識など)</option>
      </select>
    </div>
  );
};

