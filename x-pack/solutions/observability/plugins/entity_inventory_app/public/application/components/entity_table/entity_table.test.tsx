/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import {
  buildListResponseFixture,
  HOST_TYPE_FIXTURE,
  K8S_DEPLOYMENT_TYPE_FIXTURE,
} from '../../../inventory_api/fixture_data';
import { buildScenarioListResponse } from '../../../inventory_api/fixture_scenarios';
import type { InventoryListResponse, InventoryRow } from '../../../inventory_api/types';
import { createAppServicesMock } from '../../../mocks';
import type { EntityTableProps } from './entity_table';
import { EntityTable } from './entity_table';
import {
  NAME_COLUMN_ID,
  NAMESPACE_COLUMN_ID,
  CLUSTER_COLUMN_ID,
  getDefaultVisibleColumns,
} from './entity_type_config';
import { NO_VALUE_LABEL, RESET_TO_DEFAULT_LABEL } from './translations';
import type { EntityTablePreferences } from './use_entity_table_state';
import { DEFAULT_PAGE_SIZE, NO_PREFERENCES } from './use_entity_table_state';

// EuiDataGrid's render cost is largely fixed and can exceed the default 5s budget under parallel CI load.
jest.setTimeout(30_000);

/** The table with the preferences kept in state, as `EntityTypeResults` keeps them. */
const StatefulEntityTable = (
  props: Omit<EntityTableProps, 'preferences' | 'onPreferencesChange'>
) => {
  const [preferences, setPreferences] = useState<EntityTablePreferences>(NO_PREFERENCES);
  return <EntityTable {...props} preferences={preferences} onPreferencesChange={setPreferences} />;
};

