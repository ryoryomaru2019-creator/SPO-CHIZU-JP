import React, { useState, useEffect } from 'react';
import { Question, Difficulty, Category } from '../types/game';
import {
  generateQuestionWithGemini,
  getGeminiApiKey,
  setGeminiApiKey,
  GeneratedQuestionPayload,
} from '../services/geminiQuestionService';
import {
  addQuestion,
  getStoredQuestions,
  exportQuestionsJson,
  saveStoredQuestions,
} from '../storage/questionStorage';
import { safeCreateGoogleMapSearchUrl } from '../utils/googleMapsUrls';

interface Message {
  id: string;
  sender: 'user' | 'gemini' | 'system';
  text: string;
  timestamp: string;
  generatedQuestions?: GeneratedQuestionItem[];
}

interface GeneratedQuestionItem extends GeneratedQuestionPayload {
  cardId: string;
  isAdded: boolean;
  isEditing: boolean;
}

interface BackupSnapshot {
  id: string;
  timestamp: string;
  count: number;
  data: Question[];
}

const BACKUP_STORAGE_KEY = 'sakachizu_questions_backups_v1';

export const AiQuestionGenerator: React.FC<{
  categories: Category[];
  onQuestionAdded?: () => void;
}> = ({ categories, onQuestionAdded }) => {
  const [apiKey, setApiKeyInput] = useState<string>('');
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [apiKeySavedNotice, setApiKeySavedNotice] = useState<boolean>(false);

  const [prompt, setPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [backups, setBackups] = useState<BackupSnapshot[]>([]);
  const [backupNotice, setBackupNotice] = useState<string | null>(null);

  // 初期ロード：APIキー＆バックアップ一覧取得
  useEffect(() => {
    const savedKey = getGeminiApiKey();
    setApiKeyInput(savedKey);

    try {
      const rawBackups = localStorage.getItem(BACKUP_STORAGE_KEY);
      if (rawBackups) {
        setBackups(JSON.parse(rawBackups));
      }
    } catch (e) {
      console.warn('バックアップの読み込みに失敗しました:', e);
    }

    // 初期システムメッセージ
    setMessages([
      {
        id: 'msg-welcome',
        sender: 'system',
        text: '🤖 Gemini AI 問題自動作成アシスタントが起動しました。\nスタジアム名、クラブ、歴史的名勝負、エピソードなどの要望を入力すると、問題文・正確な座標・タグ・エビデンスURLを自動生成し、問題カードを作成します。',
        timestamp: new Date().toLocaleTimeString(),
      },
    ]);
  }, []);

  // APIキーの保存
  const handleSaveApiKey = () => {
    setGeminiApiKey(apiKey);
    setApiKeySavedNotice(true);
    setTimeout(() => setApiKeySavedNotice(false), 3000);
  };

  // バックアップの作成
  const handleCreateBackup = () => {
    const currentQuestions = getStoredQuestions();
    const now = new Date();
    const newBackup: BackupSnapshot = {
      id: `backup-${Date.now()}`,
      timestamp: `${now.getFullYear()}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getDate().toString().padStart(2, '0')} ${now.toLocaleTimeString()}`,
      count: currentQuestions.length,
      data: currentQuestions,
    };
    const updated = [newBackup, ...backups.slice(0, 9)]; // 最新10件保持
    setBackups(updated);
    try {
      localStorage.setItem(BACKUP_STORAGE_KEY, JSON.stringify(updated));
      setBackupNotice(`バックアップを保存しました（全${currentQuestions.length}問）`);
      setTimeout(() => setBackupNotice(null), 4000);
    } catch (e) {
      alert('バックアップの保存に失敗しました。容量上限の可能性があります。');
    }
  };

  // バックアップからの復元
  const handleRestoreBackup = (b: BackupSnapshot) => {
    if (window.confirm(`「${b.timestamp}（${b.count}問）」のバックアップを復元しますか？現在のデータは上書きされます。`)) {
      saveStoredQuestions(b.data);
      if (onQuestionAdded) onQuestionAdded();
      alert('バックアップから正常に復元しました。');
    }
  };

  // JSONダウンロードエクスポート
  const handleDownloadQuestionsJson = () => {
    const jsonStr = exportQuestionsJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `questions-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Gemini APIへの送信
  const handleSendMessage = async (customPrompt?: string) => {
    const targetPrompt = (customPrompt || prompt).trim();
    if (!targetPrompt) return;

    if (!getGeminiApiKey().trim() && !apiKey.trim()) {
      setErrorMessage('Gemini APIキーを設定してください。上部の入力欄から設定できます。');
      return;
    }

    setErrorMessage(null);
    setIsLoading(true);

    const userMsgId = `user-${Date.now()}`;
    const newMessages: Message[] = [
      ...messages,
      {
        id: userMsgId,
        sender: 'user',
        text: targetPrompt,
        timestamp: new Date().toLocaleTimeString(),
      },
    ];
    setMessages(newMessages);
    setPrompt('');

    try {
      const result = await generateQuestionWithGemini(targetPrompt, apiKey);

      const items: GeneratedQuestionItem[] = result.questions.map((q, idx) => ({
        ...q,
        cardId: `gen-card-${Date.now()}-${idx}`,
        isAdded: false,
        isEditing: false,
      }));

      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          sender: 'gemini',
          text: `Geminiが ${items.length} 件の問題案を生成しました。以下の「問題カード」を確認・添削し、「✅ 問題集に追加（実装）」を押すと即時反映されます。`,
          timestamp: new Date().toLocaleTimeString(),
          generatedQuestions: items,
        },
      ]);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || '問題生成中にエラーが発生しました。');
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-err-${Date.now()}`,
          sender: 'system',
          text: `⚠️ エラー: ${err.message || 'Gemini APIの呼び出しに失敗しました。'}`,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // クイックプロンプト
  const quickPrompts = [
    '2026シーズン J1リーグ所属クラブの最新ホームスタジアムから2問作成して',
    '日本サッカーの歴史に残る大逆転劇や伝説の名勝負の舞台となったスタジアム',
    'Jリーグのマスコットキャラクターや名物グルメにまつわるスタジアム位置クイズ',
    'サッカー日本代表が激闘を繰り広げた聖地・名スタジアム（緯度経度正確に）',
    'J2・J3クラブの特色あるスタジアム（難問・エキスパート級）',
  ];

  // 問題を問題集に追加（実装）
  const handleAddQuestionToStore = (msgId: string, cardId: string) => {
    const targetMsg = messages.find((m) => m.id === msgId);
    if (!targetMsg || !targetMsg.generatedQuestions) return;

    const card = targetMsg.generatedQuestions.find((c) => c.cardId === cardId);
    if (!card || card.isAdded) return;

    // questionStorage に保存
    addQuestion({
      title: card.title,
      question: card.question,
      hint: card.hint,
      categoryId: card.categoryId,
      difficulty: card.difficulty,
      tags: card.tags,
      answer: {
        name: card.venueName,
        address: card.address,
        latitude: card.latitude,
        longitude: card.longitude,
      },
      isPublished: true,
    });

    // メッセージ内の状態を「追加済み」に更新
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== msgId || !m.generatedQuestions) return m;
        return {
          ...m,
          generatedQuestions: m.generatedQuestions.map((c) =>
            c.cardId === cardId ? { ...c, isAdded: true, isEditing: false } : c
          ),
        };
      })
    );

    if (onQuestionAdded) {
      onQuestionAdded();
    }
  };

  // カードの編集モード切替
  const handleToggleEditCard = (msgId: string, cardId: string) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== msgId || !m.generatedQuestions) return m;
        return {
          ...m,
          generatedQuestions: m.generatedQuestions.map((c) =>
            c.cardId === cardId ? { ...c, isEditing: !c.isEditing } : c
          ),
        };
      })
    );
  };

  // カードのフィールド変更
  const handleUpdateCardField = (
    msgId: string,
    cardId: string,
    field: keyof GeneratedQuestionItem,
    value: any
  ) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== msgId || !m.generatedQuestions) return m;
        return {
          ...m,
          generatedQuestions: m.generatedQuestions.map((c) => {
            if (c.cardId !== cardId) return c;
            return { ...c, [field]: value };
          }),
        };
      })
    );
  };

  // カードの削除
  const handleDeleteCard = (msgId: string, cardId: string) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== msgId || !m.generatedQuestions) return m;
        return {
          ...m,
          generatedQuestions: m.generatedQuestions.filter((c) => c.cardId !== cardId),
        };
      })
    );
  };

  return (
    <div className="ai-question-generator-container">
      {/* 上部ヘッダーコントロール */}
      <div className="ai-gen-top-bar">
        <div className="ai-api-key-panel">
          <label className="ai-key-label">
            🔑 Gemini API Key:
          </label>
          <div className="ai-key-input-wrap">
            <input
              type={showApiKey ? 'text' : 'password'}
              className="ai-key-input"
              value={apiKey}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="AIzaSy... （Google AI StudioのAPIキー）"
            />
            <button
              type="button"
              className="ai-toggle-show-btn"
              onClick={() => setShowApiKey(!showApiKey)}
              title={showApiKey ? '隠す' : '表示'}
            >
              {showApiKey ? '🙈' : '👁️'}
            </button>
            <button
              type="button"
              className="primary-btn ai-save-key-btn"
              onClick={handleSaveApiKey}
            >
              💾 保存
            </button>
          </div>
          {apiKeySavedNotice && <span className="ai-saved-notice">✅ 保存しました！</span>}
        </div>

        {/* バックアップ・エクスポートアクション */}
        <div className="ai-data-actions">
          <button
            type="button"
            className="secondary-btn ai-backup-btn"
            onClick={handleCreateBackup}
            title="現在の問題データをブラウザ内にスナップショット保存"
          >
            💾 バックアップ作成
          </button>
          <button
            type="button"
            className="primary-btn ai-download-btn"
            onClick={handleDownloadQuestionsJson}
            title="最新の questions.json をローカルPCにダウンロード"
          >
            📥 questions.json 保存
          </button>
        </div>
      </div>

      {backupNotice && (
        <div className="ai-backup-toast">
          <span>{backupNotice}</span>
        </div>
      )}

      {/* バックアップ履歴ドロワー（存在する場合） */}
      {backups.length > 0 && (
        <details className="ai-backups-accordion">
          <summary className="ai-backups-summary">
            🗂️ 保存済みバックアップ履歴 ({backups.length}件)
          </summary>
          <div className="ai-backups-list">
            {backups.map((b) => (
              <div key={b.id} className="ai-backup-item">
                <span className="ai-backup-time">📅 {b.timestamp}</span>
                <span className="ai-backup-count">{b.count} 問</span>
                <button
                  type="button"
                  className="secondary-btn btn-sm"
                  onClick={() => handleRestoreBackup(b)}
                >
                  この時点に復元
                </button>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* エラー表示 */}
      {errorMessage && (
        <div className="ai-error-banner">
          <span>⚠️ {errorMessage}</span>
          <button type="button" className="close-btn" onClick={() => setErrorMessage(null)}>
            ×
          </button>
        </div>
      )}

      {/* クイックプロンプト候補 */}
      <div className="quick-prompts-container">
        <span className="quick-prompts-label">⚡ クイック作成アイデア:</span>
        <div className="quick-prompts-chips">
          {quickPrompts.map((qp, idx) => (
            <button
              key={idx}
              type="button"
              className="quick-chip-btn"
              onClick={() => handleSendMessage(qp)}
              disabled={isLoading}
            >
              {qp}
            </button>
          ))}
        </div>
      </div>

      {/* チャットタイムライン */}
      <div className="ai-chat-timeline">
        {messages.map((msg) => (
          <div key={msg.id} className={`ai-message-row ${msg.sender}`}>
            <div className="ai-avatar">
              {msg.sender === 'gemini' ? '🤖' : msg.sender === 'user' ? '👤' : '⚙️'}
            </div>
            <div className="ai-message-content">
              <div className="ai-message-header">
                <span className="ai-sender-name">
                  {msg.sender === 'gemini'
                    ? 'Gemini 2.5 Flash'
                    : msg.sender === 'user'
                    ? '管理者'
                    : 'System'}
                </span>
                <span className="ai-timestamp">{msg.timestamp}</span>
              </div>
              <div className="ai-message-text">{msg.text}</div>

              {/* 生成された問題カードリスト */}
              {msg.generatedQuestions && msg.generatedQuestions.length > 0 && (
                <div className="generated-cards-grid">
                  {msg.generatedQuestions.map((card) => {
                    const mapUrl = safeCreateGoogleMapSearchUrl(card.latitude, card.longitude);
                    return (
                      <div
                        key={card.cardId}
                        className={`gen-question-card ${card.isAdded ? 'is-added' : ''}`}
                      >
                        {card.isAdded && (
                          <div className="card-added-badge">
                            ✅ 問題集に実装済み
                          </div>
                        )}

                        {!card.isEditing ? (
                          // 表示モード
                          <div className="card-body">
                            <div className="card-top-row">
                              <span className={`difficulty-tag difficulty-${card.difficulty}`}>
                                {card.difficulty === 'easy'
                                  ? '初級'
                                  : card.difficulty === 'medium'
                                  ? '中級'
                                  : card.difficulty === 'hard'
                                  ? '上級'
                                  : '激ムズ'}
                              </span>
                              <span className="category-tag-badge">
                                📂 {categories.find((c) => c.id === card.categoryId)?.name || card.categoryId}
                              </span>
                              <div className="tags-list">
                                {card.tags.map((t, tidx) => (
                                  <span key={tidx} className="cyber-tag-chip">
                                    #{t}
                                  </span>
                                ))}
                              </div>
                            </div>

                            <h4 className="card-title">{card.title}</h4>
                            <p className="card-question-text">{card.question}</p>

                            <div className="card-venue-info">
                              <div className="venue-name-row">
                                <span className="label">🏟️ 会場名:</span>
                                <strong className="value">{card.venueName}</strong>
                              </div>
                              {card.address && (
                                <div className="venue-address-row">
                                  <span className="label">📍 所在地:</span>
                                  <span className="value">{card.address}</span>
                                </div>
                              )}
                              <div className="venue-coords-row">
                                <span className="label">🌐 座標:</span>
                                <span className="coords-val">
                                  [{card.latitude.toFixed(6)}, {card.longitude.toFixed(6)}]
                                </span>
                                {mapUrl && (
                                  <a
                                    href={mapUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="gmaps-link-btn"
                                  >
                                    🗺️ Googleマップで位置確認
                                  </a>
                                )}
                              </div>
                            </div>

                            {card.hint && (
                              <div className="card-hint-row">
                                <span className="label">💡 ヒント:</span>
                                <span className="value">{card.hint}</span>
                              </div>
                            )}

                            {card.evidenceUrl && (
                              <div className="card-evidence-row">
                                <span className="label">🔗 エビデンス:</span>
                                <a
                                  href={card.evidenceUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="evidence-link"
                                >
                                  {card.evidenceUrl}
                                </a>
                              </div>
                            )}

                            {card.aiExplanation && (
                              <div className="card-ai-memo">
                                <span className="memo-title">📝 AI根拠メモ:</span>
                                <p>{card.aiExplanation}</p>
                              </div>
                            )}

                            {/* アクションボタン */}
                            <div className="card-actions-bar">
                              {!card.isAdded ? (
                                <button
                                  type="button"
                                  className="primary-btn add-to-game-btn"
                                  onClick={() => handleAddQuestionToStore(msg.id, card.cardId)}
                                >
                                  ✅ この問題を問題集に追加（実装）
                                </button>
                              ) : (
                                <button type="button" className="secondary-btn" disabled>
                                  実装完了
                                </button>
                              )}

                              <button
                                type="button"
                                className="secondary-btn edit-card-btn"
                                onClick={() => handleToggleEditCard(msg.id, card.cardId)}
                              >
                                ✏️ 添削・編集
                              </button>

                              <button
                                type="button"
                                className="secondary-btn delete-card-btn"
                                onClick={() => handleDeleteCard(msg.id, card.cardId)}
                              >
                                🗑️ 破棄
                              </button>
                            </div>
                          </div>
                        ) : (
                          // 編集モード
                          <div className="card-edit-form">
                            <h5 className="edit-form-heading">✏️ 問題カードの添削・修正</h5>

                            <div className="form-group">
                              <label>タイトル:</label>
                              <input
                                type="text"
                                className="cyber-edit-input"
                                value={card.title}
                                onChange={(e) =>
                                  handleUpdateCardField(msg.id, card.cardId, 'title', e.target.value)
                                }
                              />
                            </div>

                            <div className="form-group">
                              <label>問題文:</label>
                              <textarea
                                className="cyber-edit-textarea"
                                rows={3}
                                value={card.question}
                                onChange={(e) =>
                                  handleUpdateCardField(msg.id, card.cardId, 'question', e.target.value)
                                }
                              />
                            </div>

                            <div className="form-row-2col">
                              <div className="form-group">
                                <label>正解会場名:</label>
                                <input
                                  type="text"
                                  className="cyber-edit-input"
                                  value={card.venueName}
                                  onChange={(e) =>
                                    handleUpdateCardField(msg.id, card.cardId, 'venueName', e.target.value)
                                  }
                                />
                              </div>
                              <div className="form-group">
                                <label>所在地住所:</label>
                                <input
                                  type="text"
                                  className="cyber-edit-input"
                                  value={card.address || ''}
                                  onChange={(e) =>
                                    handleUpdateCardField(msg.id, card.cardId, 'address', e.target.value)
                                  }
                                />
                              </div>
                            </div>

                            <div className="form-row-2col">
                              <div className="form-group">
                                <label>緯度 (Latitude):</label>
                                <input
                                  type="number"
                                  step="0.0001"
                                  className="cyber-edit-input"
                                  value={card.latitude}
                                  onChange={(e) =>
                                    handleUpdateCardField(
                                      msg.id,
                                      card.cardId,
                                      'latitude',
                                      parseFloat(e.target.value) || 0
                                    )
                                  }
                                />
                              </div>
                              <div className="form-group">
                                <label>経度 (Longitude):</label>
                                <input
                                  type="number"
                                  step="0.0001"
                                  className="cyber-edit-input"
                                  value={card.longitude}
                                  onChange={(e) =>
                                    handleUpdateCardField(
                                      msg.id,
                                      card.cardId,
                                      'longitude',
                                      parseFloat(e.target.value) || 0
                                    )
                                  }
                                />
                              </div>
                            </div>

                            <div className="form-row-2col">
                              <div className="form-group">
                                <label>難易度:</label>
                                <select
                                  className="cyber-edit-select"
                                  value={card.difficulty}
                                  onChange={(e) =>
                                    handleUpdateCardField(
                                      msg.id,
                                      card.cardId,
                                      'difficulty',
                                      e.target.value as Difficulty
                                    )
                                  }
                                >
                                  <option value="easy">初級 (Easy)</option>
                                  <option value="medium">中級 (Medium)</option>
                                  <option value="hard">上級 (Hard)</option>
                                  <option value="expert">激ムズ (Expert)</option>
                                </select>
                              </div>
                              <div className="form-group">
                                <label>カテゴリ:</label>
                                <select
                                  className="cyber-edit-select"
                                  value={card.categoryId}
                                  onChange={(e) =>
                                    handleUpdateCardField(
                                      msg.id,
                                      card.cardId,
                                      'categoryId',
                                      e.target.value
                                    )
                                  }
                                >
                                  {categories.map((c) => (
                                    <option key={c.id} value={c.id}>
                                      {c.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            <div className="form-group">
                              <label>ヒント:</label>
                              <input
                                type="text"
                                className="cyber-edit-input"
                                value={card.hint}
                                onChange={(e) =>
                                  handleUpdateCardField(msg.id, card.cardId, 'hint', e.target.value)
                                }
                              />
                            </div>

                            <div className="form-group">
                              <label>エビデンスURL:</label>
                              <input
                                type="url"
                                className="cyber-edit-input"
                                value={card.evidenceUrl || ''}
                                onChange={(e) =>
                                  handleUpdateCardField(msg.id, card.cardId, 'evidenceUrl', e.target.value)
                                }
                              />
                            </div>

                            <div className="edit-form-actions">
                              <button
                                type="button"
                                className="primary-btn btn-sm"
                                onClick={() => handleToggleEditCard(msg.id, card.cardId)}
                              >
                                💾 添削を完了
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="ai-message-row gemini ai-loading-row">
            <div className="ai-avatar">🤖</div>
            <div className="ai-message-content">
              <div className="ai-loading-indicator">
                <span className="cyber-spinner"></span>
                <span>Gemini が位置・スタジアム情報・エビデンスURLを解析中... 問題カードを生成しています</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* チャット入力バー */}
      <div className="ai-chat-input-bar">
        <textarea
          className="ai-prompt-textarea"
          rows={2}
          placeholder="作成したい問題のテーマや条件を入力（例:『2026年最新のJ1スタジアムからサポーターの聖地に関する問題を2問作成して』）..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          disabled={isLoading}
        />
        <button
          type="button"
          className="primary-btn ai-send-btn"
          onClick={() => handleSendMessage()}
          disabled={isLoading || !prompt.trim()}
        >
          {isLoading ? '生成中...' : '🚀 AI作成 (Ctrl+Enter)'}
        </button>
      </div>
    </div>
  );
};
