import React, { useState } from 'react';
import { Category, Difficulty, Question } from '../types/game';
import { isValidCoordinates } from '../utils/coordinates';
import {
  safeCreateGoogleMapSearchUrl,
  safeCreateGoogleStreetViewUrl,
} from '../utils/googleMapsUrls';

interface QuestionEditorProps {
  initialQuestion?: Question | null;
  categories: Category[];
  onSave: (questionData: Omit<Question, 'id' | 'createdAt' | 'updatedAt'>, id?: string) => void;
  onCancel: () => void;
}

export const QuestionEditor: React.FC<QuestionEditorProps> = ({
  initialQuestion,
  categories,
  onSave,
  onCancel,
}) => {
  const isEditing = Boolean(initialQuestion);

  const [title, setTitle] = useState(initialQuestion?.title || '');
  const [questionText, setQuestionText] = useState(initialQuestion?.question || '');
  const [hint, setHint] = useState(initialQuestion?.hint || '');
  const [venueName, setVenueName] = useState(initialQuestion?.answer.name || '');
  const [address, setAddress] = useState(initialQuestion?.answer.address || '');
  const [categoryId, setCategoryId] = useState(initialQuestion?.categoryId || categories[0]?.id || 'japan-stadium');
  const [difficulty, setDifficulty] = useState<Difficulty>(initialQuestion?.difficulty || 'medium');
  const [tags, setTags] = useState(initialQuestion?.tags?.join(', ') || '');
  const [latitude, setLatitude] = useState(initialQuestion ? String(initialQuestion.answer.latitude) : '');
  const [longitude, setLongitude] = useState(initialQuestion ? String(initialQuestion.answer.longitude) : '');
  const [isPublished, setIsPublished] = useState(initialQuestion ? initialQuestion.isPublished : true);

  const [errors, setErrors] = useState<Record<string, string>>({});

  // リアルタイム座標検証
  const numLat = parseFloat(latitude.trim());
  const numLng = parseFloat(longitude.trim());
  const coordsValid = !isNaN(numLat) && !isNaN(numLng) && isValidCoordinates(numLat, numLng);

  const previewMapUrl = coordsValid ? safeCreateGoogleMapSearchUrl(numLat, numLng) : null;
  const previewSvUrl = coordsValid ? safeCreateGoogleStreetViewUrl(numLat, numLng) : null;

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) newErrors.title = '問題タイトルを入力してください。';
    if (!questionText.trim()) newErrors.questionText = '問題文を入力してください。';
    if (!venueName.trim()) newErrors.venueName = '正解の会場名を入力してください。';

    if (!latitude.trim()) {
      newErrors.latitude = '緯度を入力してください。';
    } else if (isNaN(numLat)) {
      newErrors.latitude = '緯度は有効な数値である必要があります。';
    } else if (numLat < -90 || numLat > 90) {
      newErrors.latitude = '緯度は -90度 〜 +90度の範囲で入力してください。';
    }

    if (!longitude.trim()) {
      newErrors.longitude = '経度を入力してください。';
    } else if (isNaN(numLng)) {
      newErrors.longitude = '経度は有効な数値である必要があります。';
    } else if (numLng < -180 || numLng > 180) {
      newErrors.longitude = '経度は -180度 〜 +180度の範囲で入力してください。';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const parsedTags = tags
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const questionData: Omit<Question, 'id' | 'createdAt' | 'updatedAt'> = {
      title: title.trim(),
      question: questionText.trim(),
      hint: hint.trim(),
      categoryId,
      difficulty,
      tags: parsedTags,
      answer: {
        name: venueName.trim(),
        address: address.trim() || undefined,
        latitude: numLat,
        longitude: numLng,
      },
      isPublished,
    };

    onSave(questionData, initialQuestion?.id);
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="editor-title">
      <div className="card question-editor-modal">
        <header className="modal-header">
          <h3 id="editor-title">
            {isEditing ? '✏️ 問題の編集' : '➕ 問題の新規作成'}
          </h3>
          <button
            type="button"
            className="close-modal-btn"
            onClick={onCancel}
            aria-label="閉じる"
          >
            ✕
          </button>
        </header>

        <form onSubmit={handleSubmit} className="editor-form" noValidate>
          <div className="form-grid">
            {/* タイトル */}
            <div className="form-field full-width">
              <label htmlFor="q-title" className="form-label required">
                問題タイトル
              </label>
              <input
                id="q-title"
                type="text"
                className={`form-input ${errors.title ? 'is-invalid' : ''}`}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例: パナソニックスタジアム吹田"
              />
              {errors.title && <span className="field-error">{errors.title}</span>}
            </div>

            {/* 問題文 */}
            <div className="form-field full-width">
              <label htmlFor="q-text" className="form-label required">
                問題文
              </label>
              <textarea
                id="q-text"
                rows={3}
                className={`form-input ${errors.questionText ? 'is-invalid' : ''}`}
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                placeholder="例: ガンバ大阪のホームスタジアムであり、ピッチとスタンドの距離が極めて近い専用スタジアムはどこでしょうか？"
              />
              {errors.questionText && <span className="field-error">{errors.questionText}</span>}
            </div>

            {/* 会場名 */}
            <div className="form-field">
              <label htmlFor="q-venue" className="form-label required">
                会場名 (正解スタジアム名)
              </label>
              <input
                id="q-venue"
                type="text"
                className={`form-input ${errors.venueName ? 'is-invalid' : ''}`}
                value={venueName}
                onChange={(e) => setVenueName(e.target.value)}
                placeholder="例: Panasonic Stadium Suita"
              />
              {errors.venueName && <span className="field-error">{errors.venueName}</span>}
            </div>

            {/* 住所 */}
            <div className="form-field">
              <label htmlFor="q-address" className="form-label">
                所在地 (住所)
              </label>
              <input
                id="q-address"
                type="text"
                className="form-input"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="例: 大阪府吹田市千里万博公園3-3"
              />
            </div>

            {/* カテゴリ */}
            <div className="form-field">
              <label htmlFor="q-category" className="form-label required">
                カテゴリ
              </label>
              <select
                id="q-category"
                className="form-select"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 難易度 */}
            <div className="form-field">
              <label htmlFor="q-difficulty" className="form-label required">
                難易度
              </label>
              <select
                id="q-difficulty"
                className="form-select"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as Difficulty)}
              >
                <option value="easy">初級 (Easy)</option>
                <option value="medium">中級 (Medium)</option>
                <option value="hard">上級 (Hard)</option>
                <option value="expert">激ムズ (Expert)</option>
              </select>
            </div>

            {/* 緯度・経度 */}
            <div className="form-field">
              <label htmlFor="q-lat" className="form-label required">
                緯度 (Latitude: -90 〜 +90)
              </label>
              <input
                id="q-lat"
                type="text"
                className={`form-input ${errors.latitude ? 'is-invalid' : ''}`}
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                placeholder="例: 34.8026"
              />
              {errors.latitude && <span className="field-error">{errors.latitude}</span>}
            </div>

            <div className="form-field">
              <label htmlFor="q-lng" className="form-label required">
                経度 (Longitude: -180 〜 +180)
              </label>
              <input
                id="q-lng"
                type="text"
                className={`form-input ${errors.longitude ? 'is-invalid' : ''}`}
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                placeholder="例: 135.5383"
              />
              {errors.longitude && <span className="field-error">{errors.longitude}</span>}
            </div>

            {/* 座標プレビューリンク */}
            <div className="form-field full-width coordinate-preview-box">
              <div className="preview-label">
                <span>📍 座標確認（保存前にGoogle Mapsで位置を確認できます）:</span>
                {coordsValid ? (
                  <span className="valid-pill">✅ 座標形式正常</span>
                ) : (
                  <span className="invalid-pill">⚠️ 有効な数値を入力してください</span>
                )}
              </div>
              <div className="preview-links">
                {previewMapUrl && (
                  <a
                    href={previewMapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="preview-link-btn"
                  >
                    🔍 Google Maps 通常地図で開く
                  </a>
                )}
                {previewSvUrl && (
                  <a
                    href={previewSvUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="preview-link-btn"
                  >
                    🏟️ Street View リンクで開く
                  </a>
                )}
              </div>
            </div>

            {/* ヒント */}
            <div className="form-field full-width">
              <label htmlFor="q-hint" className="form-label">
                ヒント
              </label>
              <input
                id="q-hint"
                type="text"
                className="form-input"
                value={hint}
                onChange={(e) => setHint(e.target.value)}
                placeholder="例: 大阪府吹田市のエキスポシティ南隣にあります。"
              />
            </div>

            {/* タグ */}
            <div className="form-field full-width">
              <label htmlFor="q-tags" className="form-label">
                タグ (カンマ区切り)
              </label>
              <input
                id="q-tags"
                type="text"
                className="form-input"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="例: 日本, 大阪府, Jリーグ, サッカー専用"
              />
            </div>

            {/* 公開状態 */}
            <div className="form-field full-width checkbox-field">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                />
                <span>この問題を通常ゲームに出題する（公開状態）</span>
              </label>
            </div>
          </div>

          <footer className="modal-actions">
            <button
              type="button"
              className="secondary-btn"
              onClick={onCancel}
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="primary-btn"
            >
              💾 保存する
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
};

