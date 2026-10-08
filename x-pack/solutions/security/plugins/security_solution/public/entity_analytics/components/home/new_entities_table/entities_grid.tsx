/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, memo, useCallback, useContext, useMemo, useState } from 'react';
import {
  EuiButton,
  EuiButtonIcon,
  EuiDataGrid,
  EuiEmptyPrompt,
  EuiProgress,
  EuiScreenReaderOnly,
  EuiToolTip,
  useEuiFontSize,
  useEuiTheme,
  type EuiDataGridCellValueElementProps,
  type EuiDataGridColumn,
  type EuiDataGridControlColumn,
  type EuiDataGridCustomBodyProps,
  type EuiDataGridStyle,
  type EuiDataGridStyleCellPaddings,
  type EuiThemeComputed,
  type RenderCellValue,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useResetEntityGridFilters } from './use_entity_grid_filters';
import { useEntityGridData } from './use_entity_grid_data';
import { useEntityChildren } from './use_entity_children';
import { GROUP_SIZE_FIELD, PAGE_SIZE_OPTIONS, entityIdsOf, getEntityId, getNumber } from './common';
import { renderEntityCell, RowActionsCell } from './entities_cell_renderer';
import { ExpandedEntityRow } from './entities_expanded_row';
import { AdditionalControls } from '../entities_table/additional_controls';
import { DataViewContext } from '../entities_table';
import { LastUpdated } from '../last_updated';
import type { CellHandlers, RowActions } from './entities_cell_renderer';
import { isGridColumnId } from './grid_columns';
import { useEntityAnalyticsUrlState } from './use_entity_analytics_url_state';
import type { TimeRange } from './use_entity_analytics_url_state';
import type { Row, RowsMode, SortDir } from './common';

const GRID_ARIA_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.home.grid.ariaLabel',
  { defaultMessage: 'Entity analytics grid' }
);

const RESOLVED_ROWS_TOTAL_TITLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.home.grid.resolvedRowsTotalTitle',
  { defaultMessage: 'resolved entities' }
);

const INDIVIDUAL_ROWS_TOTAL_TITLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.home.grid.individualRowsTotalTitle',
  { defaultMessage: 'entity records' }
);

const EMPTY_GRID_MESSAGE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.home.grid.emptyMessage',
  { defaultMessage: 'No records match the current filters' }
);

const RESET_FILTERS_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.home.grid.resetFiltersButton',
  { defaultMessage: 'Reset' }
);

const EXPANDER_HEADER_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.home.grid.expanderColumnAriaLabel',
  { defaultMessage: 'Expand group' }
);

const GRID_STYLE: EuiDataGridStyle = {
  border: 'none',
  header: 'underline',
  cellPadding: 'm',
  fontSize: 'm',
  stripes: false,
};

const rowCellsCss = css`
  display: flex;
`;

const expandRowLabel = (isExpanded: boolean) =>
  isExpanded
    ? i18n.translate('xpack.securitySolution.entityAnalytics.home.grid.collapseRowAriaLabel', {
        defaultMessage: 'Collapse group',
      })
    : i18n.translate('xpack.securitySolution.entityAnalytics.home.grid.expandRowAriaLabel', {
        defaultMessage: 'Expand group',
      });

/** EUI `cellContext` — must stay stable on expand or every cell remounts. */
interface EntityGridCellContext {
  rows: Row[];
  pageIndex: number;
  pageSize: number;
  watchlistNames: Map<string, string>;
  euiTheme: EuiThemeComputed;
  cellHandlers?: CellHandlers;
  /** The painted rows are not enriched yet; enrich cells stay blank until they are. */
  isEnriching: boolean;
}

/** Custom-body / expander React context — expand state lives here, not in cellContext. */
interface EntityGridView extends EntityGridCellContext {
  expandedIds: ReadonlySet<string>;
  childMap: Map<string, Row[]>;
  columns: EuiDataGridColumn[];
  prefetchChildren: (entityId: string) => void;
  toggleExpandedId: (entityId: string) => void;
  rowActions?: RowActions;
  isFetching: boolean;
  /** Grid density from the display selector; expanded child rows match it. */
  cellPadding: EuiDataGridStyleCellPaddings;
}

const EntityGridBodyContext = createContext<EntityGridView | null>(null);

