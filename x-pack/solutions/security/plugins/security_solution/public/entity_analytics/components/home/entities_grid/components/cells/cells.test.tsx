/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useEuiTheme } from '@elastic/eui';
import { TestProviders } from '../../../../../../common/mock';
import type { Row } from '../../common';
import { AlertCountCell } from './alert_count_cell';
import { AnomalyCountCell } from './anomaly_count_cell';
import { CriticalityCell } from './criticality_cell';
import { DefaultCell } from './default_cell';
import { EntityNameCell } from './entity_name_cell';
import { EntityTypeCell } from './entity_type_cell';
import { GroupSizeCell } from './group_size_cell';
import { RiskScoreChangeCell } from './risk_score_change_cell';
import { RowActionsCell } from './row_actions_cell';
import { WatchlistsCell } from './watchlists_cell';

const renderInProviders = (cell: React.ReactElement) =>
  render(<TestProviders>{cell}</TestProviders>);

const ROW: Row = { 'entity.id': 'host:a' };

describe('DefaultCell', () => {
  it.each([
    ['a string', 'web-1', 'web-1'],
    ['an array, joined', ['a', 'b'], 'a, b'],
    ['no value', null, '—'],
  ])('renders %s', (_, value, expected) => {
    const { container } = renderInProviders(<DefaultCell value={value} />);
    expect(container.textContent).toBe(expected);
  });
});

describe('RiskScoreChangeCell', () => {
  it.each([
    ['no value', undefined],
    ['zero', 0],
  ])('renders a dash for %s', (_, value) => {
    const { container } = renderInProviders(<RiskScoreChangeCell value={value} />);
    expect(container.textContent).toBe('—');
  });

  it.each([
    ['a rise as an up arrow, said as an increase', 12.6, 'Increased by 13%', 'sortUp'],
    ['a drop as a down arrow, said as a decrease', -7.2, 'Decreased by 7%', 'sortDown'],
  ])('renders %s', (_, value, text, icon) => {
    const { container } = renderInProviders(<RiskScoreChangeCell value={value} />);
    expect(container.textContent).toBe(text);
    expect(container.querySelector(`[data-euiicon-type="${icon}"]`)).toBeInTheDocument();
  });
});

