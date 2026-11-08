import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../src/App';

describe('メニューサイドバー開閉ツマミ (Sidebar Toggle)', () => {
  it('ゲーム画面でツマミが表示され、クリックでサイドバーが隠れる/表示されること', () => {
    sessionStorage.clear();
    localStorage.clear();

    const { container } = render(<App />);

    // ゲーム開始ボタンをクリック
    const startBtn = screen.getByRole('button', { name: /ゲームを開始する/i });
    fireEvent.click(startBtn);

    // サイドバー開閉ツマミが存在すること
    const toggleBtn = screen.getByRole('button', { name: /サイドバーを閉じる/i });
    expect(toggleBtn).toBeInTheDocument();

    const gameLayout = container.querySelector('.game-layout');
    expect(gameLayout).not.toHaveClass('sidebar-collapsed');

    // ツマミをクリックしてサイドバーを閉じる
    fireEvent.click(toggleBtn);
    expect(gameLayout).toHaveClass('sidebar-collapsed');
    expect(screen.getByRole('button', { name: /サイドバーを開く/i })).toBeInTheDocument();

    // もう一度クリックしてサイドバーを開く
    fireEvent.click(toggleBtn);
    expect(gameLayout).not.toHaveClass('sidebar-collapsed');
    expect(screen.getByRole('button', { name: /サイドバーを閉じる/i })).toBeInTheDocument();
  });
});
