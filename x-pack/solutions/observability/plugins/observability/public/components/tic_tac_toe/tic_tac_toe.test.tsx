/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { EuiProvider } from '@elastic/eui';
import { TicTacToe } from './tic_tac_toe';

// ──────────────────────────────────────────────────────────────────────────────
// Test helpers
// ──────────────────────────────────────────────────────────────────────────────

function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <IntlProvider locale="en">
      <EuiProvider>{children}</EuiProvider>
    </IntlProvider>
  );
}

const renderGame = () => render(<TicTacToe />, { wrapper: TestWrapper });

const getCell = (i: number) => screen.getByTestId(`tic-tac-toe-cell-${i}`);

// ──────────────────────────────────────────────────────────────────────────────
// Specs
// ──────────────────────────────────────────────────────────────────────────────

describe('TicTacToe', () => {
  describe('initial render', () => {
    it('renders a 3×3 board of 9 empty cells', () => {
      renderGame();
      for (let i = 0; i < 9; i++) {
        expect(getCell(i)).toBeInTheDocument();
        expect(getCell(i)).not.toBeDisabled();
      }
    });

    it('shows X as the first player', () => {
      renderGame();
      expect(screen.getByTestId('game-status')).toHaveTextContent(/Player X/i);
    });

    it('shows all scores at zero', () => {
      renderGame();
      expect(screen.getByTestId('score-x')).toHaveTextContent('0');
      expect(screen.getByTestId('score-o')).toHaveTextContent('0');
      expect(screen.getByTestId('score-draws')).toHaveTextContent('0');
    });
  });

  describe('gameplay', () => {
    it('alternates turns between X and O', async () => {
      const user = userEvent.setup();
      renderGame();

      await user.click(getCell(0));
      expect(screen.getByTestId('game-status')).toHaveTextContent(/Player O/i);

      await user.click(getCell(1));
      expect(screen.getByTestId('game-status')).toHaveTextContent(/Player X/i);
    });

    it('does not allow clicking an occupied cell', async () => {
      const user = userEvent.setup();
      renderGame();

      await user.click(getCell(0)); // X occupies cell 0
      await user.click(getCell(0)); // O tries to click same cell — should be ignored

      // Still O's turn (the second click did nothing)
      expect(screen.getByTestId('game-status')).toHaveTextContent(/Player O/i);
    });
  });

  describe('win detection', () => {
    // X wins top row: 0→O:3→X:1→O:4→X:2
    it('declares X the winner when X fills the top row', async () => {
      const user = userEvent.setup();
      renderGame();

      await user.click(getCell(0)); // X
      await user.click(getCell(3)); // O
      await user.click(getCell(1)); // X
      await user.click(getCell(4)); // O
      await user.click(getCell(2)); // X wins

      expect(screen.getByTestId('game-status')).toHaveTextContent(/X.*wins/i);
      expect(screen.getByTestId('score-x')).toHaveTextContent('1');
    });

    it('disables all cells after a win', async () => {
      const user = userEvent.setup();
      renderGame();

      await user.click(getCell(0));
      await user.click(getCell(3));
      await user.click(getCell(1));
      await user.click(getCell(4));
      await user.click(getCell(2));

      for (let i = 0; i < 9; i++) {
        expect(getCell(i)).toBeDisabled();
      }
    });

    it('detects a draw when all cells are filled with no winner', async () => {
      const user = userEvent.setup();
      renderGame();

      // Final board:  X O X / O O X / X X O  — verified draw
      for (const i of [0, 4, 2, 3, 5, 1, 6, 8, 7]) {
        await user.click(getCell(i));
      }

      expect(screen.getByTestId('game-status')).toHaveTextContent(/draw/i);
      expect(screen.getByTestId('score-draws')).toHaveTextContent('1');
    });
  });

  describe('New Game button', () => {
    it('clears the board while keeping scores', async () => {
      const user = userEvent.setup();
      renderGame();

      // X wins
      await user.click(getCell(0));
      await user.click(getCell(3));
      await user.click(getCell(1));
      await user.click(getCell(4));
      await user.click(getCell(2));

      await user.click(screen.getByTestId('new-game-button'));

      // Score preserved
      expect(screen.getByTestId('score-x')).toHaveTextContent('1');
      // Board cleared
      expect(screen.getByTestId('game-status')).toHaveTextContent(/Player X/i);
      for (let i = 0; i < 9; i++) {
        expect(getCell(i)).not.toBeDisabled();
      }
    });
  });

  describe('Reset Scores button', () => {
    it('resets scores AND clears the board', async () => {
      const user = userEvent.setup();
      renderGame();

      // X wins
      await user.click(getCell(0));
      await user.click(getCell(3));
      await user.click(getCell(1));
      await user.click(getCell(4));
      await user.click(getCell(2));

      await user.click(screen.getByTestId('reset-scores-button'));

      expect(screen.getByTestId('score-x')).toHaveTextContent('0');
      expect(screen.getByTestId('score-o')).toHaveTextContent('0');
      expect(screen.getByTestId('score-draws')).toHaveTextContent('0');
    });
  });

  describe('accessibility', () => {
    it('has ARIA labels on every cell', () => {
      renderGame();
      for (let i = 0; i < 9; i++) {
        expect(getCell(i)).toHaveAttribute('aria-label');
      }
    });

    it('marks the board as a grid', () => {
      renderGame();
      expect(screen.getByRole('grid')).toBeInTheDocument();
    });
  });
});
