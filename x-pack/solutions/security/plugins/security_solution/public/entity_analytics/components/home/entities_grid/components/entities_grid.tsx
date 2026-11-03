/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useContext, useMemo, useState } from 'react';
import {
  EuiDataGrid,
  EuiProgress,
  useEuiTheme,
  type EuiDataGridCellValueElementProps,
  type EuiDataGridColumn,
  type EuiDataGridControlColumn,
  type EuiDataGridStyle,
  type EuiDataGridStyleCellPaddings,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useIsFetching } from '@kbn/react-query';
import {
  ENTITY_GRID_CHILDREN_QUERY_KEY,
  MAX_LOADED_ROWS,
  useEntityGridData,
} from '../hooks/use_entity_grid_data';
import {
  EntityGridRowsContext,
  RenderEntityGridCell,
  bindRowsMode,
} from './entities_cell_renderer';
import type { CellHandlers, EntityGridCellContext, EntityGridRows } from './entities_cell_renderer';
import { RowActionsCell } from './cells/row_actions_cell';
import type { RowActions } from './cells/row_actions_cell';
import { EXPANDER_COLUMN, getGroupRecordsOptions } from './entities_expanded_row';
import { EntityGridCustomBody } from './entities_grid_custom_body';
import { getEntityGridToolbarVisibility } from './entities_grid_toolbar';
import { EntityGridBodyContext, useEntityGridView } from './entities_grid_view_context';
import type { EntityGridView } from './entities_grid_view_context';
import { DataViewContext } from '../../entities_table';
import { getReadableColumns, isGridColumnId } from '../grid_columns';
import type { ReadAccess } from '../grid_columns';
import { useEntityAnalyticsUrlState } from '../hooks/use_entity_analytics_url_state';
import { RISK_SCORE_NORM_FIELD } from '../common';
import type { RowsMode, SortDir, TimeRange } from '../common';

const gridContainerCss = css`
  block-size: 100%;
  padding-block-start: 12px;
  position: relative;
`;

const GRID_ARIA_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.home.grid.ariaLabel',
  { defaultMessage: 'Entity analytics grid' }
);

const GRID_STYLE: EuiDataGridStyle = {
  border: 'none',
  header: 'underline',
  cellPadding: 'm',
  fontSize: 'm',
  stripes: false,
};

const ACTIONS_HEADER_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.home.grid.actionsColumnHeader',
  { defaultMessage: 'Actions' }
);

const EntityGridActionsHeader = () => <>{ACTIONS_HEADER_LABEL}</>;

const EntityGridActionsCell = ({ rowIndex }: EuiDataGridCellValueElementProps) => {
  const { rows, rowActions } = useEntityGridView();
  const row = rows[rowIndex];
  if (!row || !rowActions) return null;
  const { onInvestigateInTimeline, onOpenEntityGraph, onAddToChat } = rowActions;
  return (
    <RowActionsCell
      onInvestigateInTimeline={() => onInvestigateInTimeline(row)}
      onOpenEntityGraph={() => onOpenEntityGraph(row)}
      onAddToChat={onAddToChat && (() => onAddToChat(row))}
    />
  );
};

const ACTIONS_COLUMN: EuiDataGridControlColumn = {
  id: 'actions',
  width: 110,
  headerCellRender: EntityGridActionsHeader,
  rowCellRender: EntityGridActionsCell,
};

const INDIVIDUAL_LEADING_CONTROL_COLUMNS: EuiDataGridControlColumn[] = [ACTIONS_COLUMN];
const RESOLVED_LEADING_CONTROL_COLUMNS: EuiDataGridControlColumn[] = [
  EXPANDER_COLUMN,
  ACTIONS_COLUMN,
];

export interface EntitiesGridProps {
  columns: readonly EuiDataGridColumn[];
  rowsMode: RowsMode;
  timeRange: TimeRange;
  watchlistNames: Map<string, string>;
  sortField: string;
  sortDirection: SortDir;
  onSortChange: (field: string, direction: SortDir) => void;
  searchExpression?: string;
  entityExpression?: string;
  cellHandlers?: CellHandlers;
  rowActions?: RowActions;
  /** Columns of a source the user can't read are left out, so their queries never run. */
  readAccess: ReadAccess;
  /** Without them the grid has no toolbar, as inside a group. */
  toolbarControls?: React.ReactNode;
  onFullScreenChange?: (isFullScreen: boolean) => void;
}

