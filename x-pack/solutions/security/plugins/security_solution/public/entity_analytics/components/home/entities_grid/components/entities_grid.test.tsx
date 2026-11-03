/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { TestProviders } from '../../../../../common/mock';
import type { Row } from '../common';
import { INDIVIDUAL_ROWS_COLUMNS, RESOLVED_ROWS_COLUMNS } from '../grid_columns';
import { useEntityGridData } from '../hooks/use_entity_grid_data';
import { useEntityAnalyticsUrlState } from '../hooks/use_entity_analytics_url_state';
import { EntitiesGrid } from './entities_grid';
import type { EntitiesGridProps } from './entities_grid';
import type { ReadAccess } from '../grid_columns';

jest.mock('../hooks/use_entity_grid_data', () => ({
  ...jest.requireActual('../hooks/use_entity_grid_data'),
  useEntityGridData: jest.fn(),
}));
jest.mock('../hooks/use_entity_analytics_url_state', () => ({
  ...jest.requireActual('../hooks/use_entity_analytics_url_state'),
  useEntityAnalyticsUrlState: jest.fn(),
}));

const GROUP: Row = { 'entity.id': 'host:a', 'entity.name': 'alpha', group_size: 3 };
const SINGLE_ENTITY: Row = { 'entity.id': 'host:b', 'entity.name': 'beta', group_size: 1 };

const toggleExpandedId = jest.fn();

const mockGridData = (data: Partial<ReturnType<typeof useEntityGridData>> = {}) =>
  jest.mocked(useEntityGridData).mockReturnValue({
    rows: [GROUP, SINGLE_ENTITY],
    isEnriching: false,
    total: 2,
    updatedAt: null,
    isFetching: false,
    isAtLoadLimit: false,
    prefetch: jest.fn(),
    onRowsInViewChange: jest.fn(),
    ...data,
  } as ReturnType<typeof useEntityGridData>);

const FULL_ACCESS: ReadAccess = { alerts: true, risk: true, anomalies: true, cases: true };

const renderGrid = (props: Partial<EntitiesGridProps> = {}) =>
  render(
    <TestProviders>
      <EntitiesGrid
        columns={RESOLVED_ROWS_COLUMNS}
        rowsMode="resolved"
        timeRange="7d"
        watchlistNames={new Map()}
        sortField="entity.name"
        sortDirection="asc"
        onSortChange={jest.fn()}
        readAccess={FULL_ACCESS}
        {...props}
      />
    </TestProviders>
  );

