/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import type {
  EuiDataGridColumn,
  EuiDataGridCellValueElementProps,
  EuiDataGridStyle,
  EuiDataGridToolBarVisibilityOptions,
} from '@elastic/eui';
import { EuiButtonEmpty, EuiDataGrid, EuiPanel } from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import { UI_SETTINGS } from '@kbn/data-service';
import type { InventoryEntityType, InventoryListResponse } from '../../../inventory_api/types';
import {
  ENTITY_INVENTORY_EBT_ACTIONS,
  ENTITY_INVENTORY_EBT_ELEMENTS,
} from '../../../ebt_constants';
import { useKibana } from '../../../hooks/use_kibana';
import { sortEntityRows } from '../../utils/sort_entity_rows';
import { EntityCell } from './entity_table_cells';
import { RESET_TO_DEFAULT_LABEL, getColumnLabel, getTableAriaLabel } from './translations';
import type { EntityTablePreferences } from './use_entity_table_state';
import { PAGE_SIZE_OPTIONS, useEntityTableState } from './use_entity_table_state';

/** Row rules only and a shaded header, as in the design's list tables. */
const GRID_STYLE: EuiDataGridStyle = {
  border: 'horizontal',
  header: 'shade',
  stripes: false,
  fontSize: 'm',
  cellPadding: 'm',
};

/** Wide enough for the full timestamp, which the grid would otherwise truncate. */
const LAST_SEEN_COLUMN_WIDTH = 230;

export interface EntityTableProps {
  entityType: InventoryEntityType;
  list: InventoryListResponse;
  /** The column, sort and page size choices; the caller keeps them while the table is unmounted. */
  preferences: EntityTablePreferences;
  onPreferencesChange: (preferences: EntityTablePreferences) => void;
}

/**
 * One entity type's results as a data grid, with the columns of the response in response order.
 * Sorting and pagination run over the loaded rows.
 */
export const EntityTable = ({
  entityType,
  list,
  preferences,
  onPreferencesChange,
}: EntityTableProps) => {
  const {
    services: { uiSettings },
  } = useKibana();
  const { type, name: typeName } = entityType;
  const dateFormat: string = uiSettings.get(UI_SETTINGS.DATE_FORMAT);

  const defaultVisibleColumns = useMemo(() => list.columns.map(({ name }) => name), [list.columns]);
  const {
    visibleColumns,
    setVisibleColumns,
    sortingColumns,
    onSort,
    pageIndex,
    setPageIndex,
    pageSize,
    onChangeItemsPerPage,
    reset,
  } = useEntityTableState({
    defaultVisibleColumns,
    rows: list.rows,
    preferences,
    onPreferencesChange,
  });

  const columnKinds = useMemo(
    () => new Map(list.columns.map(({ name, kind }) => [name, kind])),
    [list.columns]
  );
  const columns = useMemo<EuiDataGridColumn[]>(
    () =>
      list.columns.map((column) => ({
        id: column.name,
        displayAsText: getColumnLabel(column),
        isSortable: true,
        initialWidth: column.kind === 'last_seen' ? LAST_SEEN_COLUMN_WIDTH : undefined,
      })),
    [list.columns]
  );
  // A kept choice can name a column that a later response of the type does not have.
  const knownVisibleColumns = useMemo(
    () => visibleColumns.filter((id) => columnKinds.has(id)),
    [visibleColumns, columnKinds]
  );

  const sortedRows = useMemo(
    () => sortEntityRows(list.rows, sortingColumns),
    [list.rows, sortingColumns]
  );

  const renderCellValue = useCallback(
    ({ rowIndex, columnId }: EuiDataGridCellValueElementProps) => {
      const row = sortedRows[rowIndex];
      if (!row) {
        return null;
      }
      return (
        <EntityCell
          value={row[columnId]}
          kind={columnKinds.get(columnId)}
          dateFormat={dateFormat}
        />
      );
    },
    [sortedRows, columnKinds, dateFormat]
  );

  const toolbarVisibility = useMemo<EuiDataGridToolBarVisibilityOptions>(
    () => ({
      showColumnSelector: { allowHide: true, allowReorder: true },
      showSortSelector: true,
      showDisplaySelector: false,
      showFullScreenSelector: false,
      additionalControls: {
        right: (
          <EuiButtonEmpty
            size="xs"
            color="text"
            iconType="undo"
            onClick={reset}
            data-test-subj="entityInventoryTableReset"
            {...getEbtProps({
              action: ENTITY_INVENTORY_EBT_ACTIONS.RESET_TABLE,
              element: ENTITY_INVENTORY_EBT_ELEMENTS.ENTITY_TABLE,
              detail: type,
            })}
          >
            {RESET_TO_DEFAULT_LABEL}
          </EuiButtonEmpty>
        ),
      },
    }),
    [type, reset]
  );

  return (
    <EuiPanel
      hasBorder
      hasShadow={false}
      paddingSize="s"
      data-test-subj="entityInventoryTable"
      data-entity-type={type}
    >
      <EuiDataGrid
        aria-label={getTableAriaLabel(typeName)}
        columns={columns}
        columnVisibility={{ visibleColumns: knownVisibleColumns, setVisibleColumns }}
        gridStyle={GRID_STYLE}
        rowCount={sortedRows.length}
        renderCellValue={renderCellValue}
        sorting={{ columns: sortingColumns, onSort }}
        pagination={{
          pageIndex,
          pageSize,
          pageSizeOptions: PAGE_SIZE_OPTIONS,
          onChangePage: setPageIndex,
          onChangeItemsPerPage,
        }}
        toolbarVisibility={toolbarVisibility}
      />
    </EuiPanel>
  );
};
