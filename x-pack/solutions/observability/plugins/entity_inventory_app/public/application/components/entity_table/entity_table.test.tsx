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
import { UI_SETTINGS } from '@kbn/data-service';
import { HOST_TYPE_FIXTURE } from '../../../inventory_api/fixture_data';
import { buildScenarioListResponse } from '../../../inventory_api/fixture_scenarios';
import type {
  InventoryEntityType,
  InventoryListResponse,
  InventoryRow,
} from '../../../inventory_api/types';
import { createAppServicesMock } from '../../../mocks';
import type { EntityTableProps } from './entity_table';
import { EntityTable } from './entity_table';
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

const getFixture = (scenario: 'normal' | 'truncated'): InventoryListResponse => {
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
  truncated: false,
  errors: [],
  unavailableColumns: [],
});

const NAME_COLUMN_ID = 'host.name';

const renderTable = (list: InventoryListResponse) =>
  render(
    <I18nProvider>
      <KibanaContextProvider services={createAppServicesMock()}>
        <StatefulEntityTable entityType={HOST_TYPE_FIXTURE} list={list} />
      </KibanaContextProvider>
    </I18nProvider>
  );

// A type the app has never seen: the table knows only what the response says about it.
const WIDGET_COLUMNS: InventoryListResponse['columns'] = [
  { name: 'entity.id', kind: 'id' },
  { name: 'widget.name', kind: 'identity' },
  { name: 'widget.size', kind: 'attribute' },
  { name: 'last_seen', kind: 'last_seen' },
];

const WIDGET_TYPE: InventoryEntityType = {
  type: 'widget',
  name: 'Widget',
  identityFields: ['widget.name'],
  columns: WIDGET_COLUMNS,
};

const WIDGET_LIST: InventoryListResponse = {
  columns: WIDGET_COLUMNS,
  rows: [
    {
      'entity.id': 'widget:sprocket',
      'widget.name': 'sprocket',
      'widget.size': 3,
      last_seen: '2026-10-30T12:00:00.000Z',
    },
  ],
  truncated: false,
  errors: [],
  unavailableColumns: [],
};

const renderWidgetTable = (preferences: EntityTablePreferences = NO_PREFERENCES) => {
  const services = createAppServicesMock();
  jest
    .mocked(services.uiSettings.get)
    .mockImplementation((key: string) =>
      key === UI_SETTINGS.DATE_FORMAT ? 'YYYY-MM-DD' : undefined
    );
  return render(
    <I18nProvider>
      <KibanaContextProvider services={services}>
        <EntityTable
          entityType={WIDGET_TYPE}
          list={WIDGET_LIST}
          preferences={preferences}
          onPreferencesChange={jest.fn()}
        />
      </KibanaContextProvider>
    </I18nProvider>
  );
};

const getHeaderIds = () =>
  Array.from(document.querySelectorAll('[data-test-subj^="dataGridHeaderCell-"]')).map((cell) =>
    cell.getAttribute('data-test-subj')?.replace('dataGridHeaderCell-', '')
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
  describe('for a type the app has never seen', () => {
    it('shows every column of the response in response order', () => {
      renderWidgetTable();

      expect(getHeaderIds()).toEqual(['entity.id', 'widget.name', 'widget.size', 'last_seen']);
    });

    it('labels the id and last seen columns by kind and the others by their name', () => {
      renderWidgetTable();

      expect(screen.getByTestId('dataGridHeaderCell-entity.id')).toHaveTextContent('Entity ID');
      expect(screen.getByTestId('dataGridHeaderCell-widget.name')).toHaveTextContent('widget.name');
      expect(screen.getByTestId('dataGridHeaderCell-widget.size')).toHaveTextContent('widget.size');
      expect(screen.getByTestId('dataGridHeaderCell-last_seen')).toHaveTextContent('Last seen');
    });

    it('renders the cells as returned, with last seen in the date format', () => {
      renderWidgetTable();

      expect(getCell(0, 'entity.id')).toHaveTextContent('widget:sprocket');
      expect(getCell(0, 'widget.name')).toHaveTextContent('sprocket');
      expect(getCell(0, 'widget.size')).toHaveTextContent('3');
      expect(getCell(0, 'last_seen')).toHaveTextContent('2026-10-30');
      expect(getCell(0, 'last_seen')).not.toHaveTextContent('T12:00');
    });

    it('shows the columns the user chose and ignores a chosen column the response lacks', () => {
      renderWidgetTable({ visibleColumns: ['widget.size', 'widget.color', 'entity.id'] });

      expect(getHeaderIds()).toEqual(['widget.size', 'entity.id']);
    });
  });

  it('shows every column of the response by default', () => {
    const list = getFixture('normal');
    renderTable(list);

    expect(getHeaderIds()).toEqual(list.columns.map(({ name }) => name));
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

  it.each(['normal', 'truncated'] as const)(
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