describe('EntitiesGrid', () => {
  // jsdom has no layout: give elements a size, so the virtualized body renders its rows.
  beforeAll(() => {
    jest.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(800);
    jest.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(1000);
  });
  afterAll(() => {
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockGridData();
    jest.mocked(useEntityAnalyticsUrlState).mockReturnValue({
      expandedIds: [],
      toggleExpandedId,
    } as unknown as ReturnType<typeof useEntityAnalyticsUrlState>);
  });

  it('shows a row for each entity', () => {
    renderGrid();

    expect(screen.getByText('alpha')).toBeInTheDocument();
    expect(screen.getByText('beta')).toBeInTheDocument();
  });

  it('expands only the groups that have records', () => {
    renderGrid();

    const expanders = screen.getAllByRole('button', { name: 'Expand group' });
    expect(expanders).toHaveLength(1);

    fireEvent.click(expanders[0]);

    expect(toggleExpandedId).toHaveBeenCalledWith('host:a');
  });

  it('tells the page a resolved row from a record its expanded group lists', () => {
    // Every query returns the same rows, so the expanded group lists alpha too.
    jest.mocked(useEntityAnalyticsUrlState).mockReturnValue({
      expandedIds: ['host:a'],
      toggleExpandedId,
    } as unknown as ReturnType<typeof useEntityAnalyticsUrlState>);
    const onEntityNameClick = jest.fn();

    renderGrid({ cellHandlers: { onEntityNameClick } });
    const [groupName, recordName] = screen.getAllByText('alpha');
    fireEvent.click(groupName);
    fireEvent.click(recordName);

    expect(onEntityNameClick).toHaveBeenNthCalledWith(1, GROUP, 'resolved');
    expect(onEntityNameClick).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ 'entity.id': 'host:a' }),
      'individual'
    );
  });

  it('lists a large group by risk score, with its main entity marked even when its score is lower', () => {
    const MAIN_ENTITY: Row = {
      'entity.id': 'host:a',
      'entity.name': 'alpha',
      'entity.risk.calculated_score_norm': 20,
    };
    const ALIAS: Row = {
      'entity.id': 'host:a-okta',
      'entity.name': 'alpha-okta',
      'entity.risk.calculated_score_norm': 80,
    };
    jest.mocked(useEntityGridData).mockImplementation((options) => {
      const data = {
        isEnriching: false,
        updatedAt: null,
        isFetching: false,
        isAtLoadLimit: false,
        prefetch: jest.fn(),
        onRowsInViewChange: jest.fn(),
      };
      if (options.keyScope !== 'children') return { ...data, rows: [GROUP], total: 1 };
      return options.entityExpression?.startsWith('entity.id')
        ? { ...data, rows: [MAIN_ENTITY], total: 1 }
        : { ...data, rows: [ALIAS], total: 150 };
    });
    jest.mocked(useEntityAnalyticsUrlState).mockReturnValue({
      expandedIds: ['host:a'],
      toggleExpandedId,
    } as unknown as ReturnType<typeof useEntityAnalyticsUrlState>);

    renderGrid();

    const recordNames = screen.getAllByText(/^alpha/).slice(1);
    expect(recordNames.map((name) => name.textContent)).toEqual(['alpha-okta', 'alpha']);
    expect(screen.getAllByTestId('entityGridMainEntityIcon')).toHaveLength(1);
    expect(screen.getByText('Showing 2 of 151 records')).toBeInTheDocument();
  });

  it('has no expander when the rows are individual records', () => {
    renderGrid({ rowsMode: 'individual', columns: INDIVIDUAL_ROWS_COLUMNS });

    expect(screen.queryByRole('button', { name: 'Expand group' })).not.toBeInTheDocument();
  });

  it.each([
    ['alerts', ['Alerts', 'Last alert'], ['alert_count', 'last_seen_alert']],
    ['risk', ['Risk score change'], ['risk_score_change']],
    ['anomalies', ['Anomalies'], ['anomaly_count']],
    ['cases', ['Cases'], ['case_count']],
  ] as const)(
    'leaves out the %s columns, and their queries, for users who cannot read them',
    (source, headers, columnIds) => {
      renderGrid({ readAccess: { ...FULL_ACCESS, [source]: false } });

      headers.forEach((header) => expect(screen.queryByText(header)).not.toBeInTheDocument());
      const [options] = jest.mocked(useEntityGridData).mock.calls.at(-1) ?? [];
      columnIds.forEach((id) => expect(options?.columnIds).not.toContain(id));
    }
  );

  it('sorts by risk score when the sort column is one the user cannot read', () => {
    renderGrid({
      sortField: 'anomaly_count',
      sortDirection: 'asc',
      readAccess: { ...FULL_ACCESS, anomalies: false },
    });

    const [options] = jest.mocked(useEntityGridData).mock.calls.at(-1) ?? [];
    expect(options).toMatchObject({
      sortField: 'entity.risk.calculated_score_norm',
      sortDirection: 'desc',
    });
  });

  it('offers to reset the filters when no entity matches', () => {
    mockGridData({ rows: [], total: 0 });

    renderGrid();

    expect(screen.getByText('No records match the current filters')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reset' })).toBeInTheDocument();
  });

  it('says in the toolbar how many rows it shows when the view has more', () => {
    mockGridData({ isAtLoadLimit: true, total: 3789 });

    renderGrid({ toolbarControls: <div /> });

    // The total is short, with the exact one in a tooltip.
    expect(document.querySelector('.entityAnalyticsDataTableTotal')).toHaveTextContent(
      'Showing 2 of 3.8k resolved entities'
    );
  });
});
