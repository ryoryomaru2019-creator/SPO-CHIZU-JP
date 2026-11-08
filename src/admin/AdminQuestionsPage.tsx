import React, { useState } from 'react';
import categoriesData from '../data/categories.json';
import { Category, Question, QuestionFilter } from '../types/game';
import {
  addQuestion,
  deleteQuestion,
  duplicateQuestion,
  getStoredQuestions,
  resetStoredQuestions,
  togglePublishStatus,
  updateQuestion,
} from '../storage/questionStorage';
import { QuestionTable } from './QuestionTable';
import { QuestionEditor } from './QuestionEditor';
import { QuestionImportExport } from './QuestionImportExport';
import { GameSettingsEditor } from './GameSettingsEditor';
import { QuestionReportsManager } from './QuestionReportsManager';
import { AiQuestionGenerator } from './AiQuestionGenerator';
import { AdminRankingsManager } from './AdminRankingsManager';
import { getStoredReports } from '../storage/reportStorage';

interface AdminQuestionsPageProps {
  onBackToGame: () => void;
  isStandalone?: boolean;
}

export const AdminQuestionsPage: React.FC<AdminQuestionsPageProps> = ({
  onBackToGame,
  isStandalone = false,
}) => {
  const [activeTab, setActiveTab] = useState<'questions' | 'settings' | 'reports' | 'ai-generator' | 'rankings'>('questions');
  const [questions, setQuestions] = useState<Question[]>(() => getStoredQuestions());
  const categories: Category[] = categoriesData;
  const pendingReportsCount = getStoredReports().filter((r) => r.status === 'pending').length;

  // 問題データ再読み込み
  const handleRefreshQuestions = () => {
    setQuestions(getStoredQuestions());
  };

  const [filter, setFilter] = useState<QuestionFilter>({
    searchQuery: '',
    categoryId: 'all',
    difficulty: 'all',
    publishStatus: 'all',
  });

  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [isCreating, setIsCreating] = useState<boolean>(false);

  // フィルタ更新
  const handleFilterChange = (newFilter: Partial<QuestionFilter>) => {
    setFilter((prev) => ({ ...prev, ...newFilter }));
  };

  // 新規作成保存
  const handleSaveQuestion = (
    data: Omit<Question, 'id' | 'createdAt' | 'updatedAt'>,
    existingId?: string
  ) => {
    if (existingId) {
      const existing = questions.find((q) => q.id === existingId);
      if (existing) {
        const updated = updateQuestion({
          ...existing,
          ...data,
        });
        setQuestions(updated);
      }
    } else {
      const updated = addQuestion(data);
      setQuestions(updated);
    }
    setEditingQuestion(null);
    setIsCreating(false);
  };

  // 複製
  const handleDuplicate = (id: string) => {
    const updated = duplicateQuestion(id);
    setQuestions(updated);
  };

  // 削除
  const handleDelete = (id: string) => {
    const updated = deleteQuestion(id);
    setQuestions(updated);
  };

  // インライン問題直接更新
  const handleUpdateSingleQuestion = (updatedQuestion: Question) => {
    const updated = updateQuestion(updatedQuestion);
    setQuestions(updated);
  };

  // 一括公開/非公開
  const handleBatchUpdatePublish = (ids: string[], isPublished: boolean) => {
    const current = getStoredQuestions();
    const today = new Date().toISOString().split('T')[0];
    const idSet = new Set(ids);
    const updated = current.map((q) =>
      idSet.has(q.id) ? { ...q, isPublished, updatedAt: today } : q
    );
    setQuestions(updated);
  };

  // 一括削除
  const handleBatchDelete = (ids: string[]) => {
    const current = getStoredQuestions();
    const idSet = new Set(ids);
    const updated = current.filter((q) => !idSet.has(q.id));
    setQuestions(updated);
  };

  // 公開トグル
  const handleTogglePublish = (id: string) => {
    const updated = togglePublishStatus(id);
    setQuestions(updated);
  };

  // 初期データへのリセット
  const handleResetToDefault = () => {
    if (window.confirm('初期JSONデータにリセットしますか？ブラウザに保存された編集内容は破棄されます。')) {
      const updated = resetStoredQuestions();
      setQuestions(updated);
    }
  };

  return (
    <div className="admin-page-container">
      <header className="admin-header">
        <div className="admin-header-inner">
          <div className="admin-brand">
            <h1>⚙️ 問題管理画面 (Admin Questions)</h1>
            <span className="admin-badge">管理者モード</span>
          </div>

          <div className="admin-header-actions">
            {activeTab === 'questions' && (
              <>
                <button
                  type="button"
                  className="secondary-btn reset-default-btn"
                  onClick={handleResetToDefault}
                  title="初期の問題データ（JSON）に戻す"
                >
                  🔄 初期データにリセット
                </button>

                <button
                  type="button"
                  className="primary-btn new-question-btn"
                  onClick={() => setIsCreating(true)}
                >
                  ➕ 新しい問題を作成
                </button>
              </>
            )}

            {!isStandalone && (
              <a
                href="/admin.html"
                target="_blank"
                rel="noopener noreferrer"
                className="secondary-btn standalone-link-btn"
                title="ブラウザの別タブで独立管理コンソールを起動"
              >
                🖥️ 独立管理ツール (admin.html)
              </a>
            )}

            <button
              type="button"
              className="secondary-btn back-to-game-btn"
              onClick={onBackToGame}
            >
              ⚽ {isStandalone ? 'ゲームを別タブで開く' : 'ゲームに戻る'}
            </button>
          </div>
        </div>

        {/* 管理タブナビゲーション */}
        <div className="admin-tab-bar" role="tablist" aria-label="管理画面の機能切り替え">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'questions'}
            className={`admin-tab-nav-btn ${activeTab === 'questions' ? 'active' : ''}`}
            onClick={() => setActiveTab('questions')}
          >
            📋 問題データ管理 ({questions.length}問)
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'ai-generator'}
            className={`admin-tab-nav-btn ai-tab-btn ${activeTab === 'ai-generator' ? 'active' : ''}`}
            onClick={() => setActiveTab('ai-generator')}
          >
            🤖 AI自動問題作成 (Gemini)
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'reports'}
            className={`admin-tab-nav-btn ${activeTab === 'reports' ? 'active' : ''}`}
            onClick={() => setActiveTab('reports')}
          >
            ⚠️ 修正報告・承認管理 {pendingReportsCount > 0 && <span className="tab-pending-badge">{pendingReportsCount}</span>}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'rankings'}
            className={`admin-tab-nav-btn ${activeTab === 'rankings' ? 'active' : ''}`}
            onClick={() => setActiveTab('rankings')}
          >
            🏆 世界ランキング管理
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'settings'}
            className={`admin-tab-nav-btn ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            ⚙️ ゲームルール・パラメータ設定
          </button>
        </div>
      </header>

      <main className="admin-main-content">
        {activeTab === 'questions' && (
          <>
            {/* インポート・エクスポートバー */}
            <section className="admin-section import-export-section">
              <QuestionImportExport
                questions={questions}
                onQuestionsUpdated={(updated) => setQuestions(updated)}
              />
            </section>

            {/* 問題一覧テーブル */}
            <section className="admin-section table-section">
              <QuestionTable
                questions={questions}
                categories={categories}
                filter={filter}
                onFilterChange={handleFilterChange}
                onEdit={(q) => setEditingQuestion(q)}
                onDuplicate={handleDuplicate}
                onDelete={handleDelete}
                onTogglePublish={handleTogglePublish}
                onUpdateQuestion={handleUpdateSingleQuestion}
                onBatchUpdatePublish={handleBatchUpdatePublish}
                onBatchDelete={handleBatchDelete}
              />
            </section>
          </>
        )}

        {activeTab === 'ai-generator' && (
          <section className="admin-section ai-generator-section">
            <AiQuestionGenerator
              categories={categories}
              onQuestionAdded={handleRefreshQuestions}
            />
          </section>
        )}

        {activeTab === 'reports' && (
          <section className="admin-section reports-section">
            <QuestionReportsManager />
          </section>
        )}

        {activeTab === 'rankings' && (
          <section className="admin-section rankings-section">
            <AdminRankingsManager />
          </section>
        )}

        {activeTab === 'settings' && (
          <section className="admin-section settings-section">
            <GameSettingsEditor />
          </section>
        )}
      </main>

      {/* 新規作成・編集モーダル */}
      {(isCreating || editingQuestion) && (
        <QuestionEditor
          initialQuestion={editingQuestion}
          categories={categories}
          onSave={handleSaveQuestion}
          onCancel={() => {
            setIsCreating(false);
            setEditingQuestion(null);
          }}
        />
      )}
    </div>
  );
};