const useEntityGridView = (): EntityGridView => {
  const value = useContext(EntityGridBodyContext);
  if (!value) {
    throw new Error('EntityGridBodyContext is missing');
  }
  return value;
};

const RenderEntityGridCell: RenderCellValue = (cellProps) => {
  const { rowIndex, columnId } = cellProps;
  const { rows, pageIndex, pageSize, watchlistNames, euiTheme, cellHandlers, isEnriching } =
    cellProps as typeof cellProps & EntityGridCellContext;
  const row = rows[rowIndex - pageIndex * pageSize];
  if (!row) return null;
  return renderEntityCell(
    columnId,
    row[columnId],
    row,
    watchlistNames,
    euiTheme,
    cellHandlers,
    isEnriching
  );
};

const EntityGridExpanderHeader = () => (
  <EuiScreenReaderOnly>
    <span>{EXPANDER_HEADER_LABEL}</span>
  </EuiScreenReaderOnly>
);

const EntityGridExpanderCell = ({ rowIndex }: EuiDataGridCellValueElementProps) => {
  const { rows, pageIndex, pageSize, expandedIds, prefetchChildren, toggleExpandedId } =
    useEntityGridView();
  const row = rows[rowIndex - pageIndex * pageSize];
  if (!row) return null;
  const entityId = getEntityId(row);
  const groupSize = getNumber(row, GROUP_SIZE_FIELD) ?? 1;
  if (!entityId || groupSize <= 1) return null;
  const isExpanded = expandedIds.has(entityId);
  const label = expandRowLabel(isExpanded);
  return (
    <EuiToolTip content={label} disableScreenReaderOutput>
      <EuiButtonIcon
        size="xs"
        color="text"
        aria-label={label}
        iconType={isExpanded ? 'chevronSingleDown' : 'chevronSingleRight'}
        onMouseEnter={() => prefetchChildren(entityId)}
        onFocus={() => prefetchChildren(entityId)}
        onClick={() => toggleExpandedId(entityId)}
      />
    </EuiToolTip>
  );
};

const EXPANDER_COLUMN: EuiDataGridControlColumn = {
  id: 'expander',
  width: 36,
  headerCellRender: EntityGridExpanderHeader,
  rowCellRender: EntityGridExpanderCell,
};

const ACTIONS_HEADER_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.home.grid.actionsColumnHeader',
  { defaultMessage: 'Actions' }
);

const EntityGridActionsHeader = () => <>{ACTIONS_HEADER_LABEL}</>;

