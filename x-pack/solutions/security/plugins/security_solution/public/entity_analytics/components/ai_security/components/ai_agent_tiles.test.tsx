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
import { mockActivityProfile as activityProfile, mockInventoryRow as row } from './test_utils';

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
  row({
    entityId: 'b',
    watchlistIds: [context.unsanctionedWatchlistId],
    activityProfile: activityProfile({ sessions: 30, unattendedSessions: 30 }),
  }),
  row({
    entityId: 'c',
    firstSeen: '2026-11-25T00:00:00.000Z',
    activityProfile: activityProfile({ sessions: 4 }),
  }),
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
    expect(tileValue('runsUnattended')).toHaveTextContent('1');
    expect(screen.queryByText('Running as root')).not.toBeInTheDocument();
    expect(screen.queryByText('Installs with open alerts')).not.toBeInTheDocument();
  });

  it('toggles the table filter from a tile, and a selected tile clears it', () => {
    const onToggleTile = renderTiles('unsanctioned');
    const tile = screen.getByTestId('eaFaceliftSignalCard-unsanctioned');
    expect(tile).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(tile);
    expect(onToggleTile).toHaveBeenCalledWith('unsanctioned');
  });

  it('filters the table to installs that run unattended', () => {
    const onToggleTile = renderTiles(null);
    const tile = screen.getByTestId('eaFaceliftSignalCard-runsUnattended');
    expect(tile).toHaveTextContent('Runs unattended');
    fireEvent.click(tile);
    expect(onToggleTile).toHaveBeenCalledWith('runsUnattended');
  });

  it('does not filter on a tile with nothing in it', () => {
    const onToggleTile = renderTiles(null);
    fireEvent.click(screen.getByTestId('eaFaceliftSignalCard-highImpactHosts'));
    expect(onToggleTile).not.toHaveBeenCalled();
  });
});
