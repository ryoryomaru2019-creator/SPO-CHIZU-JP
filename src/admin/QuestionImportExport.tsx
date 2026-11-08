import React, { useState, useRef } from 'react';
import { Question } from '../types/game';
import { exportQuestionsJson, importQuestionsJson } from '../storage/questionStorage';

interface QuestionImportExportProps {
  questions: Question[];
  onQuestionsUpdated: (questions: Question[]) => void;
}

export const QuestionImportExport: React.FC<QuestionImportExportProps> = ({
  questions,
  onQuestionsUpdated,
}) => {
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [isError, setIsError] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // JSONファイルダウンロード
  const handleExport = () => {
    try {
      const jsonStr = exportQuestionsJson(questions);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sakachizu_questions_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setImportStatus('JSONファイルをダウンロードしました。');
      setIsError(false);
    } catch (err: any) {
      setImportStatus(`エクスポートに失敗しました: ${err.message}`);
      setIsError(true);
    }
  };

  // ファイルアップロードによるインポート
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) return;

      const result = importQuestionsJson(content);
      if (result.success && result.questions) {
        onQuestionsUpdated(result.questions);
        setImportStatus(`正常に ${result.questions.length} 問の問題をインポートしました！`);
        setIsError(false);
      } else {
        setImportStatus(`インポートエラー: ${result.error}`);
        setIsError(true);
      }
    };
    reader.onerror = () => {
      setImportStatus('ファイルの読み込みに失敗しました。');
      setIsError(true);
    };
    reader.readAsText(file);

    // リセットして再選択可能に
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="import-export-container">
      <div className="import-export-actions">
        <button
          type="button"
          className="secondary-btn"
          onClick={handleExport}
          title="現在の問題データをJSONファイルとしてダウンロード"
        >
          📥 JSONエクスポート
        </button>

        <label className="secondary-btn file-upload-label" title="JSONファイルを選択して問題をインポート">
          📤 JSONインポート
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileChange}
            className="sr-only"
          />
        </label>
      </div>

      {importStatus && (
        <div
          className={`status-message ${isError ? 'error-status' : 'success-status'}`}
          role="status"
        >
          {importStatus}
        </div>
      )}
    </div>
  );
};