const EntityGridActionsCell = ({ rowIndex }: EuiDataGridCellValueElementProps) => {
  const { rows, pageIndex, pageSize, rowActions } = useEntityGridView();
  const row = rows[rowIndex - pageIndex * pageSize];
  if (!row || !rowActions) return null;
  return (
    <RowActionsCell
      onInvestigateInTimeline={() => rowActions.onInvestigateInTimeline(row)}
      onOpenEntityGraph={() => rowActions.onOpenEntityGraph(row)}
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

const EntityGridCustomBody = memo(
  ({
    Cell,
    visibleColumns: visCols,
    visibleRowData,
    headerRow,
    footerRow,
  }: EuiDataGridCustomBodyProps) => {
    const { euiTheme } = useEuiTheme();
    const {
      rows,
      expandedIds,
      childMap,
      columns,
      watchlistNames,
      cellHandlers,
      isFetching,
      cellPadding,
    } = useEntityGridView();
    const onResetFilters = useResetEntityGridFilters();
    // One style object for all rows, instead of serializing it again for each row.
    const rowCss = useMemo(
      () => css`
        inline-size: fit-content;
        min-inline-size: 100%;
        border-block-end: ${euiTheme.border.thin};
      `,
      [euiTheme.border.thin]
    );

    return (
      <>
        {headerRow}
        {rows.length === 0 && !isFetching ? (
          <EuiEmptyPrompt
            color="transparent"
            body={<p>{EMPTY_GRID_MESSAGE}</p>}
            paddingSize="l"
            actions={
              <EuiButton size="s" color="primary" fill onClick={onResetFilters}>
                {RESET_FILTERS_LABEL}
              </EuiButton>
            }
          />
        ) : (
          rows.map((row, i) => {
            const absoluteIndex = visibleRowData.startRow + i;
            const entityId = getEntityId(row);
            const children =
              entityId && expandedIds.has(entityId) ? childMap.get(entityId) ?? [] : [];
            return (
              <React.Fragment key={entityId ?? i}>
                <div role="row" className="euiDataGridRow" css={rowCss}>
                  <div css={rowCellsCss}>
                    {visCols.map((col, ci) => (
                      <Cell
                        colIndex={ci}
                        visibleRowIndex={absoluteIndex}
                        key={`${entityId}-${col.id}`}
                      />
                    ))}
                  </div>
                </div>
                {children.map((child, childIdx) => (
                  <ExpandedEntityRow
                    key={`${entityId}-child-${childIdx}`}
                    child={child}
                    isLast={childIdx === children.length - 1}
                    cellPadding={cellPadding}
                    visCols={visCols}
                    columns={columns}
                    euiTheme={euiTheme}
                    watchlistNames={watchlistNames}
                    handlers={cellHandlers}
                  />
                ))}
              </React.Fragment>
            );
          })
        )}
        {footerRow}
      </>
    );
  }
);
EntityGridCustomBody.displayName = 'EntityGridCustomBody';

export interface EntitiesGridProps {
  columns: readonly EuiDataGridColumn[];
  rowsMode: RowsMode;
  timeRange: TimeRange;
  watchlistNames: Map<string, string>;
  sortField: string;
  sortDirection: SortDir;
  onSortChange: (field: string, direction: SortDir) => void;
  pageIndex: number;
  pageSize: number;
  onPageChange: (index: number) => void;
  onPageSizeChange: (size: number) => void;
  searchExpression?: string;
  entityExpression?: string;
  cellHandlers?: CellHandlers;
  rowActions?: RowActions;
  /** When provided, shows the full toolbar with controls. */
  groupSelectorComponent?: React.ReactNode;
  pageSizeOptions?: number[];
  /** Called when the grid enters or leaves full screen. */
  onFullScreenChange?: (isFullScreen: boolean) => void;
}

export const EntitiesGrid: React.FC<EntitiesGridProps> = ({
  columns,
  rowsMode,
  timeRange,
  watchlistNames,
  sortField,
  sortDirection,
  onSortChange,
  pageIndex,
  pageSize,
  onPageChange,
  onPageSizeChange,
  searchExpression,
  entityExpression,
  cellHandlers,
  rowActions,
  groupSelectorComponent,
  pageSizeOptions = PAGE_SIZE_OPTIONS,
  onFullScreenChange,
}) => {
  const { euiTheme } = useEuiTheme();
  const { fontSize: toolbarFontSize, lineHeight: toolbarLineHeight } = useEuiFontSize('xs');
  const { dataView } = useContext(DataViewContext);
  const isIndividualRows = rowsMode === 'individual';
  const showToolbar = groupSelectorComponent !== undefined;

  const { expandedIds: expandedIdList, toggleExpandedId } = useEntityAnalyticsUrlState();
  const expandedIds = useMemo(() => new Set(expandedIdList), [expandedIdList]);

  const [visibleColumns, setVisibleColumns] = useState(() => columns.map((c) => c.id));
  // When the column set changes (rows mode), show its columns and keep the user's extra
  // fields. Adjusting state during render avoids a commit with stale visibility.
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

  const { rows, isEnriching, total, updatedAt, isFetching } = useEntityGridData({
    sortField,
    sortDirection,
    pageIndex,
    pageSize,
    searchExpression,
    entityExpression,
    timeRange,
    rowsMode,
    keepFields,
  });

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
      columns: [{ id: sortField, direction: sortDirection }],
      onSort: (cols: Array<{ id: string; direction: SortDir }>) => {
        const col = cols.find((c) => c.id !== sortField) ?? cols[0];
        if (!col) return;
        onSortChange(col.id, col.direction);
      },
    }),
    [sortField, sortDirection, onSortChange]
  );

  // Fetch children only for expanded rows on this page; the URL can hold more ids.
  const pageExpandedIds = useMemo(
    () => new Set(entityIdsOf(rows).filter((id) => expandedIds.has(id))),
    [rows, expandedIds]
  );

  const {
    childMap,
    isAnyChildFetching: isChildrenFetching,
    prefetchChildren,
  } = useEntityChildren({
    expandedIds: pageExpandedIds,
    timeRange,
    keepFields,
  });

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

  const columnVisibility = useMemo(() => ({ visibleColumns, setVisibleColumns }), [visibleColumns]);

  const pagination = useMemo(
    () => ({
      pageIndex,
      pageSize,
      pageSizeOptions,
      onChangePage: onPageChange,
      onChangeItemsPerPage: onPageSizeChange,
    }),
    [pageIndex, pageSize, pageSizeOptions, onPageChange, onPageSizeChange]
  );

  const toolbarVisibility = useMemo(
    () =>
      showToolbar
        ? {
            showColumnSelector: true,
            showSortSelector: false,
            showDisplaySelector: true,
            showKeyboardShortcuts: true,
            additionalControls: {
              left: {
                prepend: (
                  <div
                    css={css`
                      .entityAnalyticsDataTableTotal {
                        font-weight: ${euiTheme.font.weight.semiBold};
                        font-size: ${toolbarFontSize};
                        line-height: ${toolbarLineHeight};
                        border-inline-end: ${euiTheme.border.thin};
                        padding-inline-end: ${euiTheme.size.m};
                        margin-inline-end: ${euiTheme.size.xs};
                      }
                    `}
                  >
                    <AdditionalControls
                      total={total}
                      title={
                        isIndividualRows ? INDIVIDUAL_ROWS_TOTAL_TITLE : RESOLVED_ROWS_TOTAL_TITLE
                      }
                      columns={visibleColumns}
                      onAddColumn={onAddColumn}
                      onRemoveColumn={onRemoveColumn}
                      onResetColumns={onResetColumns}
                      showFieldsButton={true}
                    />
                  </div>
                ),
              },
              right: (
                <div
                  css={css`
                    display: flex;
                    align-items: center;
                    gap: ${euiTheme.size.m};
                  `}
                >
                  {updatedAt != null ? <LastUpdated updatedAt={updatedAt} /> : null}
                  {groupSelectorComponent}
                </div>
              ),
            },
          }
        : false,
    [
      showToolbar,
      total,
      isIndividualRows,
      visibleColumns,
      onAddColumn,
      onRemoveColumn,
      onResetColumns,
      updatedAt,
      euiTheme.font.weight.semiBold,
      toolbarFontSize,
      toolbarLineHeight,
      euiTheme.border.thin,
      euiTheme.size.m,
      euiTheme.size.xs,
      groupSelectorComponent,
    ]
  );

  const cellContext = useMemo(
    (): EntityGridCellContext => ({
      rows,
      pageIndex,
      pageSize,
      watchlistNames,
      euiTheme,
      cellHandlers,
      isEnriching,
    }),
    [rows, pageIndex, pageSize, watchlistNames, euiTheme, cellHandlers, isEnriching]
  );

  const gridView = useMemo(
    (): EntityGridView => ({
      ...cellContext,
      expandedIds,
      childMap,
      columns: gridColumns,
      prefetchChildren,
      toggleExpandedId,
      rowActions,
      isFetching,
      cellPadding,
    }),
    [
      cellContext,
      expandedIds,
      childMap,
      gridColumns,
      prefetchChildren,
      toggleExpandedId,
      rowActions,
      isFetching,
      cellPadding,
    ]
  );

  return (
    <div
      css={css`
        padding-block-start: 12px;
        position: relative;
      `}
    >
      {(isFetching || isChildrenFetching) && (
        <EuiProgress size="xs" color="accent" position="absolute" />
      )}
      <EntityGridBodyContext.Provider value={gridView}>
        <EuiDataGrid
          aria-label={GRID_ARIA_LABEL}
          leadingControlColumns={
            isIndividualRows ? INDIVIDUAL_LEADING_CONTROL_COLUMNS : RESOLVED_LEADING_CONTROL_COLUMNS
          }
          columns={gridColumns}
          columnVisibility={columnVisibility}
          rowCount={total}
          renderCellValue={RenderEntityGridCell}
          cellContext={cellContext}
          renderCustomGridBody={EntityGridCustomBody}
          sorting={sorting}
          pagination={pagination}
          toolbarVisibility={toolbarVisibility}
          gridStyle={gridStyle}
          onFullScreenChange={onFullScreenChange}
        />
      </EntityGridBodyContext.Provider>
    </div>
  );
};