export const EntitiesGrid: React.FC<EntitiesGridProps> = ({
  columns: rowsColumns,
  rowsMode,
  timeRange,
  watchlistNames,
  sortField,
  sortDirection,
  onSortChange,
  searchExpression,
  entityExpression,
  cellHandlers,
  rowActions,
  readAccess,
  toolbarControls,
  onFullScreenChange,
}) => {
  const { euiTheme } = useEuiTheme();
  const { dataView } = useContext(DataViewContext);
  const columns = useMemo(
    () => getReadableColumns(rowsColumns, readAccess),
    [rowsColumns, readAccess]
  );
  const columnIds = useMemo(() => columns.map(({ id }) => id), [columns]);
  // A sort from the URL on a column the user can't read would still query its source.
  const isSortReadable = !isGridColumnId(sortField) || columnIds.includes(sortField);
  const readableSortField = isSortReadable ? sortField : RISK_SCORE_NORM_FIELD;
  const readableSortDirection = isSortReadable ? sortDirection : 'desc';
  const isIndividualRows = rowsMode === 'individual';

  const { expandedIds: expandedIdList, toggleExpandedId } = useEntityAnalyticsUrlState();
  const expandedIds = useMemo(() => new Set(expandedIdList), [expandedIdList]);

  const [visibleColumns, setVisibleColumns] = useState(() => columns.map((c) => c.id));
  // Set during render, not in an effect, so a rows mode change never commits stale columns.
  const [columnsForVisibility, setColumnsForVisibility] = useState(columns);
  if (columnsForVisibility !== columns) {
    const prevCatalog = new Set(columnsForVisibility.map((c) => c.id));
    setColumnsForVisibility(columns);
    setVisibleColumns((prev) => [
      ...columns.map((c) => c.id),
      ...prev.filter((id) => !prevCatalog.has(id)),
    ]);
  }

  const [cellPadding, setCellPadding] = useState<EuiDataGridStyleCellPaddings>(
    GRID_STYLE.cellPadding ?? 'm'
  );
  const gridStyle = useMemo(
    (): EuiDataGridStyle => ({
      ...GRID_STYLE,
      onChange: ({ cellPadding: next }) => {
        if (next) setCellPadding(next);
      },
    }),
    []
  );

  const keepFields = useMemo(
    () => visibleColumns.filter((id) => !isGridColumnId(id)),
    [visibleColumns]
  );

  const {
    rows,
    isEnriching,
    total,
    updatedAt,
    isFetching,
    isAtLoadLimit,
    prefetch,
    onRowsInViewChange,
  } = useEntityGridData(
    {
      sortField: readableSortField,
      sortDirection: readableSortDirection,
      pageSize: MAX_LOADED_ROWS,
      searchExpression,
      entityExpression,
      timeRange,
      rowsMode,
      keepFields,
      columnIds,
    },
    { enrichRowsInView: true }
  );

  const onAddColumn = useCallback(
    (columnId: string) =>
      setVisibleColumns((prev) => (prev.includes(columnId) ? prev : [...prev, columnId])),
    []
  );
  const onRemoveColumn = useCallback(
    (columnId: string) => setVisibleColumns((prev) => prev.filter((id) => id !== columnId)),
    []
  );
  const onResetColumns = useCallback(() => setVisibleColumns(columns.map((c) => c.id)), [columns]);

  const sorting = useMemo(
    () => ({
      columns: [{ id: readableSortField, direction: readableSortDirection }],
      onSort: (cols: Array<{ id: string; direction: SortDir }>) => {
        // EUI passes every sorted column; the one the user just picked isn't the current sort.
        const col = cols.find((c) => c.id !== readableSortField) ?? cols[0];
        if (!col) return;
        onSortChange(col.id, col.direction);
      },
    }),
    [readableSortField, readableSortDirection, onSortChange]
  );

  // Expanded groups on this page read their records; the URL can hold more expanded ids.
  const isChildrenFetching = useIsFetching({ queryKey: ENTITY_GRID_CHILDREN_QUERY_KEY }) > 0;

  const extraColumns = useMemo(
    (): EuiDataGridColumn[] =>
      keepFields.map((id) => ({
        id,
        displayAsText: dataView?.getFieldByName(id)?.customLabel || id,
        initialWidth: 160,
        isSortable: false,
        isExpandable: false,
        isResizable: false,
      })),
    [keepFields, dataView]
  );

  const gridColumns = useMemo(() => [...columns, ...extraColumns], [columns, extraColumns]);

  const prefetchChildren = useCallback(
    (entityId: string) => {
      const { mainEntity, aliases } = getGroupRecordsOptions(
        entityId,
        timeRange,
        keepFields,
        gridColumns
      );
      prefetch(mainEntity);
      prefetch(aliases);
    },
    [prefetch, timeRange, keepFields, gridColumns]
  );

  const columnVisibility = useMemo(() => ({ visibleColumns, setVisibleColumns }), [visibleColumns]);

  const shown = isAtLoadLimit ? rows.length : undefined;
  const toolbarVisibility = useMemo(
    () =>
      toolbarControls
        ? getEntityGridToolbarVisibility({
            total,
            shown,
            isIndividualRows,
            visibleColumns,
            onAddColumn,
            onRemoveColumn,
            onResetColumns,
            updatedAt,
            controls: toolbarControls,
          })
        : false,
    [
      total,
      shown,
      isIndividualRows,
      visibleColumns,
      onAddColumn,
      onRemoveColumn,
      onResetColumns,
      updatedAt,
      toolbarControls,
    ]
  );

  const cellContext = useMemo(
    (): EntityGridCellContext => ({
      watchlistNames,
      euiTheme,
      cellHandlers: cellHandlers && bindRowsMode(cellHandlers, rowsMode),
    }),
    [watchlistNames, euiTheme, cellHandlers, rowsMode]
  );
  const recordCellHandlers = useMemo(
    () => cellHandlers && bindRowsMode(cellHandlers, 'individual'),
    [cellHandlers]
  );
  const rowsContext = useMemo((): EntityGridRows => ({ rows, isEnriching }), [rows, isEnriching]);

  const gridView = useMemo(
    (): EntityGridView => ({
      ...cellContext,
      ...rowsContext,
      expandedIds,
      timeRange,
      keepFields,
      columns: gridColumns,
      prefetchChildren,
      toggleExpandedId,
      rowActions,
      recordCellHandlers,
      isFetching,
      cellPadding,
      onRowsInViewChange,
    }),
    [
      cellContext,
      rowsContext,
      expandedIds,
      timeRange,
      keepFields,
      gridColumns,
      prefetchChildren,
      toggleExpandedId,
      rowActions,
      recordCellHandlers,
      isFetching,
      cellPadding,
      onRowsInViewChange,
    ]
  );

  return (
    <div css={gridContainerCss}>
      {(isFetching || isChildrenFetching) && (
        <EuiProgress size="xs" color="accent" position="absolute" />
      )}
      <EntityGridBodyContext.Provider value={gridView}>
        <EntityGridRowsContext.Provider value={rowsContext}>
          <EuiDataGrid
            aria-label={GRID_ARIA_LABEL}
            leadingControlColumns={
              isIndividualRows
                ? INDIVIDUAL_LEADING_CONTROL_COLUMNS
                : RESOLVED_LEADING_CONTROL_COLUMNS
            }
            columns={gridColumns}
            columnVisibility={columnVisibility}
            rowCount={rows.length}
            renderCellValue={RenderEntityGridCell}
            cellContext={cellContext}
            renderCustomGridBody={EntityGridCustomBody}
            sorting={sorting}
            toolbarVisibility={toolbarVisibility}
            gridStyle={gridStyle}
            onFullScreenChange={onFullScreenChange}
          />
        </EntityGridRowsContext.Provider>
      </EntityGridBodyContext.Provider>
    </div>
  );
};