const getFixture = (scenario: 'normal' | 'truncated' | 'countFailed'): InventoryListResponse => {
  const list = buildScenarioListResponse('host', scenario);
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
        <StatefulEntityTable entityType={HOST_TYPE_FIXTURE} list={list} />
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

  it('renders a placeholder for an empty cell', () => {
    renderTable(smallList([hostRow({ 'host.name': 'web-001', 'cloud.account.id': null })]));

    expect(
      within(getCell(0, 'cloud.account.id') as HTMLElement).getByText(NO_VALUE_LABEL)
    ).toBeTruthy();
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

  it.each(['normal', 'truncated', 'countFailed'] as const)(
    'does not add a summary line to the toolbar for a %s list',
    (scenario) => {
      renderTable(getFixture(scenario));

      expect(screen.queryByTestId('entityInventoryTableSummary')).not.toBeInTheDocument();
      expect(screen.queryByText(/^Showing \d/)).not.toBeInTheDocument();
    }
  );

  it('styles the grid like the design: horizontal row borders, a shaded header and no stripes', () => {
    renderTable(getFixture('normal'));

    const grid = document.querySelector('.euiDataGrid');
    expect(grid).toHaveClass('euiDataGrid--bordersHorizontal');
    expect(grid).toHaveClass('euiDataGrid--headerShade');
    expect(grid).not.toHaveClass('euiDataGrid--stripes');
  });

  it('frames the table in a panel and keeps the keyboard shortcuts control', () => {
    renderTable(getFixture('normal'));

    expect(screen.getByTestId('entityInventoryTable')).toHaveClass('euiPanel');
    expect(screen.getByTestId('dataGridKeyboardShortcutsButton')).toBeInTheDocument();
  });

  it('shows 10 rows per page by default', () => {
    renderTable(getFixture('normal'));

    expect(DEFAULT_PAGE_SIZE).toBe(10);
    expect(screen.getByRole('button', { name: 'Rows per page: 10' })).toBeInTheDocument();
  });

  it('renders the cluster of a deployment as a badge under either naming convention and leaves an empty cluster as a placeholder', () => {
    const k8sList = buildListResponseFixture('k8s.deployment');
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
          <StatefulEntityTable
            entityType={K8S_DEPLOYMENT_TYPE_FIXTURE}
            list={{
              ...k8sList,
              rows: [
                row({ 'k8s.deployment.name': 'frontend', 'k8s.cluster.name': 'prod-cluster-0' }),
                row({
                  'kubernetes.deployment.name': 'cart',
                  'orchestrator.cluster.name': 'prod-cluster-1',
                }),
                row({ 'kubernetes.deployment.name': 'scheduler' }),
              ],
              total: 3,
              truncated: false,
            }}
          />
        </KibanaContextProvider>
      </I18nProvider>
    );

    expect(
      within(getCell(0, CLUSTER_COLUMN_ID) as HTMLElement).getByTestId('entityInventoryCellBadge')
    ).toHaveTextContent('prod-cluster-0');
    expect(
      within(getCell(1, CLUSTER_COLUMN_ID) as HTMLElement).getByTestId('entityInventoryCellBadge')
    ).toHaveTextContent('prod-cluster-1');
    expect(
      within(getCell(2, CLUSTER_COLUMN_ID) as HTMLElement).queryByTestId('entityInventoryCellBadge')
    ).not.toBeInTheDocument();
    expect(
      within(getCell(2, CLUSTER_COLUMN_ID) as HTMLElement).getByText(NO_VALUE_LABEL)
    ).toBeTruthy();
  });

  it('shows the deployment name and namespace reported under either naming convention', () => {
    const k8sList = buildListResponseFixture('k8s.deployment');
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
          <StatefulEntityTable
            entityType={K8S_DEPLOYMENT_TYPE_FIXTURE}
            list={{
              ...k8sList,
              rows: [
                row({ 'k8s.deployment.name': 'frontend', 'k8s.namespace.name': 'payments' }),
                row({ 'kubernetes.deployment.name': 'cart', 'kubernetes.namespace': 'checkout' }),
              ],
              total: 2,
              truncated: false,
            }}
          />
        </KibanaContextProvider>
      </I18nProvider>
    );

    expect(getCell(0, NAME_COLUMN_ID)).toHaveTextContent('frontend');
    expect(getCell(0, NAMESPACE_COLUMN_ID)).toHaveTextContent('payments');
    expect(getCell(1, NAME_COLUMN_ID)).toHaveTextContent('cart');
    expect(getCell(1, NAMESPACE_COLUMN_ID)).toHaveTextContent('checkout');
  });

  it('keeps cells of other columns as plain text', () => {
    renderTable(smallList([hostRow({ 'host.name': 'web-001', 'cloud.account.id': 'account-1' })]));

    expect(
      within(getCell(0, 'cloud.account.id') as HTMLElement).queryByTestId(
        'entityInventoryCellBadge'
      )
    ).not.toBeInTheDocument();
  });

  it('clears an active sort on reset', async () => {
    renderTable(
      smallList([
        hostRow({ 'host.name': 'web-002' }),
        hostRow({ 'host.name': 'db-001' }),
        hostRow({ 'host.name': 'api-003' }),
      ])
    );
    const sortAscending = within(openColumnActions(NAME_COLUMN_ID))
      .getAllByRole('button')
      .find((button) => button.textContent?.startsWith('Sort'));
    if (!sortAscending) {
      throw new Error('No sort action');
    }
    fireEvent.click(sortAscending);
    await waitFor(() => expect(getCell(0, NAME_COLUMN_ID)).toHaveTextContent('api-003'));

    fireEvent.click(screen.getByRole('button', { name: RESET_TO_DEFAULT_LABEL }));

    await waitFor(() => expect(getCell(0, NAME_COLUMN_ID)).toHaveTextContent('web-002'));
    expect(getCell(1, NAME_COLUMN_ID)).toHaveTextContent('db-001');
    expect(getCell(2, NAME_COLUMN_ID)).toHaveTextContent('api-003');
  });

  it('restores the default columns on reset', async () => {
    renderTable(getFixture('normal'));

    const hideColumn = within(openColumnActions('cloud.account.id'))
      .getAllByRole('button')
      .find((button) => button.textContent === 'Hide column');
    if (!hideColumn) {
      throw new Error('No hide action');
    }
    fireEvent.click(hideColumn);
    await waitFor(() =>
      expect(screen.queryByTestId('dataGridHeaderCell-cloud.account.id')).not.toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole('button', { name: RESET_TO_DEFAULT_LABEL }));

    expect(await screen.findByTestId('dataGridHeaderCell-cloud.account.id')).toBeInTheDocument();
  });
  describe('pagination', () => {
    // Newest first, as the route returns them: host-23 first and host-00 last.
    const hostNames = (count: number) =>
      Array.from(
        { length: count },
        (_, index) => `host-${String(count - 1 - index).padStart(2, '0')}`
      );
    const listOf = (count: number) =>
      smallList(hostNames(count).map((name) => hostRow({ 'host.name': name })));

    const goToPage = (pageNumber: number) =>
      fireEvent.click(screen.getByTestId(`pagination-button-${pageNumber - 1}`));

    const sortNameAscending = () => {
      const sortAscending = within(openColumnActions(NAME_COLUMN_ID))
        .getAllByRole('button')
        .find((button) => button.textContent?.startsWith('Sort'));
      if (!sortAscending) {
        throw new Error('No sort action');
      }
      fireEvent.click(sortAscending);
    };

    // The grid numbers cells by their position in all rows, so page two starts at row 10.
    const expectFirstPage = (pageSize = 10) => {
      expect(getCell(0, NAME_COLUMN_ID)).toBeInTheDocument();
      expect(
        document.querySelector(`[data-gridcell-row-index="${pageSize}"]`)
      ).not.toBeInTheDocument();
    };

    it('shows the next rows when a page is picked', async () => {
      renderTable(listOf(24));
      expect(getCell(0, NAME_COLUMN_ID)).toHaveTextContent('host-23');
      expect(getCell(9, NAME_COLUMN_ID)).toHaveTextContent('host-14');

      goToPage(2);

      await waitFor(() => expect(getCell(10, NAME_COLUMN_ID)).toHaveTextContent('host-13'));
      expect(getCell(19, NAME_COLUMN_ID)).toHaveTextContent('host-04');
      goToPage(3);
      await waitFor(() => expect(getCell(20, NAME_COLUMN_ID)).toHaveTextContent('host-03'));
      expect(getCell(23, NAME_COLUMN_ID)).toHaveTextContent('host-00');
    });

    it('goes back to the first page when the sort changes', async () => {
      renderTable(listOf(24));
      goToPage(2);
      await waitFor(() => expect(getCell(10, NAME_COLUMN_ID)).toHaveTextContent('host-13'));

      sortNameAscending();

      await waitFor(() => expect(getCell(0, NAME_COLUMN_ID)).toHaveTextContent('host-00'));
      expectFirstPage();
    });

    it('goes back to the first page when the page size changes', async () => {
      renderTable(listOf(60));
      goToPage(2);
      await waitFor(() => expect(getCell(10, NAME_COLUMN_ID)).toHaveTextContent('host-49'));

      fireEvent.click(screen.getByRole('button', { name: 'Rows per page: 10' }));
      fireEvent.click(await screen.findByTestId('tablePagination-25-rows'));

      await waitFor(() => expect(getCell(0, NAME_COLUMN_ID)).toHaveTextContent('host-59'));
      expect(getCell(24, NAME_COLUMN_ID)).toHaveTextContent('host-35');
      expectFirstPage(25);
    });

    it('goes back to the first page when the rows are replaced', async () => {
      const { rerender } = renderTable(listOf(24));
      goToPage(2);
      await waitFor(() => expect(getCell(10, NAME_COLUMN_ID)).toHaveTextContent('host-13'));

      rerender(
        <I18nProvider>
          <KibanaContextProvider services={createAppServicesMock()}>
            <StatefulEntityTable
              entityType={HOST_TYPE_FIXTURE}
              list={smallList(
                ['fresh-b', 'fresh-a', ...hostNames(22)].map((name) =>
                  hostRow({ 'host.name': name })
                )
              )}
            />
          </KibanaContextProvider>
        </I18nProvider>
      );

      await waitFor(() => expect(getCell(0, NAME_COLUMN_ID)).toHaveTextContent('fresh-b'));
      expectFirstPage();
    });
  });
});
