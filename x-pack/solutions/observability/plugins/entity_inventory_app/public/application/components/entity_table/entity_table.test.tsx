/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import {
  buildListResponseFixture,
  HOST_TYPE_FIXTURE,
  K8S_DEPLOYMENT_TYPE_FIXTURE,
} from '../../../inventory_api/fixture_data';
import type { InventoryListResponse, InventoryRow } from '../../../inventory_api/types';
import { createAppServicesMock } from '../../../mocks';
import { DEFAULT_PAGE_SIZE, EntityTable } from './entity_table';
import { NAME_COLUMN_ID, getDefaultVisibleColumns } from './entity_type_config';
import {
  NO_VALUE_LABEL,
  RESET_TO_DEFAULT_LABEL,
  getCompleteSummary,
  getTotalUnknownSummary,
  getTruncatedSummary,
} from './translations';

// EuiDataGrid's render cost is largely fixed and can exceed the default 5s budget under parallel CI load.
jest.setTimeout(30_000);

const getFixture = (scenario: 'normal' | 'truncated' | 'countFailed'): InventoryListResponse => {
  const list = buildListResponseFixture('host', scenario);
  if (!list) {
    throw new Error('Missing host fixture');
  }
  return list;
};

const HOST_COLUMNS = getFixture('normal').columns;

const hostRow = (overrides: InventoryRow): InventoryRow => ({
  ...Object.fromEntries(HOST_COLUMNS.map(({ name }) => [name, null])),
  ...overrides,
});

const smallList = (rows: InventoryRow[]): InventoryListResponse => ({
  columns: HOST_COLUMNS,
  rows,
  total: rows.length,
  truncated: false,
  errors: [],
  unavailableColumns: [],
});

const renderTable = (list: InventoryListResponse) =>
  render(
    <I18nProvider>
      <KibanaContextProvider services={createAppServicesMock()}>
        <EntityTable entityType={HOST_TYPE_FIXTURE} list={list} />
      </KibanaContextProvider>
    </I18nProvider>
  );

const getCell = (rowIndex: number, columnId: string) => {
  const cell = document.querySelector(
    `[data-gridcell-row-index="${rowIndex}"][data-gridcell-column-id="${columnId}"]`
  );
  if (!cell) {
    throw new Error(`No cell at row ${rowIndex} of ${columnId}`);
  }
  return cell;
};

const openColumnActions = (columnId: string) => {
  fireEvent.click(screen.getByTestId(`dataGridHeaderCellActionButton-${columnId}`));
  return screen.getByTestId(`dataGridHeaderCellActionGroup-${columnId}`);
};

