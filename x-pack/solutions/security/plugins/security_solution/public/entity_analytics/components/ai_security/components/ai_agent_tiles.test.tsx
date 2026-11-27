/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { TestProviders } from '../../../../common/mock';
import { AiAgentTiles } from './ai_agent_tiles';
import type { AiAgentTileId, TileContext } from './agent_filters';
import { mockInventoryRow as row } from './test_utils';

jest.mock('@kbn/charts-theme', () => ({ useElasticChartsTheme: () => ({}) }));
jest.mock('@elastic/charts', () => ({
  Chart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Settings: () => null,
  Axis: () => null,
  AreaSeries: () => null,
  Position: { Left: 'left' },
  ScaleType: { Linear: 'linear' },
  CurveType: { CURVE_STEP: 'curveStep' },
}));

const context: TileContext = {
  unsanctionedWatchlistId: 'unsanctioned-ai-agents-watchlist-id-gen-demo',
  now: new Date('2026-11-27T12:00:00.000Z').getTime(),
};

const rows = [
  row({ entityId: 'a', watchlistIds: [context.unsanctionedWatchlistId], userName: 'root' }),
  row({ entityId: 'b', watchlistIds: [context.unsanctionedWatchlistId] }),
  row({ entityId: 'c', firstSeen: '2026-11-25T00:00:00.000Z' }),
];

const renderTiles = (activeTile: AiAgentTileId | null) => {
  const onToggleTile = jest.fn();
  render(
    <TestProviders>
      <AiAgentTiles
        rows={rows}
        isLoading={false}
        context={context}
        activeTile={activeTile}
        onToggleTile={onToggleTile}
      />
    </TestProviders>
  );
  return onToggleTile;
};

const tileValue = (tileId: string) =>
  screen
    .getByTestId(`eaFaceliftSignalCard-${tileId}`)
    .querySelector('[data-test-subj="eaFaceliftSignalCardValue"]');

describe('AiAgentTiles', () => {
  it("counts the installs for each of the analyst's jobs", () => {
    renderTiles(null);
    expect(tileValue('unsanctioned')).toHaveTextContent('2');
    expect(tileValue('personWatchlists')).toHaveTextContent('0');
    expect(tileValue('highImpactHosts')).toHaveTextContent('0');
    expect(tileValue('newInstalls')).toHaveTextContent('1');
    expect(tileValue('runsAsRoot')).toHaveTextContent('1');
    expect(screen.queryByText('Installs with open alerts')).not.toBeInTheDocument();
  });

  it('toggles the table filter from a tile, and a selected tile clears it', () => {
    const onToggleTile = renderTiles('unsanctioned');
    const tile = screen.getByTestId('eaFaceliftSignalCard-unsanctioned');
    expect(tile).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(tile);
    expect(onToggleTile).toHaveBeenCalledWith('unsanctioned');
  });

  it('does not filter on a tile with nothing in it', () => {
    const onToggleTile = renderTiles(null);
    fireEvent.click(screen.getByTestId('eaFaceliftSignalCard-highImpactHosts'));
    expect(onToggleTile).not.toHaveBeenCalled();
  });
});
