import React from 'react';
import categoriesData from '../data/categories.json';
import { Category } from '../types/game';

interface CategorySelectorProps {
  selectedCategoryId: string;
  onSelectCategory: (categoryId: string) => void;
  availableCategories?: Category[];
}

export const CategorySelector: React.FC<CategorySelectorProps> = ({
  selectedCategoryId,
  onSelectCategory,
  availableCategories,
}) => {
  const categories: Category[] = (availableCategories || categoriesData).filter(
    (c) => c.isEnabled !== false
  );

  return (
    <div className="selector-group">
      <label htmlFor="category-select" className="selector-label">
        📂 出題カテゴリ
      </label>
      <select
        id="category-select"
        className="form-select"
        value={selectedCategoryId}
        onChange={(e) => onSelectCategory(e.target.value)}
      >
        <option value="all">すべてのカテゴリ（全公開問題）</option>
        {categories.map((cat) => (
          <option key={cat.id} value={cat.id}>
            {cat.name} ({cat.description})
          </option>
        ))}
      </select>
    </div>
  );
};

