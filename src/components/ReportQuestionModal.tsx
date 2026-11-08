import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Coordinates } from '../types/game';
import { submitQuestionReport } from '../storage/reportStorage';
import { isValidCoordinates, parseCoordinatesString } from '../utils/coordinates';
import { safeCreateGoogleMapSearchUrl } from '../utils/googleMapsUrls';

interface ReportQuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  questionId: string;
  questionTitle: string;
  originalName: string;
  originalCoordinates: Coordinates;
  userCoordinates?: Coordinates | null;
}

export const ReportQuestionModal: React.FC<ReportQuestionModalProps> = ({
  isOpen,
  onClose,
  questionId,
  questionTitle,
  originalName,
  originalCoordinates,
  userCoordinates,
}) => {
  const [latInput, setLatInput] = useState<string>(
    userCoordinates ? userCoordinates.latitude.toFixed(6) : originalCoordinates.latitude.toFixed(6)
  );
  const [lngInput, setLngInput] = useState<string>(
    userCoordinates ? userCoordinates.longitude.toFixed(6) : originalCoordinates.longitude.toFixed(6)
  );
  const [pasteRawInput, setPasteRawInput] = useState<string>('');
  const [nameInput, setNameInput] = useState<string>('');
  const [urlInput, setUrlInput] = useState<string>('');
  const [commentInput, setCommentInput] = useState<string>('');

  const [showMapPicker, setShowMapPicker] = useState<boolean>(false);
  const [pasteNotice, setPasteNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 地図ピッカー用の参照
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const reportMarkerRef = useRef<L.Marker | null>(null);

  // 緯度経度のバリデーション
  const latNum = parseFloat(latInput);
  const lngNum = parseFloat(lngInput);
  const isCoordsValid = !isNaN(latNum) && !isNaN(lngNum) && isValidCoordinates(latNum, lngNum);

  // Googleマップからコピーした文字列の自動パース＆反映処理
  const applyPastedText = (text: string) => {
    const parsed = parseCoordinatesString(text);
    if (parsed) {
      setLatInput(parsed.latitude.toFixed(6));
      setLngInput(parsed.longitude.toFixed(6));
      setPasteRawInput(`${parsed.latitude.toFixed(6)}, ${parsed.longitude.toFixed(6)}`);
      setPasteNotice(`✅ Googleマップの座標を自動入力しました: (${parsed.latitude.toFixed(6)}, ${parsed.longitude.toFixed(6)})`);
      setTimeout(() => setPasteNotice(null), 4000);
      return true;
    }
    return false;
  };

  // ペースト入力欄の変更ハンドラ
  const handlePasteRawChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPasteRawInput(val);
    if (val.trim()) {
      const ok = applyPastedText(val);
      if (!ok && val.length > 5) {
        setPasteNotice('⚠️ 有効な座標形式（例: 35.695957, 139.682124）が見つかりません。');
      }
    }
  };

  // クリップボードからワンクリックで読み込み
  const handleReadClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          const ok = applyPastedText(text);
          if (!ok) {
            setPasteNotice('⚠️ クリップボードに有効な座標形式が見つかりませんでした。');
          }
        }
      } else {
        alert('ブラウザのクリップボード読み取り権限がないため、下の貼り付け欄に直接ペーストしてください。');
      }
    } catch (err) {
      alert('クリップボードの読み取りに失敗しました。下の入力欄にCtrl+Vで貼り付けてください。');
    }
  };

  // 緯度・経度入力欄での直接ペースト時も自動判定
  const handleInputPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text');
    if (pasted && (pasted.includes(',') || pasted.includes(' ') || pasted.includes('\t'))) {
      const ok = applyPastedText(pasted);
      if (ok) {
        e.preventDefault();
      }
    }
  };

  // あなたの回答地点を反映
  const handleApplyUserCoords = () => {
    if (userCoordinates) {
      setLatInput(userCoordinates.latitude.toFixed(6));
      setLngInput(userCoordinates.longitude.toFixed(6));
      setPasteNotice('📍 あなたの回答地点の座標を反映しました');
      setTimeout(() => setPasteNotice(null), 3000);
    }
  };

  // 現在の正解地点を反映して微調整
  const handleApplyOriginalCoords = () => {
    setLatInput(originalCoordinates.latitude.toFixed(6));
    setLngInput(originalCoordinates.longitude.toFixed(6));
    setPasteNotice('🏟️ 現在の正解地点の座標を反映しました');
    setTimeout(() => setPasteNotice(null), 3000);
  };

  // 手動で地点を反映（地図ピッカー展開）
  const handleToggleMapPicker = () => {
    setShowMapPicker((prev) => !prev);
  };

  // ピッカー地図の初期化と更新
  useEffect(() => {
    if (!showMapPicker || !mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const centerLat = !isNaN(latNum) && isValidCoordinates(latNum, lngNum) ? latNum : originalCoordinates.latitude;
      const centerLng = !isNaN(lngNum) && isValidCoordinates(latNum, lngNum) ? lngNum : originalCoordinates.longitude;

      const map = L.map(mapContainerRef.current, {
        zoomControl: true,
      }).setView([centerLat, centerLng], 14);

      L.tileLayer('https://tile.openstreetmap.jp/styles/osm-bright-ja/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      // 1. 回答地点ピン（青）
      if (userCoordinates) {
        const uGmap = safeCreateGoogleMapSearchUrl(userCoordinates.latitude, userCoordinates.longitude);
        const userMarker = L.marker([userCoordinates.latitude, userCoordinates.longitude], {
          title: 'あなたの回答地点',
        }).addTo(map);
        userMarker.bindPopup(`
          <div class="marker-popup-bubble">
            <div class="marker-popup-header">📍 あなたの回答地点</div>
            <div class="marker-popup-coords">北緯 ${userCoordinates.latitude.toFixed(6)}°, 東経 ${userCoordinates.longitude.toFixed(6)}°</div>
            ${uGmap ? `<a href="${uGmap}" target="_blank" rel="noopener noreferrer" class="marker-popup-gmap-btn user-btn">🗺️ Googleマップで確認</a>` : ''}
          </div>
        `);
      }

      // 2. 正解地点ピン（赤）
      const cGmap = safeCreateGoogleMapSearchUrl(originalCoordinates.latitude, originalCoordinates.longitude);
      const correctMarker = L.marker([originalCoordinates.latitude, originalCoordinates.longitude], {
        title: originalName || '正解地点',
      }).addTo(map);
      correctMarker.bindPopup(`
        <div class="marker-popup-bubble">
          <div class="marker-popup-header">🏟️ 正解地点${originalName ? ` (${originalName})` : ''}</div>
          <div class="marker-popup-coords">北緯 ${originalCoordinates.latitude.toFixed(6)}°, 東経 ${originalCoordinates.longitude.toFixed(6)}°</div>
          ${cGmap ? `<a href="${cGmap}" target="_blank" rel="noopener noreferrer" class="marker-popup-gmap-btn correct-btn">🗺️ Googleマップで確認</a>` : ''}
        </div>
      `);

      // 3. 修正提案ピン（初期値）
      if (isCoordsValid) {
        const rGmap = safeCreateGoogleMapSearchUrl(latNum, lngNum);
        reportMarkerRef.current = L.marker([latNum, lngNum], {
          title: '修正提案地点',
        }).addTo(map);
        reportMarkerRef.current.bindPopup(`
          <div class="marker-popup-bubble">
            <div class="marker-popup-header">⚠️ 修正提案地点</div>
            <div class="marker-popup-coords">北緯 ${latNum.toFixed(6)}°, 東経 ${lngNum.toFixed(6)}°</div>
            ${rGmap ? `<a href="${rGmap}" target="_blank" rel="noopener noreferrer" class="marker-popup-gmap-btn report-btn">🗺️ Googleマップで確認</a>` : ''}
          </div>
        `);
      }

      // 地図クリックで地点を反映
      map.on('click', (e: L.LeafletMouseEvent) => {
        const clickedLat = Number(e.latlng.lat.toFixed(6));
        const clickedLng = Number(e.latlng.lng.toFixed(6));

        setLatInput(clickedLat.toFixed(6));
        setLngInput(clickedLng.toFixed(6));
        setPasteRawInput(`${clickedLat.toFixed(6)}, ${clickedLng.toFixed(6)}`);
        setPasteNotice(`📍 地図から地点を反映しました: (${clickedLat.toFixed(6)}, ${clickedLng.toFixed(6)})`);

        const rGmap = safeCreateGoogleMapSearchUrl(clickedLat, clickedLng);
        const popupContent = `
          <div class="marker-popup-bubble">
            <div class="marker-popup-header">⚠️ 修正提案地点</div>
            <div class="marker-popup-coords">北緯 ${clickedLat.toFixed(6)}°, 東経 ${clickedLng.toFixed(6)}°</div>
            ${rGmap ? `<a href="${rGmap}" target="_blank" rel="noopener noreferrer" class="marker-popup-gmap-btn report-btn">🗺️ Googleマップで確認</a>` : ''}
          </div>
        `;

        if (reportMarkerRef.current) {
          reportMarkerRef.current.setLatLng([clickedLat, clickedLng]);
          reportMarkerRef.current.setPopupContent(popupContent);
          reportMarkerRef.current.openPopup();
        } else {
          reportMarkerRef.current = L.marker([clickedLat, clickedLng], {
            title: '修正提案地点',
          }).addTo(map);
          reportMarkerRef.current.bindPopup(popupContent).openPopup();
        }
      });

      mapInstanceRef.current = map;

      // リサイズ補正
      setTimeout(() => {
        map.invalidateSize();
      }, 100);
    }
  }, [showMapPicker]);

  // モーダルが閉じた時の破棄処理
  useEffect(() => {
    if (!isOpen && mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
      reportMarkerRef.current = null;
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isCoordsValid) {
      setErrorMessage('有効な緯度 (-90〜90) と経度 (-180〜180) を入力してください。');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await submitQuestionReport({
        questionId,
        questionTitle,
        originalName,
        originalCoordinates,
        reportedCoordinates: {
          latitude: latNum,
          longitude: lngNum,
        },
        reportedName: nameInput.trim() || undefined,
        evidenceUrl: urlInput.trim() || undefined,
        comment: commentInput.trim() || undefined,
      });

      setSubmitSuccess(true);
    } catch (err: any) {
      setErrorMessage(err.message || '送信中にエラーが発生しました。');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="report-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="report-modal-title">
      <div className="report-modal-card neo-panel-card wide-card">
        <div className="report-modal-header">
          <div className="report-modal-title-group">
            <span className="report-badge">COORDINATES CORRECTION</span>
            <h3 id="report-modal-title" className="report-title">
              ⚠️ 問題・正解座標の修正報告
            </h3>
          </div>
          <button
            type="button"
            className="report-close-btn"
            onClick={onClose}
            aria-label="閉じる"
          >
            ✕
          </button>
        </div>

        {submitSuccess ? (
          <div className="report-success-state">
            <div className="success-icon" aria-hidden="true">✅</div>
            <h4 className="success-title">修正報告を受け付けました！</h4>
            <p className="success-desc">
              ご協力ありがとうございます。報告内容は管理サーバーに記録されました。
              管理者が確認の上、正解座標や名称の修正を反映いたします。
            </p>
            <button
              type="button"
              className="neo-action-btn primary-action-btn"
              onClick={onClose}
            >
              閉じる
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="report-modal-form">
            <div className="target-question-info-box">
              <div className="info-row">
                <span className="info-tag">対象問題:</span>
                <span className="info-val strong">{questionTitle}</span>
              </div>
              <div className="info-row">
                <span className="info-tag">登録名称:</span>
                <span className="info-val">{originalName || '（未設定）'}</span>
              </div>
              <div className="info-row">
                <span className="info-tag">現在座標:</span>
                <span className="info-val coords">
                  北緯 {originalCoordinates.latitude.toFixed(6)}°, 東経 {originalCoordinates.longitude.toFixed(6)}°
                </span>
              </div>
            </div>

            {errorMessage && (
              <div className="report-error-alert" role="alert">
                ⚠️ {errorMessage}
              </div>
            )}

            {/* 1. 座標修正（必須） */}
            <div className="form-field-group required-field">
              <div className="field-label-bar">
                <label className="field-label">
                  ① 修正後の緯度・経度 <span className="req-pill">必須</span>
                </label>
                <div className="quick-fill-btn-group">
                  <button
                    type="button"
                    className={`quick-fill-btn manual-map-btn ${showMapPicker ? 'active' : ''}`}
                    onClick={handleToggleMapPicker}
                    title="地図上で任意の位置をタップして緯度経度を自動反映します（回答ピン・正解ピン表示中）"
                  >
                    🗺️ {showMapPicker ? '地図を閉じる' : '手動で地点を反映'}
                  </button>
                  {userCoordinates && (
                    <button
                      type="button"
                      className="quick-fill-btn"
                      onClick={handleApplyUserCoords}
                      title="あなたが回答した地点の座標をコピーします"
                    >
                      📍 回答地点
                    </button>
                  )}
                  <button
                    type="button"
                    className="quick-fill-btn"
                    onClick={handleApplyOriginalCoords}
                    title="現在の正解地点の座標をコピーして微調整します"
                  >
                    🏟️ 正解地点
                  </button>
                </div>
              </div>

              {/* Googleマップ座標の一括自動貼り付けバー */}
              <div className="google-coords-paste-box">
                <div className="paste-input-wrapper">
                  <span className="paste-icon" aria-hidden="true">📋</span>
                  <input
                    type="text"
                    className="neo-input paste-raw-input"
                    placeholder="Googleマップからコピーした座標をここに貼り付け（例: 35.695957, 139.682124）"
                    value={pasteRawInput}
                    onChange={handlePasteRawChange}
                  />
                  <button
                    type="button"
                    className="clipboard-paste-btn"
                    onClick={handleReadClipboard}
                    title="クリップボードから自動貼り付け"
                  >
                    貼付け
                  </button>
                </div>
                {pasteNotice && (
                  <div className="paste-notice-message" role="status">
                    {pasteNotice}
                  </div>
                )}
              </div>

              {/* 手動地点反映インタラクティブ地図ピッカー */}
              {showMapPicker && (
                <div className="report-map-picker-wrapper">
                  <div className="picker-guide-bar">
                    <span className="guide-dot">●</span>
                    <span>地図上の任意の位置をクリック/タップすると、修正地点（⚠️）が自動入力されます。</span>
                    <span className="guide-pin-legend">
                      <span className="leg-item user-leg">📍 回答地点</span>
                      <span className="leg-item correct-leg">🏟️ 正解地点</span>
                      <span className="leg-item report-leg">⚠️ 修正地点</span>
                    </span>
                  </div>
                  <div ref={mapContainerRef} className="report-picker-map-canvas" style={{ width: '100%', height: '240px' }} />
                  <p className="picker-hint-note">※ 各ピンをクリックすると「Googleマップで確認」ボタンが表示されます。</p>
                </div>
              )}

              {/* 緯度・経度の個別入力フィールド（直接貼り付けでも自動分解） */}
              <div className="coords-dual-input-row">
                <div className="input-with-label">
                  <span className="unit-label">北緯 (LAT):</span>
                  <input
                    type="number"
                    step="any"
                    required
                    className="neo-input coords-input"
                    placeholder="例: 35.695957"
                    value={latInput}
                    onChange={(e) => setLatInput(e.target.value)}
                    onPaste={handleInputPaste}
                  />
                </div>
                <div className="input-with-label">
                  <span className="unit-label">東経 (LNG):</span>
                  <input
                    type="number"
                    step="any"
                    required
                    className="neo-input coords-input"
                    placeholder="例: 139.682124"
                    value={lngInput}
                    onChange={(e) => setLngInput(e.target.value)}
                    onPaste={handleInputPaste}
                  />
                </div>
              </div>
              {!isCoordsValid && latInput && lngInput && (
                <span className="field-hint-error">
                  ※ 緯度 (-90〜90)・経度 (-180〜180) の数値を入力してください。
                </span>
              )}
            </div>

            {/* 2. 名称修正（任意） */}
            <div className="form-field-group">
              <label className="field-label">
                ② 正しいスタジアム・施設名称 <span className="opt-pill">任意</span>
              </label>
              <input
                type="text"
                className="neo-input"
                placeholder="例: 正式名称、ネーミングライツ名、旧称など"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
              />
            </div>

            {/* 3. 参考URL（任意） */}
            <div className="form-field-group">
              <label className="field-label">
                ③ 参考リンク・エビデンスURL <span className="opt-pill">任意</span>
              </label>
              <input
                type="url"
                className="neo-input"
                placeholder="例: https://maps.google.com/... や公式サイトURL"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
              />
            </div>

            {/* 4. コメント・補足（任意） */}
            <div className="form-field-group">
              <label className="field-label">
                ④ 補足コメント <span className="opt-pill">任意</span>
              </label>
              <textarea
                className="neo-textarea"
                rows={2}
                placeholder="修正理由や位置の目印などの補足があれば入力してください"
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
              />
            </div>

            <div className="report-modal-actions">
              <button
                type="button"
                className="neo-action-btn cancel-btn"
                onClick={onClose}
                disabled={isSubmitting}
              >
                キャンセル
              </button>
              <button
                type="submit"
                className="neo-action-btn submit-btn"
                disabled={!isCoordsValid || isSubmitting}
              >
                {isSubmitting ? '送信中...' : '🚀 修正報告を送信'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
