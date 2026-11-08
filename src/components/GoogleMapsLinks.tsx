import React, { useState } from 'react';
import { Coordinates } from '../types/game';
import {
  safeCreateGoogleStreetViewUrl,
  safeCreateGoogleMapSearchUrl,
} from '../utils/googleMapsUrls';
import { ReportQuestionModal } from './ReportQuestionModal';

interface GoogleMapsLinksProps {
  userCoordinates?: Coordinates | null;
  correctCoordinates: Coordinates;
  stadiumName?: string;
  showConfirmDialog?: boolean;
  questionId?: string;
  questionTitle?: string;
}

export const GoogleMapsLinks: React.FC<GoogleMapsLinksProps> = ({
  userCoordinates,
  correctCoordinates,
  stadiumName,
  showConfirmDialog = false,
  questionId,
  questionTitle,
}) => {
  const [pendingUrl, setPendingUrl] = useState<{ url: string; title: string } | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);

  // 正解地点のURL
  const correctMapUrl = safeCreateGoogleMapSearchUrl(
    correctCoordinates.latitude,
    correctCoordinates.longitude
  );
  const correctSvUrl = safeCreateGoogleStreetViewUrl(
    correctCoordinates.latitude,
    correctCoordinates.longitude
  );

  // 回答地点のURL
  const userMapUrl = userCoordinates
    ? safeCreateGoogleMapSearchUrl(userCoordinates.latitude, userCoordinates.longitude)
    : null;
  const userSvUrl = userCoordinates
    ? safeCreateGoogleStreetViewUrl(userCoordinates.latitude, userCoordinates.longitude)
    : null;

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, url: string, title: string) => {
    if (showConfirmDialog) {
      e.preventDefault();
      setPendingUrl({ url, title });
    }
  };

  const confirmOpen = () => {
    if (pendingUrl) {
      window.open(pendingUrl.url, '_blank', 'noopener,noreferrer');
      setPendingUrl(null);
    }
  };

  const cancelOpen = () => {
    setPendingUrl(null);
  };

  return (
    <div className="google-maps-links-container" aria-label="Google Maps外部リンク">
      <div className="links-header">
        <h4 className="links-title">
          <span className="links-icon" aria-hidden="true">🗺️</span>
          Google Maps で確認する（外部リンク）
        </h4>
        <p className="links-caution">
          ※ Google Mapsが別タブで開きます。Street Viewがない場所では、周辺の地図や近隣の画像が表示される場合があります。
        </p>
      </div>

      <div className="links-two-choice-wrapper">
        {/* 正解地点（スタジアム） */}
        <div className="maps-location-card correct-card">
          <div className="location-card-title">
            <span className="loc-icon" aria-hidden="true">🏟️</span>
            <span className="loc-title-text">
              正解地点{stadiumName ? ` (${stadiumName})` : ''}
            </span>
          </div>
          <div className="two-choice-grid">
            {correctMapUrl && (
              <a
                href={correctMapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="choice-btn map-choice-btn"
                onClick={(e) =>
                  handleLinkClick(e, correctMapUrl, `正解地点（${stadiumName || ''}）の周辺マップ`)
                }
                aria-label="Google Mapsで正解地点の周辺マップを見る（新しいタブで開く）"
              >
                <span className="btn-icon" aria-hidden="true">🗺️</span>
                <span className="btn-text">周辺マップ</span>
              </a>
            )}
            {correctSvUrl && (
              <a
                href={correctSvUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="choice-btn sv-choice-btn"
                onClick={(e) =>
                  handleLinkClick(e, correctSvUrl, `正解地点（${stadiumName || ''}）のストリートビュー`)
                }
                aria-label="Google Mapsで正解地点のストリートビューを見る（新しいタブで開く）"
              >
                <span className="btn-icon" aria-hidden="true">📷</span>
                <span className="btn-text">ストリートビュー</span>
              </a>
            )}
          </div>
        </div>

        {/* あなたの回答地点 */}
        {userCoordinates && (
          <div className="maps-location-card user-card">
            <div className="location-card-title">
              <span className="loc-icon" aria-hidden="true">📍</span>
              <span className="loc-title-text">あなたの回答地点</span>
            </div>
            <div className="two-choice-grid">
              {userMapUrl && (
                <a
                  href={userMapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="choice-btn map-choice-btn user-btn"
                  onClick={(e) => handleLinkClick(e, userMapUrl, '回答地点の周辺マップ')}
                  aria-label="Google Mapsであなたの回答地点の周辺マップを見る（新しいタブで開く）"
                >
                  <span className="btn-icon" aria-hidden="true">🗺️</span>
                  <span className="btn-text">周辺マップ</span>
                </a>
              )}
              {userSvUrl && (
                <a
                  href={userSvUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="choice-btn sv-choice-btn user-btn"
                  onClick={(e) => handleLinkClick(e, userSvUrl, '回答地点のストリートビュー')}
                  aria-label="Google Mapsであなたの回答地点のストリートビューを見る（新しいタブで開く）"
                >
                  <span className="btn-icon" aria-hidden="true">📷</span>
                  <span className="btn-text">ストリートビュー</span>
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 問題・座標の修正報告ボタン */}
      <div className="report-issue-trigger-row">
        <button
          type="button"
          className="report-issue-trigger-btn"
          onClick={() => setIsReportModalOpen(true)}
          title="正解座標やスタジアム名称の間違い・ズレを管理者に報告する"
        >
          <span className="report-btn-icon" aria-hidden="true">⚠️</span>
          <span className="report-btn-text">問題を報告（座標・名称の修正提案）</span>
        </button>
      </div>

      {/* 問題報告モーダル */}
      <ReportQuestionModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        questionId={questionId || ''}
        questionTitle={questionTitle || '該当問題'}
        originalName={stadiumName || ''}
        originalCoordinates={correctCoordinates}
        userCoordinates={userCoordinates}
      />

      {pendingUrl && (
        <div className="confirm-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="confirm-modal-title">
          <div className="confirm-modal-card">
            <h3 id="confirm-modal-title">外部サイト（Google Maps）へ移動します</h3>
            <p className="confirm-modal-desc">
              「{pendingUrl.title}」を新しいタブで開きます。よろしいですか？
            </p>
            <p className="confirm-modal-note">
              ※ Google Mapsの画像やストリートビューはGoogle社の提供する外部リンク先で表示されます。
            </p>
            <div className="confirm-modal-actions">
              <button
                type="button"
                className="modal-btn cancel-btn"
                onClick={cancelOpen}
              >
                キャンセル
              </button>
              <button
                type="button"
                className="modal-btn confirm-btn"
                onClick={confirmOpen}
              >
                開く
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
