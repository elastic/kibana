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
import { EuiDataGrid, EuiPanel } from '@elastic/eui';
import { UI_SETTINGS } from '@kbn/data-service';
import type {
  InventoryCellValue,
  InventoryEntityType,
  InventoryListResponse,
  InventoryRow,
} from '../../../inventory_api/types';
import { useKibana } from '../../../hooks/use_kibana';
import { formatCellValue } from '../../utils/format_cell_value';
import { sortEntityRows } from '../../utils/sort_entity_rows';
import { getColumnLabel } from './column_labels';
import { EntityCell, EntityNameCell } from './entity_table_cells';
import { EntityTableResetButton } from './entity_table_reset_button';
import {
  NAME_COLUMN_ID,
  getDefaultVisibleColumns,
  getDisplayConfig,
  getEntityName,
} from './entity_type_config';
import { getTableAriaLabel } from './translations';
import { PAGE_SIZE_OPTIONS, useEntityTableState } from './use_entity_table_state';

/** Row rules only and a shaded header, as in the design's list tables. */
const GRID_STYLE: EuiDataGridStyle = {
  border: 'horizontal',
  header: 'shade',
  stripes: false,
  fontSize: 'm',
  cellPadding: 'm',
};

export interface EntityTableProps {
  entityType: InventoryEntityType;
  list: InventoryListResponse;
}

/** One entity type's results as a data grid. Sorting and pagination run over the loaded rows. */
export const EntityTable = ({ entityType, list }: EntityTableProps) => {
  const {
    services: { uiSettings },
  } = useKibana();
  const { type, name: typeName } = entityType;
  const { iconType, nameFields, badgeColumns } = getDisplayConfig(type);
  const dateFormat: string = uiSettings.get(UI_SETTINGS.DATE_FORMAT);

  const defaultVisibleColumns = useMemo(
    () => getDefaultVisibleColumns(type, list.columns),
    [type, list.columns]
  );
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
  } = useEntityTableState({ defaultVisibleColumns, rows: list.rows });

  const columns = useMemo<EuiDataGridColumn[]>(
    () =>
      [NAME_COLUMN_ID, ...list.columns.map(({ name }) => name)].map((id) => ({
        id,
        displayAsText: getColumnLabel(id),
        isSortable: true,
      })),
    [list.columns]
  );
  const columnKinds = useMemo(
    () => new Map(list.columns.map(({ name, kind }) => [name, kind])),
    [list.columns]
  );

  const getSortValue = useCallback(
    (row: InventoryRow, columnId: string): InventoryCellValue | undefined =>
      columnId === NAME_COLUMN_ID ? getEntityName(row, nameFields) : row[columnId],
    [nameFields]
  );
  const sortedRows = useMemo(
    () => sortEntityRows(list.rows, sortingColumns, getSortValue),
    [list.rows, sortingColumns, getSortValue]
  );

  const renderCellValue = useCallback(
    ({ rowIndex, columnId }: EuiDataGridCellValueElementProps) => {
      const row = sortedRows[rowIndex];
      if (!row) {
        return null;
      }
      if (columnId === NAME_COLUMN_ID) {
        return (
          <EntityNameCell
            name={formatCellValue(getEntityName(row, nameFields))}
            iconType={iconType}
          />
        );
      }
      return (
        <EntityCell
          value={row[columnId]}
          kind={columnKinds.get(columnId)}
          isBadge={badgeColumns.includes(columnId)}
          dateFormat={dateFormat}
        />
      );
    },
    [sortedRows, nameFields, iconType, badgeColumns, columnKinds, dateFormat]
  );

  const toolbarVisibility = useMemo<EuiDataGridToolBarVisibilityOptions>(
    () => ({
      showColumnSelector: { allowHide: true, allowReorder: true },
      showSortSelector: true,
      showDisplaySelector: false,
      showFullScreenSelector: false,
      additionalControls: { right: <EntityTableResetButton entityType={type} onReset={reset} /> },
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
        columnVisibility={{ visibleColumns, setVisibleColumns }}
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
