import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QuestionPanel } from '../src/components/QuestionPanel';
import { ResultPanel } from '../src/components/ResultPanel';
import { FinalResult } from '../src/components/FinalResult';
import { GoogleMapsLinks } from '../src/components/GoogleMapsLinks';
import { GameMap } from '../src/components/GameMap';
import { Question, RoundResult } from '../src/types/game';

describe('UI Components', () => {
  const dummyQuestion: Question = {
    id: 'q001',
    title: 'テストスタジアムを探そう',
    question: 'このスタジアムはどこにあるでしょうか？',
    hint: '首都圏にあります。',
    categoryId: 'national-team',
    difficulty: 'easy',
    tags: ['テスト'],
    isPublished: true,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    answer: {
      name: '国立競技場',
      address: '東京都新宿区霞ヶ丘町10-1',
      latitude: 35.6778,
      longitude: 139.7145,
    },
  };

  const dummyRoundResult: RoundResult = {
    questionId: 'q001',
    questionTitle: 'テストスタジアムを探そう',
    stadiumName: '国立競技場',
    userCoordinates: { latitude: 35.68, longitude: 139.71 },
    correctCoordinates: { latitude: 35.6778, longitude: 139.7145 },
    distanceKm: 0.45,
    score: 4600,
  };

  describe('QuestionPanel', () => {
    it('standbyモード（開始前）は問題文やタイトルが非表示で「問題スタート！」ボタンが表示されること', () => {
      const onStart = vi.fn();
      render(
        <QuestionPanel
          question={dummyQuestion}
          questionNumber={1}
          totalQuestions={5}
          totalScore={0}
          selectedCoordinates={null}
          questionStage="standby"
          onStartQuestion={onStart}
          onSubmitAnswer={vi.fn()}
        />
      );

      // 問題文やタイトルは非表示であること（カンニング防止）
      expect(screen.queryByText(dummyQuestion.title)).not.toBeInTheDocument();
      expect(screen.queryByText(dummyQuestion.question)).not.toBeInTheDocument();

      // 問題スタートボタンが存在しクリックできること
      const startBtn = screen.getByRole('button', { name: /問題スタート/i });
      expect(startBtn).toBeInTheDocument();
      fireEvent.click(startBtn);
      expect(onStart).toHaveBeenCalledTimes(1);
    });

    it('回答ピン未設定時は「回答を確定する」ボタンが無効化されていること', () => {
      const onSubmit = vi.fn();
      render(
        <QuestionPanel
          question={dummyQuestion}
          questionNumber={1}
          totalQuestions={5}
          totalScore={0}
          selectedCoordinates={null}
          onSubmitAnswer={onSubmit}
        />
      );

      const submitButton = screen.getByRole('button', { name: /回答を確定/i });
      expect(submitButton).toBeDisabled();

      fireEvent.click(submitButton);
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('回答ピン設定時は「回答を確定する」ボタンが有効化されクリックできること', () => {
      const onSubmit = vi.fn();
      render(
        <QuestionPanel
          question={dummyQuestion}
          questionNumber={1}
          totalQuestions={5}
          totalScore={0}
          selectedCoordinates={{ latitude: 35.68, longitude: 139.71 }}
          onSubmitAnswer={onSubmit}
        />
      );

      const submitButton = screen.getByRole('button', { name: /回答を確定する/i });
      expect(submitButton).not.toBeDisabled();

      fireEvent.click(submitButton);
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
  });

  describe('ResultPanel', () => {
    it('回答確定後の結果（会場名、距離、スコア）が正しく表示されること', () => {
      const onNext = vi.fn();
      render(
        <ResultPanel
          roundResult={dummyRoundResult}
          roundNumber={1}
          totalRounds={5}
          isLastQuestion={false}
          onNext={onNext}
        />
      );

      expect(screen.getByText('国立競技場')).toBeInTheDocument();
      expect(screen.getByText('450m')).toBeInTheDocument();
      expect(screen.getByText('4600 点')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /次の問題へ/i })).toBeInTheDocument();
    });
  });

  describe('FinalResult', () => {
    it('最終結果画面で合計スコア・平均距離・もう一度遊ぶボタンが表示されること', () => {
      const onRestart = vi.fn();
      render(
        <FinalResult
          roundResults={[dummyRoundResult]}
          onRestart={onRestart}
        />
      );

      expect(screen.getByText('ゲーム終了！お疲れ様でした')).toBeInTheDocument();
      expect(screen.getAllByText(/4600/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/450m/).length).toBeGreaterThanOrEqual(1);

      const restartBtn = screen.getByRole('button', { name: /もう一度遊ぶ/i });
      expect(restartBtn).toBeInTheDocument();
      fireEvent.click(restartBtn);
      expect(onRestart).toHaveBeenCalledTimes(1);
    });
  });

  describe('GoogleMapsLinks', () => {
    it('適切なリンクとtarget="_blank", rel="noopener noreferrer"が設定されていること', () => {
      render(
        <GoogleMapsLinks
          userCoordinates={{ latitude: 35.68, longitude: 139.71 }}
          correctCoordinates={{ latitude: 35.6778, longitude: 139.7145 }}
          stadiumName="国立競技場"
        />
      );

      const links = screen.getAllByRole('link');
      // 正解地点（周辺マップ・ストリートビュー）+ 回答地点（周辺マップ・ストリートビュー）= 計4個
      expect(links.length).toBe(4);

      links.forEach((link) => {
        expect(link).toHaveAttribute('target', '_blank');
        expect(link).toHaveAttribute('rel', 'noopener noreferrer');
        const href = link.getAttribute('href') || '';
        expect(href).toContain('https://www.google.com/maps/');
        expect(href).not.toContain('key='); // APIキーが含まれていないこと
      });

      // 注意文が表示されていること
      expect(
        screen.getByText(/Google Mapsが別タブで開きます/i)
      ).toBeInTheDocument();
    });
  });

  describe('GameMap Controls', () => {
    it('interactiveモード時に十字ターゲットの切り替えボタンが表示されトグルできること', () => {
      localStorage.clear();
      const onMapClick = vi.fn();
      render(
        <GameMap
          userCoordinates={null}
          interactive={true}
          onMapClick={onMapClick}
        />
      );

      const targetBtn = screen.getByRole('button', { name: /ターゲット:/i });
      expect(targetBtn).toBeInTheDocument();
      expect(targetBtn).toHaveTextContent(/ターゲット: ON/);

      fireEvent.click(targetBtn);
      expect(targetBtn).toHaveTextContent(/ターゲット: OFF/);
    });

    it('Resultモード時に地図の暗さ/スポットライトの切り替えボタンが表示されトグルできること', () => {
      localStorage.clear();
      render(
        <GameMap
          userCoordinates={{ latitude: 35.68, longitude: 139.71 }}
          correctCoordinates={{ latitude: 35.6778, longitude: 139.7145 }}
          correctLabel="国立競技場"
          showLine={true}
          interactive={false}
          fitBothMarkers={true}
        />
      );

      const toggleDimBtn = screen.getByRole('button', { name: /地図の暗さを解除/i });
      expect(toggleDimBtn).toBeInTheDocument();

      fireEvent.click(toggleDimBtn);
      expect(screen.getByRole('button', { name: /地図を暗くする/i })).toBeInTheDocument();
    });
  });
});
