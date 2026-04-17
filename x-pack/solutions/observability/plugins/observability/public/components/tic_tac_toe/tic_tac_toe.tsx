/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback } from 'react';
import {
  EuiPage,
  EuiPageBody,
  EuiPageHeader,
  EuiPanel,
  EuiButton,
  EuiButtonEmpty,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiTitle,
  EuiBadge,
  EuiHorizontalRule,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

// ─── Types ───────────────────────────────────────────────────────────────────

type Player = 'X' | 'O';
type Cell = Player | null;
type Board = [Cell, Cell, Cell, Cell, Cell, Cell, Cell, Cell, Cell];

interface Scores {
  X: number;
  O: number;
  draws: number;
}

export interface TicTacToeProps {
  'data-test-subj'?: string;
}

// ─── Game logic ───────────────────────────────────────────────────────────────

const WINNING_LINES: ReadonlyArray<readonly [number, number, number]> = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8], // rows
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8], // cols
  [0, 4, 8],
  [2, 4, 6], // diagonals
];

function checkWinner(board: Board): { player: Player; line: readonly number[] } | null {
  for (const [a, b, c] of WINNING_LINES) {
    if (board[a] !== null && board[a] === board[b] && board[a] === board[c]) {
      return { player: board[a] as Player, line: [a, b, c] };
    }
  }
  return null;
}

const INITIAL_BOARD: Board = [null, null, null, null, null, null, null, null, null];

// ─── Cell component ───────────────────────────────────────────────────────────

interface TicTacToeCellProps {
  index: number;
  value: Cell;
  isWinning: boolean;
  onClick: () => void;
  disabled: boolean;
}