describe('EntityTable', () => {
  it('shows the default visible columns of the type and hides the others', () => {
    const list = getFixture('normal');
    renderTable(list);

    getDefaultVisibleColumns('host', list.columns).forEach((columnId) => {
      expect(screen.getByTestId(`dataGridHeaderCell-${columnId}`)).toBeInTheDocument();
    });
    expect(screen.queryByTestId('dataGridHeaderCell-entity.id')).not.toBeInTheDocument();
    expect(screen.queryByTestId('dataGridHeaderCell-host.os.kernel')).not.toBeInTheDocument();
  });

  it('names an entity from its fallback name field', () => {
    renderTable(
      smallList([hostRow({ 'entity.id': 'host:abc', 'host.hostname': 'web-001.internal' })])
    );

    expect(getCell(0, NAME_COLUMN_ID)).toHaveTextContent('web-001.internal');
  });

  it('renders a placeholder for an empty cell and joins multi-value cells', () => {
    renderTable(
      smallList([
        hostRow({ 'host.name': 'web-001', 'host.ip': ['10.0.0.1', 'fe80::1'], 'os.name': null }),
      ])
    );

    expect(getCell(0, 'host.ip')).toHaveTextContent('10.0.0.1, fe80::1');
    expect(within(getCell(0, 'os.name') as HTMLElement).getByText(NO_VALUE_LABEL)).toBeTruthy();
  });

  it('sorts the held rows when a column sort is picked', async () => {
    renderTable(
      smallList([
        hostRow({ 'host.name': 'web-002' }),
        hostRow({ 'host.name': 'db-001' }),
        hostRow({ 'host.name': null }),
      ])
    );
    expect(getCell(0, NAME_COLUMN_ID)).toHaveTextContent('web-002');

    const sortAscending = within(openColumnActions(NAME_COLUMN_ID))
      .getAllByRole('button')
      .find((button) => button.textContent?.startsWith('Sort'));
    if (!sortAscending) {
      throw new Error('No sort action');
    }
    fireEvent.click(sortAscending);

    await waitFor(() => expect(getCell(0, NAME_COLUMN_ID)).toHaveTextContent('db-001'));
    expect(getCell(1, NAME_COLUMN_ID)).toHaveTextContent('web-002');
  });

  it('summarises the page of a complete list against the total', () => {
    const list = getFixture('normal');
    renderTable(list);

    expect(screen.getByTestId('entityInventoryTableSummary')).toHaveTextContent(
      getCompleteSummary({ start: 1, end: DEFAULT_PAGE_SIZE, total: list.rows.length })
    );
  });

  it('summarises the page of a truncated list against the returned rows', () => {
    const list = getFixture('truncated');
    renderTable(list);

    expect(screen.getByTestId('entityInventoryTableSummary')).toHaveTextContent(
      getTruncatedSummary({
        start: 1,
        end: DEFAULT_PAGE_SIZE,
        returned: list.rows.length,
        total: list.total ?? 0,
      })
    );
  });

  it('summarises the page of a list whose total is unknown', () => {
    const list = getFixture('countFailed');
    renderTable(list);

    expect(screen.getByTestId('entityInventoryTableSummary')).toHaveTextContent(
      getTotalUnknownSummary({ start: 1, end: DEFAULT_PAGE_SIZE, returned: list.rows.length })
    );
  });

  it('shows 10 rows per page by default', () => {
    renderTable(getFixture('normal'));

    expect(DEFAULT_PAGE_SIZE).toBe(10);
    expect(screen.getByRole('button', { name: 'Rows per page: 10' })).toBeInTheDocument();
  });

  it('renders the cluster of a deployment as a badge and leaves an empty cluster as a placeholder', () => {
    const k8sList = buildListResponseFixture('k8s.deployment', 'normal');
    if (!k8sList) {
      throw new Error('Missing k8s.deployment fixture');
    }
    const row = (overrides: InventoryRow): InventoryRow => ({
      ...Object.fromEntries(k8sList.columns.map(({ name }) => [name, null])),
      ...overrides,
    });
    render(
      <I18nProvider>
        <KibanaContextProvider services={createAppServicesMock()}>
          <EntityTable
            entityType={K8S_DEPLOYMENT_TYPE_FIXTURE}
            list={{
              ...k8sList,
              rows: [
                row({ 'kubernetes.deployment.name': 'frontend', cluster: 'prod-cluster-0' }),
                row({ 'kubernetes.deployment.name': 'cart', cluster: null }),
              ],
              total: 2,
              truncated: false,
            }}
          />
        </KibanaContextProvider>
      </I18nProvider>
    );

    expect(
      within(getCell(0, 'cluster') as HTMLElement).getByTestId('entityInventoryCellBadge')
    ).toHaveTextContent('prod-cluster-0');
    expect(
      within(getCell(1, 'cluster') as HTMLElement).queryByTestId('entityInventoryCellBadge')
    ).not.toBeInTheDocument();
    expect(within(getCell(1, 'cluster') as HTMLElement).getByText(NO_VALUE_LABEL)).toBeTruthy();
  });

  it('keeps cells of other columns as plain text', () => {
    renderTable(smallList([hostRow({ 'host.name': 'web-001', 'os.name': 'Ubuntu' })]));

    expect(
      within(getCell(0, 'os.name') as HTMLElement).queryByTestId('entityInventoryCellBadge')
    ).not.toBeInTheDocument();
  });

  it('restores the default columns on reset', async () => {
    renderTable(getFixture('normal'));

    const hideColumn = within(openColumnActions('host.ip'))
      .getAllByRole('button')
      .find((button) => button.textContent === 'Hide column');
    if (!hideColumn) {
      throw new Error('No hide action');
    }
    fireEvent.click(hideColumn);
    await waitFor(() =>
      expect(screen.queryByTestId('dataGridHeaderCell-host.ip')).not.toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole('button', { name: RESET_TO_DEFAULT_LABEL }));

    expect(await screen.findByTestId('dataGridHeaderCell-host.ip')).toBeInTheDocument();
  });
});
