/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  EuiDataGridColumn,
  EuiDataGridCellValueElementProps,
  EuiDataGridSorting,
  EuiDataGridStyle,
  EuiDataGridToolBarVisibilityOptions,
} from '@elastic/eui';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiDataGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiScreenReaderOnly,
  EuiText,
} from '@elastic/eui';
import moment from 'moment';
import { UI_SETTINGS } from '@kbn/data-service';
import { getEbtProps } from '@kbn/ebt-click';
import {
  ENTITY_INVENTORY_EBT_ACTIONS,
  ENTITY_INVENTORY_EBT_ELEMENTS,
} from '../../../ebt_constants';
import type {
  InventoryCellValue,
  InventoryEntityType,
  InventoryListResponse,
  InventoryRow,
} from '../../../inventory_api/types';
import { useKibana } from '../../../hooks/use_kibana';
import { formatCellValue } from '../../utils/format_cell_value';
import { sortEntityRows } from '../../utils/sort_entity_rows';
import {
  NAME_COLUMN_ID,
  getDefaultVisibleColumns,
  getDisplayConfig,
  getEntityName,
} from './entity_type_config';
import {
  NO_VALUE_LABEL,
  RESET_TO_DEFAULT_LABEL,
  getColumnLabel,
  getCompleteSummary,
  getTableAriaLabel,
  getTotalUnknownSummary,
  getTruncatedSummary,
} from './translations';

export const DEFAULT_PAGE_SIZE = 10;
const NO_BADGE_COLUMNS: readonly string[] = [];

/** Row rules only and a shaded header, as in the design's list tables. */
const GRID_STYLE: EuiDataGridStyle = {
  border: 'horizontal',
  header: 'shade',
  stripes: false,
  fontSize: 'm',
  cellPadding: 'm',
};
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

type SortingColumns = EuiDataGridSorting['columns'];

export interface EntityTableProps {
  entityType: InventoryEntityType;
  list: InventoryListResponse;
}

const EmptyCellValue = () => (
  <EuiText color="subdued" size="s">
    <span aria-hidden={true}>—</span>
    <EuiScreenReaderOnly>
      <span>{NO_VALUE_LABEL}</span>
    </EuiScreenReaderOnly>
  </EuiText>
);

const getSummary = (
  { rows, total, truncated }: InventoryListResponse,
  pageIndex: number,
  pageSize: number
): string => {
  const start = pageIndex * pageSize + 1;
  const end = Math.min(start + pageSize - 1, rows.length);
  if (total === null) {
    return getTotalUnknownSummary({ start, end, returned: rows.length });
  }
  if (truncated) {
    return getTruncatedSummary({ start, end, returned: rows.length, total });
  }
  return getCompleteSummary({ start, end, total });
};

/**
 * One entity type's results as a data grid. Sorting and pagination run over the rows held in
 * memory; column visibility and sort are not persisted (#6330).
 */
export const EntityTable = ({ entityType, list }: EntityTableProps) => {
  const {
    services: { uiSettings },
  } = useKibana();
  const { type, name: typeName } = entityType;
  const { iconType, nameFields, badgeColumns = NO_BADGE_COLUMNS } = getDisplayConfig(type);

  const defaultVisibleColumns = useMemo(
    () => getDefaultVisibleColumns(type, list.columns),
    [type, list.columns]
  );
  const [visibleColumns, setVisibleColumns] = useState(defaultVisibleColumns);
  // No sort keeps the server order: last seen, newest first.
  const [sortingColumns, setSortingColumns] = useState<SortingColumns>([]);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  useEffect(() => setPageIndex(0), [list]);

  const columns = useMemo<EuiDataGridColumn[]>(
    () =>
      [NAME_COLUMN_ID, ...list.columns.map(({ name }) => name)].map((id) => ({
        id,
        displayAsText: getColumnLabel(id),
        isSortable: true,
      })),
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

  const onSort = useCallback((nextSortingColumns: SortingColumns) => {
    setSortingColumns(nextSortingColumns);
    setPageIndex(0);
  }, []);

  const onChangeItemsPerPage = useCallback((nextPageSize: number) => {
    setPageSize(nextPageSize);
    setPageIndex(0);
  }, []);

  const onReset = useCallback(() => {
    setVisibleColumns(defaultVisibleColumns);
    setSortingColumns([]);
    setPageIndex(0);
  }, [defaultVisibleColumns]);

  const dateFormat: string = uiSettings.get(UI_SETTINGS.DATE_FORMAT);

  const renderCellValue = useCallback(
    ({ rowIndex, columnId }: EuiDataGridCellValueElementProps) => {
      const row = sortedRows[rowIndex];
      if (!row) {
        return null;
      }
      if (columnId === NAME_COLUMN_ID) {
        const entityName = formatCellValue(getEntityName(row, nameFields));
        return (
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiIcon type={iconType} aria-hidden={true} />
            </EuiFlexItem>
            <EuiFlexItem>{entityName ?? <EmptyCellValue />}</EuiFlexItem>
          </EuiFlexGroup>
        );
      }
      const value = row[columnId];
      if (columnId === 'last_seen' && typeof value === 'string') {
        return moment(value).format(dateFormat);
      }
      const text = formatCellValue(value);
      if (text === null) {
        return <EmptyCellValue />;
      }
      return badgeColumns.includes(columnId) ? (
        <EuiBadge color="hollow" data-test-subj="entityInventoryCellBadge">
          {text}
        </EuiBadge>
      ) : (
        text
      );
    },
    [sortedRows, nameFields, iconType, badgeColumns, dateFormat]
  );

  const toolbarVisibility = useMemo<EuiDataGridToolBarVisibilityOptions>(
    () => ({
      showColumnSelector: { allowHide: true, allowReorder: true },
      showSortSelector: true,
      showDisplaySelector: false,
      showFullScreenSelector: false,
      additionalControls: {
        left: (
          <EuiText size="xs" data-test-subj="entityInventoryTableSummary">
            {getSummary(list, pageIndex, pageSize)}
          </EuiText>
        ),
        right: (
          <EuiButtonEmpty
            size="xs"
            color="text"
            iconType="undo"
            onClick={onReset}
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
    [list, pageIndex, pageSize, onReset, type]
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