function TicTacToeCell({ index, value, isWinning, onClick, disabled }: TicTacToeCellProps) {
  const { euiTheme } = useEuiTheme();

  return (
    <button
      onClick={onClick}
      disabled={disabled || value !== null}
      data-test-subj={`tic-tac-toe-cell-${index}`}
      aria-label={i18n.translate('xpack.observability.ticTacToe.cell.ariaLabel', {
        defaultMessage: 'Cell {position}: {value}',
        values: { position: index + 1, value: value ?? 'empty' },
      })}
      css={css`
        width: 96px;
        height: 96px;
        font-size: 2.25rem;
        font-weight: ${euiTheme.font.weight.bold};
        background: ${isWinning ? `${euiTheme.colors.success}22` : euiTheme.colors.emptyShade};
        border: 2px solid ${isWinning ? euiTheme.colors.success : euiTheme.colors.lightShade};
        border-radius: ${euiTheme.border.radius.medium};
        cursor: ${value !== null || disabled ? 'default' : 'pointer'};
        color: ${value === 'X' ? euiTheme.colors.primary : euiTheme.colors.danger};
        transition: background 0.15s ease, border-color 0.15s ease, transform 0.1s ease;
        display: flex;
        align-items: center;
        justify-content: center;

        &:hover:not(:disabled) {
          background: ${euiTheme.colors.highlight};
          border-color: ${euiTheme.colors.primary};
          transform: scale(1.06);
        }
        &:focus-visible {
          outline: 2px solid ${euiTheme.colors.primary};
          outline-offset: 2px;
        }
      `}
    >
      {value}
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function TicTacToe({ 'data-test-subj': dataTestSubj = 'tic-tac-toe' }: TicTacToeProps) {
  const { euiTheme } = useEuiTheme();
  const [board, setBoard] = useState<Board>(INITIAL_BOARD);
  const [currentPlayer, setCurrentPlayer] = useState<Player>('X');
  const [scores, setScores] = useState<Scores>({ X: 0, O: 0, draws: 0 });

  const winner = checkWinner(board);
  const isDraw = winner === null && board.every((cell) => cell !== null);
  const isGameOver = winner !== null || isDraw;
  const winningLine = winner?.line ?? [];

  const handleCellClick = useCallback(
    (index: number) => {
      if (board[index] !== null || isGameOver) return;

      const nextBoard = [...board] as Board;
      nextBoard[index] = currentPlayer;
      setBoard(nextBoard);

      const nextWinner = checkWinner(nextBoard);
      if (nextWinner) {
        setScores((s) => ({ ...s, [currentPlayer]: s[currentPlayer] + 1 }));
      } else if (nextBoard.every((cell) => cell !== null)) {
        setScores((s) => ({ ...s, draws: s.draws + 1 }));
      } else {
        setCurrentPlayer((p) => (p === 'X' ? 'O' : 'X'));
      }
    },
    [board, currentPlayer, isGameOver]
  );

  const handleNewGame = useCallback(() => {
    setBoard(INITIAL_BOARD);
    setCurrentPlayer('X');
  }, []);

  const handleResetAll = useCallback(() => {
    setBoard(INITIAL_BOARD);
    setCurrentPlayer('X');
    setScores({ X: 0, O: 0, draws: 0 });
  }, []);

  return (
    <EuiPage paddingSize="l" data-test-subj={dataTestSubj}>
      <EuiPageBody>
        <EuiPageHeader
          pageTitle={
            <FormattedMessage
              id="xpack.observability.ticTacToe.pageTitle"
              defaultMessage="Observability Overview"
            />
          }
          description={
            <FormattedMessage
              id="xpack.observability.ticTacToe.pageDescription"
              defaultMessage="All systems operational. Time for a game."
            />
          }
          rightSideItems={[
            <EuiBadge color="success" key="status">
              <FormattedMessage
                id="xpack.observability.ticTacToe.allSystemsOperational"
                defaultMessage="All systems operational"
              />
            </EuiBadge>,
          ]}
        />

        <EuiSpacer />

        <EuiFlexGroup justifyContent="center">
          <EuiFlexItem grow={false}>
            <EuiPanel
              paddingSize="xl"
              data-test-subj="tic-tac-toe-panel"
              css={css`
                min-width: 380px;
              `}
            >
              {/* ── Scoreboard ── */}
              <EuiFlexGroup justifyContent="spaceAround" alignItems="center" gutterSize="xl">
                <EuiFlexItem grow={false}>
                  <EuiText textAlign="center">
                    <EuiTitle size="m">
                      <span
                        css={css`
                          color: ${euiTheme.colors.primary};
                        `}
                      >
                        X
                      </span>
                    </EuiTitle>
                    <p data-test-subj="score-x">{scores.X}</p>
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText textAlign="center" color="subdued">
                    <small>
                      <FormattedMessage
                        id="xpack.observability.ticTacToe.draws"
                        defaultMessage="draws"
                      />
                    </small>
                    <p data-test-subj="score-draws">{scores.draws}</p>
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText textAlign="center">
                    <EuiTitle size="m">
                      <span
                        css={css`
                          color: ${euiTheme.colors.danger};
                        `}
                      >
                        O
                      </span>
                    </EuiTitle>
                    <p data-test-subj="score-o">{scores.O}</p>
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>

              <EuiHorizontalRule margin="m" />

              {/* ── Status ── */}
              <EuiText textAlign="center" data-test-subj="game-status">
                {winner ? (
                  <p>
                    <strong>{winner.player}</strong>{' '}
                    <FormattedMessage
                      id="xpack.observability.ticTacToe.wins"
                      defaultMessage="wins! 🎉"
                    />
                  </p>
                ) : isDraw ? (
                  <p>
                    <FormattedMessage
                      id="xpack.observability.ticTacToe.draw"
                      defaultMessage="It's a draw! 🤝"
                    />
                  </p>
                ) : (
                  <p>
                    <FormattedMessage
                      id="xpack.observability.ticTacToe.currentTurn"
                      defaultMessage="Player {player}'s turn"
                      values={{ player: <strong>{currentPlayer}</strong> }}
                    />
                  </p>
                )}
              </EuiText>

              <EuiSpacer size="m" />

              {/* ── Board ── */}
              <div
                role="grid"
                aria-label={i18n.translate('xpack.observability.ticTacToe.boardAriaLabel', {
                  defaultMessage: 'Tic Tac Toe board',
                })}
                css={css`
                  display: grid;
                  grid-template-columns: repeat(3, 96px);
                  gap: ${euiTheme.size.s};
                  justify-content: center;
                `}
              >
                {board.map((cell, i) => (
                  <TicTacToeCell
                    key={i}
                    index={i}
                    value={cell}
                    isWinning={winningLine.includes(i)}
                    onClick={() => handleCellClick(i)}
                    disabled={isGameOver}
                  />
                ))}
              </div>

              <EuiSpacer size="m" />

              {/* ── Actions ── */}
              <EuiFlexGroup justifyContent="center" gutterSize="s">
                <EuiFlexItem grow={false}>
                  <EuiButton
                    onClick={handleNewGame}
                    color="primary"
                    fill
                    data-test-subj="new-game-button"
                  >
                    <FormattedMessage
                      id="xpack.observability.ticTacToe.newGame"
                      defaultMessage="New Game"
                    />
                  </EuiButton>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    onClick={handleResetAll}
                    color="text"
                    data-test-subj="reset-scores-button"
                  >
                    <FormattedMessage
                      id="xpack.observability.ticTacToe.resetScores"
                      defaultMessage="Reset Scores"
                    />
                  </EuiButtonEmpty>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPanel>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPageBody>
    </EuiPage>
  );
}
