/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { userEvent, within, expect } from '@storybook/test';
import { TicTacToe } from './tic_tac_toe';

// ──────────────────────────────────────────────────────────────────────────────
// Meta
// ──────────────────────────────────────────────────────────────────────────────

const meta: Meta<typeof TicTacToe> = {
  title: 'observability/pages/overview/TicTacToe',
  component: TicTacToe,
  parameters: {
    layout: 'fullscreen',
    chromatic: { delay: 300 },
  },
};

export default meta;
type Story = StoryObj<typeof TicTacToe>;

// ──────────────────────────────────────────────────────────────────────────────
// Stories
// ──────────────────────────────────────────────────────────────────────────────

/** Fresh board — smoke test that the component renders */
export const Default: Story = {};

/** Mid-game board via interaction */
export const MidGame: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // X plays center, O plays top-left, X plays bottom-right
    await userEvent.click(canvas.getByTestId('tic-tac-toe-cell-4'));
    await userEvent.click(canvas.getByTestId('tic-tac-toe-cell-0'));
    await userEvent.click(canvas.getByTestId('tic-tac-toe-cell-8'));
  },
};

/**
 * X wins the top row: [0, 1, 2]
 * Sequence: X:0  O:3  X:1  O:4  X:2
 */
export const XWins: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByTestId('tic-tac-toe-cell-0')); // X
    await userEvent.click(canvas.getByTestId('tic-tac-toe-cell-3')); // O
    await userEvent.click(canvas.getByTestId('tic-tac-toe-cell-1')); // X
    await userEvent.click(canvas.getByTestId('tic-tac-toe-cell-4')); // O
    await userEvent.click(canvas.getByTestId('tic-tac-toe-cell-2')); // X wins!

    await expect(canvas.getByTestId('game-status')).toHaveTextContent(/wins/i);
    await expect(canvas.getByTestId('score-x')).toHaveTextContent('1');
  },
};

/**
 * O wins the left column: [0, 3, 6]
 * Sequence: X:1  O:0  X:2  O:3  X:8  O:6
 */
export const OWins: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByTestId('tic-tac-toe-cell-1')); // X
    await userEvent.click(canvas.getByTestId('tic-tac-toe-cell-0')); // O
    await userEvent.click(canvas.getByTestId('tic-tac-toe-cell-2')); // X
    await userEvent.click(canvas.getByTestId('tic-tac-toe-cell-3')); // O
    await userEvent.click(canvas.getByTestId('tic-tac-toe-cell-8')); // X
    await userEvent.click(canvas.getByTestId('tic-tac-toe-cell-6')); // O wins!

    await expect(canvas.getByTestId('game-status')).toHaveTextContent(/wins/i);
    await expect(canvas.getByTestId('score-o')).toHaveTextContent('1');
  },
};

/**
 * Draw — board fills with no winner.
 * Final board:
 *   X | O | X
 *   O | O | X
 *   X | X | O
 * Sequence: X:0  O:4  X:2  O:3  X:5  O:1  X:6  O:8  X:7
 */
export const Draw: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    for (const i of [0, 4, 2, 3, 5, 1, 6, 8, 7]) {
      await userEvent.click(canvas.getByTestId(`tic-tac-toe-cell-${i}`));
    }

    await expect(canvas.getByTestId('game-status')).toHaveTextContent(/draw/i);
    await expect(canvas.getByTestId('score-draws')).toHaveTextContent('1');
  },
};

/** New Game button resets the board but preserves scores */
export const NewGameResetsBoard: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // X wins first game
    await userEvent.click(canvas.getByTestId('tic-tac-toe-cell-0'));
    await userEvent.click(canvas.getByTestId('tic-tac-toe-cell-3'));
    await userEvent.click(canvas.getByTestId('tic-tac-toe-cell-1'));
    await userEvent.click(canvas.getByTestId('tic-tac-toe-cell-4'));
    await userEvent.click(canvas.getByTestId('tic-tac-toe-cell-2'));

    await expect(canvas.getByTestId('score-x')).toHaveTextContent('1');

    // Start a new game
    await userEvent.click(canvas.getByTestId('new-game-button'));

    // Score persists, board is clear
    await expect(canvas.getByTestId('score-x')).toHaveTextContent('1');
    await expect(canvas.getByTestId('game-status')).toHaveTextContent(/Player X/i);
  },
};
