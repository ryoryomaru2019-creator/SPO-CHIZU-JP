import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Category, Difficulty, Question, QuestionFilter } from '../types/game';
import { safeCreateGoogleMapSearchUrl } from '../utils/googleMapsUrls';
import { parseCoordinatesString, isValidCoordinates } from '../utils/coordinates';

interface QuestionTableProps {
  questions: Question[];
  categories: Category[];
  filter: QuestionFilter;
  onFilterChange: (newFilter: Partial<QuestionFilter>) => void;
  onEdit: (question: Question) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onTogglePublish: (id: string) => void;
  onUpdateQuestion?: (question: Question) => void;
  onBatchUpdatePublish?: (ids: string[], isPublished: boolean) => void;
  onBatchDelete?: (ids: string[]) => void;
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
  onUpdateQuestion,
  onBatchUpdatePublish,
  onBatchDelete,
}) => {
  const categoryMap = new Map<string, string>();
  categories.forEach((c) => categoryMap.set(c.id, c.name));

  // 複数選択ステート
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // 座標インライン編集用ステート
  const [editingCoordsId, setEditingCoordsId] = useState<string | null>(null);
  const [coordsInput, setCoordsInput] = useState<string>('');
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // ゲーム用地図プレビューモーダル用ステート
  const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

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

  // 全選択 / 全解除
  const handleToggleSelectAll = () => {
    if (selectedIds.size === filteredQuestions.length && filteredQuestions.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredQuestions.map((q) => q.id)));
    }
  };

  const handleToggleSelectOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // 一括公開 / 一括非公開
  const handleBatchPublish = (publish: boolean) => {
    if (selectedIds.size === 0) return;
    if (onBatchUpdatePublish) {
      onBatchUpdatePublish(Array.from(selectedIds), publish);
    } else {
      selectedIds.forEach((id) => {
        const target = questions.find((q) => q.id === id);
        if (target && target.isPublished !== publish) {
          onTogglePublish(id);
        }
      });
    }
    setActionNotice(`選択した ${selectedIds.size} 件を「${publish ? '公開' : '非公開'}」に更新しました`);
    setTimeout(() => setActionNotice(null), 3000);
  };

  // 一括削除
  const handleBatchDeleteClick = () => {
    if (selectedIds.size === 0) return;
    if (window.confirm(`選択した ${selectedIds.size} 件の問題を削除しますか？`)) {
      if (onBatchDelete) {
        onBatchDelete(Array.from(selectedIds));
      } else {
        selectedIds.forEach((id) => onDelete(id));
      }
      setSelectedIds(new Set());
      setActionNotice(`選択した問題を削除しました`);
      setTimeout(() => setActionNotice(null), 3000);
    }
  };

  // インライン直接編集：カテゴリ
  const handleInlineCategoryChange = (question: Question, newCategoryId: string) => {
    if (onUpdateQuestion) {
      onUpdateQuestion({
        ...question,
        categoryId: newCategoryId,
      });
      setActionNotice(`「${question.title}」のカテゴリを更新しました`);
      setTimeout(() => setActionNotice(null), 2500);
    }
  };

  // インライン直接編集：難易度
  const handleInlineDifficultyChange = (question: Question, newDifficulty: Difficulty) => {
    if (onUpdateQuestion) {
      onUpdateQuestion({
        ...question,
        difficulty: newDifficulty,
      });
      setActionNotice(`「${question.title}」の難易度を更新しました`);
      setTimeout(() => setActionNotice(null), 2500);
    }
  };

  // 📜 クリップボードから座標を即座にペーストして反映
  const handlePasteCoordsFromClipboard = async (question: Question) => {
    try {
      if (!navigator.clipboard?.readText) {
        alert('ブラウザのクリップボードアクセスが許可されていません。手動で入力してください。');
        return;
      }
      const text = await navigator.clipboard.readText();
      const parsed = parseCoordinatesString(text);
      if (parsed && isValidCoordinates(parsed.latitude, parsed.longitude)) {
        if (onUpdateQuestion) {
          onUpdateQuestion({
            ...question,
            answer: {
              ...question.answer,
              latitude: Number(parsed.latitude.toFixed(6)),
              longitude: Number(parsed.longitude.toFixed(6)),
            },
          });
          setActionNotice(`✅ 座標をペースト反映しました: [${parsed.latitude.toFixed(4)}, ${parsed.longitude.toFixed(4)}]`);
          setTimeout(() => setActionNotice(null), 3000);
        }
      } else {
        alert(`クリップボードから有効な座標を検出できませんでした。\n取得した文字列: "${text.slice(0, 50)}"\n形式の例: 35.695957, 139.682124`);
      }
    } catch (err) {
      alert('クリップボードの読み取りに失敗しました。');
    }
  };

  // 座標の手動インライン入力保存
  const handleSaveManualCoords = (question: Question) => {
    const parsed = parseCoordinatesString(coordsInput);
    if (parsed && isValidCoordinates(parsed.latitude, parsed.longitude)) {
      if (onUpdateQuestion) {
        onUpdateQuestion({
          ...question,
          answer: {
            ...question.answer,
            latitude: Number(parsed.latitude.toFixed(6)),
            longitude: Number(parsed.longitude.toFixed(6)),
          },
        });
        setActionNotice(`座標を更新しました`);
        setTimeout(() => setActionNotice(null), 2500);
      }
      setEditingCoordsId(null);
    } else {
      alert('有効な緯度・経度を入力してください（例: 35.6959, 139.6821）');
    }
  };

  // ゲーム用地図プレビューモーダル制御
  useEffect(() => {
    if (!previewQuestion || !mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const { latitude, longitude } = previewQuestion.answer;
    const map = L.map(mapContainerRef.current).setView([latitude, longitude], 15);

    L.tileLayer('https://tile.openstreetmap.jp/styles/osm-bright-ja/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    const marker = L.marker([latitude, longitude]).addTo(map);
    marker.bindPopup(`
      <div style="font-size: 0.85rem; font-weight: 700; color: #0f172a;">
        🏟️ ${previewQuestion.answer.name || previewQuestion.title}<br>
        <span style="font-size: 0.75rem; color: #64748b; font-family: monospace;">
          [${latitude.toFixed(6)}, ${longitude.toFixed(6)}]
        </span>
      </div>
    `).openPopup();

    mapInstanceRef.current = map;

    setTimeout(() => {
      map.invalidateSize();
    }, 150);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [previewQuestion]);

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

      {/* 件数サマリー ＆ 一括操作バー */}
      <div className="table-top-actions-bar">
        <div className="table-count-summary">
          該当: <strong>{filteredQuestions.length}</strong> 件 / 全 {questions.length} 件
        </div>

        {selectedIds.size > 0 && (
          <div className="table-batch-actions">
            <span className="batch-selected-count">
              ☑️ 選択中: <strong>{selectedIds.size}</strong> 件
            </span>
            <button
              type="button"
              className="batch-btn batch-publish-btn"
              onClick={() => handleBatchPublish(true)}
            >
              ✅ 一括公開
            </button>
            <button
              type="button"
              className="batch-btn batch-unpublish-btn"
              onClick={() => handleBatchPublish(false)}
            >
              ⏸️ 一括非公開
            </button>
            <button
              type="button"
              className="batch-btn batch-delete-btn"
              onClick={handleBatchDeleteClick}
            >
              🗑️ 一括削除
            </button>
          </div>
        )}
      </div>

      {actionNotice && (
        <div className="table-action-toast">
          <span>{actionNotice}</span>
        </div>
      )}

      {filteredQuestions.length === 0 ? (
        <div className="empty-table-notice">
          <p>条件に一致する問題が見つかりませんでした。</p>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: '40px', textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    className="table-header-checkbox"
                    checked={
                      selectedIds.size === filteredQuestions.length &&
                      filteredQuestions.length > 0
                    }
                    onChange={handleToggleSelectAll}
                    title="すべて選択 / 解除"
                  />
                </th>
                <th style={{ width: '80px' }}>状態</th>
                <th>問題タイトル / 会場名</th>
                <th style={{ width: '160px' }}>カテゴリ（直接編集）</th>
                <th style={{ width: '130px' }}>難易度（直接編集）</th>
                <th style={{ width: '220px' }}>座標（直接編集・貼付）</th>
                <th style={{ width: '150px' }}>地図確認</th>
                <th style={{ width: '160px' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredQuestions.map((q) => {
                const mapUrl = safeCreateGoogleMapSearchUrl(
                  q.answer.latitude,
                  q.answer.longitude
                );
                const isSelected = selectedIds.has(q.id);
                const isEditingCoords = editingCoordsId === q.id;

                return (
                  <tr
                    key={q.id}
                    className={`${!q.isPublished ? 'is-unpublished-row' : ''} ${
                      isSelected ? 'is-selected-row' : ''
                    }`}
                  >
                    {/* チェックボックス */}
                    <td style={{ textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelectOne(q.id)}
                        className="table-row-checkbox"
                      />
                    </td>

                    {/* 公開/非公開状態 */}
                    <td>
                      <button
                        type="button"
                        className={`status-toggle-badge ${
                          q.isPublished ? 'published' : 'unpublished'
                        }`}
                        onClick={() => onTogglePublish(q.id)}
                        title={q.isPublished ? 'クリックして非公開にする' : 'クリックして公開にする'}
                      >
                        {q.isPublished ? '公開中' : '非公開'}
                      </button>
                    </td>

                    {/* タイトル / 会場名 */}
                    <td>
                      <div className="table-title-group">
                        <strong className="main-title">{q.title}</strong>
                        <span className="sub-venue">{q.answer.name}</span>
                      </div>
                    </td>

                    {/* カテゴリ (直接編集) */}
                    <td>
                      <select
                        className="table-inline-select category-select"
                        value={q.categoryId}
                        onChange={(e) => handleInlineCategoryChange(q, e.target.value)}
                        title="クリックしてカテゴリを直接変更"
                      >
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* 難易度 (直接編集) */}
                    <td>
                      <select
                        className={`table-inline-select diff-select diff-${q.difficulty}`}
                        value={q.difficulty}
                        onChange={(e) =>
                          handleInlineDifficultyChange(q, e.target.value as Difficulty)
                        }
                        title="クリックして難易度を直接変更"
                      >
                        <option value="easy">初級 (Easy)</option>
                        <option value="medium">中級 (Medium)</option>
                        <option value="hard">上級 (Hard)</option>
                        <option value="expert">激ムズ (Expert)</option>
                      </select>
                    </td>

                    {/* 座標 (直接編集 ＆ 📜ペースト) */}
                    <td>
                      {!isEditingCoords ? (
                        <div className="coords-cell-group">
                          <span
                            className="coords-code-clickable"
                            onClick={() => {
                              setEditingCoordsId(q.id);
                              setCoordsInput(
                                `${q.answer.latitude.toFixed(6)}, ${q.answer.longitude.toFixed(6)}`
                              );
                            }}
                            title="クリックして数値を直接編集"
                          >
                            {q.answer.latitude.toFixed(4)}, {q.answer.longitude.toFixed(4)}
                          </span>
                          <button
                            type="button"
                            className="coords-clipboard-paste-btn"
                            onClick={() => handlePasteCoordsFromClipboard(q)}
                            title="Googleマップからコピーした座標をクリップボードから自動ペースト"
                          >
                            📜 貼付
                          </button>
                        </div>
                      ) : (
                        <div className="coords-inline-edit-wrap">
                          <input
                            type="text"
                            className="coords-inline-input"
                            value={coordsInput}
                            onChange={(e) => setCoordsInput(e.target.value)}
                            placeholder="35.6959, 139.6821"
                            autoFocus
                          />
                          <button
                            type="button"
                            className="coords-save-btn"
                            onClick={() => handleSaveManualCoords(q)}
                            title="保存"
                          >
                            ✓
                          </button>
                          <button
                            type="button"
                            className="coords-cancel-btn"
                            onClick={() => setEditingCoordsId(null)}
                            title="キャンセル"
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </td>

                    {/* 地図確認: 📍ゲーム用地図 ＆ Googleマップロゴ */}
                    <td>
                      <div className="map-buttons-cell">
                        {/* 1. ゲーム上の地図プレビュー */}
                        <button
                          type="button"
                          className="table-map-btn in-game-map-btn"
                          onClick={() => setPreviewQuestion(q)}
                          title="ゲーム上の地図で正解地点を確認（📍）"
                        >
                          📍 地図
                        </button>

                        {/* 2. Googleマップ */}
                        {mapUrl && (
                          <a
                            href={mapUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="table-map-btn google-map-logo-btn"
                            title="Googleマップを別タブで開いて確認"
                          >
                            <img
                              src="/google-maps-icon.png"
                              alt="Google Maps"
                              className="gmaps-logo-img"
                            />
                            <span>GMap</span>
                          </a>
                        )}
                      </div>
                    </td>

                    {/* 操作 */}
                    <td>
                      <div className="action-button-group">
                        <button
                          type="button"
                          className="table-action-btn edit-btn"
                          onClick={() => onEdit(q)}
                          title="詳細モーダルで問題を編集"
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

      {/* ゲーム用地図プレビューモーダル */}
      {previewQuestion && (
        <div className="modal-overlay" onClick={() => setPreviewQuestion(null)}>
          <div
            className="game-map-preview-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="map-modal-header">
              <div className="modal-header-titles">
                <span className="modal-pin-icon">📍</span>
                <h4>{previewQuestion.title}</h4>
                <span className="modal-venue-name">{previewQuestion.answer.name}</span>
              </div>
              <button
                type="button"
                className="close-modal-btn"
                onClick={() => setPreviewQuestion(null)}
              >
                ✕
              </button>
            </div>
            <div ref={mapContainerRef} className="game-preview-map-canvas" />
            <div className="map-modal-footer">
              <span className="footer-coords">
                北緯 {previewQuestion.answer.latitude.toFixed(6)}°, 東経{' '}
                {previewQuestion.answer.longitude.toFixed(6)}°
              </span>
              <a
                href={
                  safeCreateGoogleMapSearchUrl(
                    previewQuestion.answer.latitude,
                    previewQuestion.answer.longitude
                  ) || undefined
                }
                target="_blank"
                rel="noopener noreferrer"
                className="modal-gmap-external-link"
              >
                <img
                  src="/google-maps-icon.png"
                  alt="Google Maps"
                  className="gmaps-logo-img-sm"
                />
                Googleマップで開く
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
