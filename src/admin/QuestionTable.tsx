import React from 'react';
import { Category, Question, QuestionFilter } from '../types/game';
import { safeCreateGoogleMapSearchUrl } from '../utils/googleMapsUrls';

interface QuestionTableProps {
  questions: Question[];
  categories: Category[];
  filter: QuestionFilter;
  onFilterChange: (newFilter: Partial<QuestionFilter>) => void;
  onEdit: (question: Question) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onTogglePublish: (id: string) => void;
}

export const QuestionTable: React.FC<QuestionTableProps> = ({
  questions,
  categories,
  filter,
  onFilterChange,
  onEdit,
  onDuplicate,
  onDelete,
  onTogglePublish,
}) => {
  const categoryMap = new Map<string, string>();
  categories.forEach((c) => categoryMap.set(c.id, c.name));

  // フィルタリング処理
  const filteredQuestions = questions.filter((q) => {
    // 検索語
    if (filter.searchQuery.trim()) {
      const qLower = filter.searchQuery.toLowerCase();
      const matchTitle = q.title.toLowerCase().includes(qLower);
      const matchVenue = q.answer.name.toLowerCase().includes(qLower);
      const matchText = q.question.toLowerCase().includes(qLower);
      const matchTags = q.tags?.some((t) => t.toLowerCase().includes(qLower));
      if (!matchTitle && !matchVenue && !matchText && !matchTags) {
        return false;
      }
    }

    // カテゴリ
    if (filter.categoryId && filter.categoryId !== 'all') {
      if (q.categoryId !== filter.categoryId) return false;
    }

    // 難易度
    if (filter.difficulty && filter.difficulty !== 'all') {
      if (q.difficulty !== filter.difficulty) return false;
    }

    // 公開状態
    if (filter.publishStatus === 'published' && !q.isPublished) return false;
    if (filter.publishStatus === 'unpublished' && q.isPublished) return false;

    return true;
  });

  return (
    <div className="question-table-wrapper">
      {/* 絞り込みバー */}
      <div className="table-filter-bar">
        <div className="filter-item search-item">
          <input
            type="search"
            className="form-input search-input"
            placeholder="🔍 会場名・タイトル・タグで検索..."
            value={filter.searchQuery}
            onChange={(e) => onFilterChange({ searchQuery: e.target.value })}
          />
        </div>

        <div className="filter-item">
          <select
            className="form-select filter-select"
            value={filter.categoryId}
            onChange={(e) => onFilterChange({ categoryId: e.target.value })}
            aria-label="カテゴリで絞り込み"
          >
            <option value="all">全カテゴリ</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-item">
          <select
            className="form-select filter-select"
            value={filter.difficulty}
            onChange={(e) => onFilterChange({ difficulty: e.target.value })}
            aria-label="難易度で絞り込み"
          >
            <option value="all">全難易度</option>
            <option value="easy">初級 (Easy)</option>
            <option value="medium">中級 (Medium)</option>
            <option value="hard">上級 (Hard)</option>
            <option value="expert">激ムズ (Expert)</option>
          </select>
        </div>

        <div className="filter-item">
          <select
            className="form-select filter-select"
            value={filter.publishStatus}
            onChange={(e) =>
              onFilterChange({
                publishStatus: e.target.value as QuestionFilter['publishStatus'],
              })
            }
            aria-label="公開状態で絞り込み"
          >
            <option value="all">すべての公開状態</option>
            <option value="published">公開のみ</option>
            <option value="unpublished">非公開のみ</option>
          </select>
        </div>
      </div>

      <div className="table-count-summary">
        該当: <strong>{filteredQuestions.length}</strong> 件 / 全 {questions.length} 件
      </div>

      {filteredQuestions.length === 0 ? (
        <div className="empty-table-notice">
          <p>条件に一致する問題が見つかりませんでした。</p>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="admin-table">
            <thead>
              <tr>
                <th>状態</th>
                <th>問題タイトル / 会場名</th>
                <th>カテゴリ</th>
                <th>難易度</th>
                <th>座標 (緯度, 経度)</th>
                <th>地図</th>
                <th style={{ width: '180px' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredQuestions.map((q) => {
                const mapUrl = safeCreateGoogleMapSearchUrl(
                  q.answer.latitude,
                  q.answer.longitude
                );

                return (
                  <tr key={q.id} className={!q.isPublished ? 'is-unpublished-row' : ''}>
                    <td>
                      <button
                        type="button"
                        className={`status-toggle-badge ${q.isPublished ? 'published' : 'unpublished'}`}
                        onClick={() => onTogglePublish(q.id)}
                        title={q.isPublished ? 'クリックして非公開にする' : 'クリックして公開にする'}
                      >
                        {q.isPublished ? '公開中' : '非公開'}
                      </button>
                    </td>
                    <td>
                      <div className="table-title-group">
                        <strong className="main-title">{q.title}</strong>
                        <span className="sub-venue">{q.answer.name}</span>
                      </div>
                    </td>
                    <td>
                      <span className="category-pill">
                        {categoryMap.get(q.categoryId) || q.categoryId}
                      </span>
                    </td>
                    <td>
                      <span className={`diff-pill ${q.difficulty}`}>
                        {q.difficulty === 'easy' ? '初級' : q.difficulty === 'medium' ? '中級' : q.difficulty === 'hard' ? '上級' : '激ムズ'}
                      </span>
                    </td>
                    <td>
                      <span className="coords-code">
                        {q.answer.latitude.toFixed(4)}, {q.answer.longitude.toFixed(4)}
                      </span>
                    </td>
                    <td>
                      {mapUrl && (
                        <a
                          href={mapUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="table-link-btn"
                          title="Google Maps通常地図で確認（別タブ）"
                        >
                          🗺️ 地図
                        </a>
                      )}
                    </td>
                    <td>
                      <div className="action-button-group">
                        <button
                          type="button"
                          className="table-action-btn edit-btn"
                          onClick={() => onEdit(q)}
                          title="問題を編集"
                        >
                          ✏️ 編集
                        </button>
                        <button
                          type="button"
                          className="table-action-btn copy-btn"
                          onClick={() => onDuplicate(q.id)}
                          title="問題を複製"
                        >
                          📋 複製
                        </button>
                        <button
                          type="button"
                          className="table-action-btn delete-btn"
                          onClick={() => {
                            if (window.confirm(`「${q.title}」を削除しますか？`)) {
                              onDelete(q.id);
                            }
                          }}
                          title="問題を削除"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