describe('AlertCountCell', () => {
  const AlertCountCellWithTheme = (
    props: Omit<React.ComponentProps<typeof AlertCountCell>, 'euiTheme'>
  ) => {
    const { euiTheme } = useEuiTheme();
    return <AlertCountCell {...props} euiTheme={euiTheme} />;
  };

  it.each([
    ['no value', undefined],
    ['zero', 0],
  ])('renders a dash for %s', (_, value) => {
    const { container } = renderInProviders(<AlertCountCellWithTheme value={value} row={ROW} />);
    expect(container.textContent).toBe('—');
  });

  it('renders the count and one bar part per severity with alerts', () => {
    const row = { ...ROW, alert_critical: 2, alert_high: 0, alert_medium: 1, alert_low: 0 };
    const { container } = renderInProviders(<AlertCountCellWithTheme value={3} row={row} />);
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(container.querySelectorAll('[data-test-subj$="__part"]')).toHaveLength(2);
  });

  it('opens the alerts of the row from the count', () => {
    const onAlertCountClick = jest.fn();
    renderInProviders(
      <AlertCountCellWithTheme value={3} row={ROW} onAlertCountClick={onAlertCountClick} />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Open alerts' }));
    expect(onAlertCountClick).toHaveBeenCalledWith(ROW);
  });
});

describe('EntityTypeCell', () => {
  it.each([
    ['a known type as its label', 'host', 'Host'],
    ['a generic entity as an entity', 'generic', 'Entity'],
    ['an unknown type as is', 'printer', 'printer'],
    ['no value as a dash', null, '—'],
  ])('renders %s', (_, value, expected) => {
    const { container } = renderInProviders(<EntityTypeCell value={value} />);
    expect(container.textContent).toBe(expected);
  });
});

describe('CriticalityCell', () => {
  it('renders an unknown level as unassigned', () => {
    renderInProviders(<CriticalityCell value="not_a_level" />);
    expect(screen.getByText('Unassigned')).toBeInTheDocument();
  });
});

describe('cells with a click handler', () => {
  const clickableCells = [
    [
      'EntityNameCell',
      'web-1',
      (onClick?: (row: Row) => void) => (
        <EntityNameCell value="web-1" row={ROW} onEntityNameClick={onClick} />
      ),
    ],
    [
      'GroupSizeCell',
      '3',
      (onClick?: (row: Row) => void) => (
        <GroupSizeCell value={3} row={ROW} onGroupSizeClick={onClick} />
      ),
    ],
    [
      'AnomalyCountCell',
      '4',
      (onClick?: (row: Row) => void) => (
        <AnomalyCountCell value={4} row={ROW} onAnomalyCountClick={onClick} />
      ),
    ],
  ] as const;

  it.each(clickableCells)('%s calls its handler with the row', (_, text, renderCell) => {
    const onClick = jest.fn();
    renderInProviders(renderCell(onClick));
    fireEvent.click(screen.getByRole('button', { name: text }));
    expect(onClick).toHaveBeenCalledWith(ROW);
  });

  it.each(clickableCells)('%s renders plain text without a handler', (_, text, renderCell) => {
    renderInProviders(renderCell());
    expect(screen.getByText(text)).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('AnomalyCountCell renders a dash for zero', () => {
    const { container } = renderInProviders(
      <AnomalyCountCell value={0} row={ROW} onAnomalyCountClick={jest.fn()} />
    );
    expect(container.textContent).toBe('—');
  });
});

describe('RowActionsCell', () => {
  const renderActions = () => {
    const onInvestigateInTimeline = jest.fn();
    const onOpenEntityGraph = jest.fn();
    renderInProviders(
      <RowActionsCell
        onInvestigateInTimeline={onInvestigateInTimeline}
        onOpenEntityGraph={onOpenEntityGraph}
      />
    );
    return { onInvestigateInTimeline, onOpenEntityGraph };
  };

  it.each([
    ['Investigate in timeline', 'onInvestigateInTimeline'],
    ['Open entity graph', 'onOpenEntityGraph'],
  ] as const)('%s calls its handler', (label, handler) => {
    const handlers = renderActions();
    fireEvent.click(screen.getByRole('button', { name: label }));
    expect(handlers[handler]).toHaveBeenCalledTimes(1);
  });

  it('opens and closes the more actions menu', async () => {
    renderActions();
    const moreActions = screen.getByRole('button', { name: 'More actions' });
    expect(screen.queryByText('Add to chat')).not.toBeInTheDocument();

    fireEvent.click(moreActions);
    expect(await screen.findByText('Add to chat')).toBeInTheDocument();

    fireEvent.click(moreActions);
    await waitFor(() => expect(screen.queryByText('Add to chat')).not.toBeInTheDocument());
  });
});

describe('WatchlistsCell', () => {
  const WATCHLIST_NAMES = new Map([
    ['wl-1', 'Insider threat'],
    ['wl-2', 'VIP'],
  ]);

  it('shows the name of a known watchlist', () => {
    renderInProviders(<WatchlistsCell value="wl-1" watchlistNames={WATCHLIST_NAMES} />);
    expect(screen.getByText('Insider threat')).toBeInTheDocument();
  });

  it('shows the first watchlist and the resolved rest in the overflow tooltip', async () => {
    renderInProviders(
      <WatchlistsCell value={['wl-1', 'wl-unknown', 'wl-2']} watchlistNames={WATCHLIST_NAMES} />
    );
    expect(screen.getByText('Insider threat')).toBeInTheDocument();
    const overflow = screen.getByText('+2');

    fireEvent.mouseOver(overflow);
    // An unknown id stays as it is; a known one shows its name.
    expect(await screen.findByText('wl-unknown, VIP')).toBeInTheDocument();
  });
});
