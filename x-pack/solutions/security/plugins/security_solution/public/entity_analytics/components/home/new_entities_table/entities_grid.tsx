/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  EuiButtonIcon,
  EuiDataGrid,
  EuiProgress,
  EuiToolTip,
  useEuiTheme,
  type EuiDataGridCustomBodyProps,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useEntityGridData } from './use_entity_grid_data';
import { useEntityChildren } from './use_entity_children';
import { PAGE_SIZE_OPTIONS } from './common';
import { renderEntityCell } from './entities_cell_renderer';
import { ExpandedEntityRow } from './entities_expanded_row';
import { AdditionalControls } from '../entities_table/additional_controls';
import { LastUpdated } from '../last_updated';
import type { CellHandlers, RowActions } from './entities_cell_renderer';
import type { GridColumnId, ColumnDescriptor } from './columns/registry';
import { useEntityAnalyticsUrlState } from './use_entity_analytics_url_state';
import type { TimeRange } from './use_entity_analytics_url_state';
import type { Row } from './common';

const GRID_ARIA_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.home.grid.ariaLabel',
  { defaultMessage: 'Entity analytics grid' }
);

const expandRowLabel = (isExpanded: boolean) =>
  isExpanded
    ? i18n.translate('xpack.securitySolution.entityAnalytics.home.grid.collapseRowAriaLabel', {
        defaultMessage: 'Collapse group',
      })
    : i18n.translate('xpack.securitySolution.entityAnalytics.home.grid.expandRowAriaLabel', {
        defaultMessage: 'Expand group',
      });

export interface EntitiesGridProps {
  columns: ColumnDescriptor[];
  view: 'resolved' | 'raw';
  timeRange: TimeRange;
  watchlistNames: Map<string, string>;
  sortField: string;
  sortDirection: 'asc' | 'desc';
  onSortChange: (field: string, direction: 'asc' | 'desc') => void;
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
}

export const EntitiesGrid: React.FC<EntitiesGridProps> = ({
  columns,
  view,
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
}) => {
  const { euiTheme } = useEuiTheme();
  const isRawView = view === 'raw';
  const showToolbar = groupSelectorComponent !== undefined;

  // ── pagination cursors ────────────────────────────────────────────────────
  const [cursors, setCursors] = useState<Array<string | null>>([null]);
  const [targetPageIndex, setTargetPageIndex] = useState<number | null>(null);

  // ── expansion (URL-persisted) ─────────────────────────────────────────────
  const {
    expandedIds: expandedIdList,
    toggleExpandedId,
    clearExpandedIds,
  } = useEntityAnalyticsUrlState();
  const expandedIds = useMemo(() => new Set(expandedIdList), [expandedIdList]);
  const { childMap, isChildFetching, prefetchChildren, resetChildren } = useEntityChildren({
    expandedIds,
    timeRange,
  });

  // ── column visibility ─────────────────────────────────────────────────────
  const [visibleColumns, setVisibleColumns] = useState(columns.map((c) => c.id));

  const resetCursors = useCallback(() => {
    setCursors([null]);
    setTargetPageIndex(null);
  }, []);

  const resetPagination = useCallback(() => {
    onPageChange(0);
    resetCursors();
  }, [onPageChange, resetCursors]);

  // Filter / time range: reset cursor pagination only — keep expanded rows.
  // View switch: clear expansion (different row model) and child cache.
  const isFirstRender = useRef(true);
  const prevViewRef = useRef(view);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      prevViewRef.current = view;
      return;
    }
    resetPagination();
    if (prevViewRef.current !== view) {
      prevViewRef.current = view;
      clearExpandedIds();
      resetChildren();
    }
  }, [
    searchExpression,
    entityExpression,
    view,
    timeRange,
    resetPagination,
    clearExpandedIds,
    resetChildren,
  ]);

  // Sync visible columns when the column set changes (e.g. view switch).
  const prevColumnsRef = useRef(columns);
  useEffect(() => {
    if (prevColumnsRef.current === columns) return;
    prevColumnsRef.current = columns;
    setVisibleColumns(columns.map((c) => c.id));
  }, [columns]);

  // ── data ──────────────────────────────────────────────────────────────────
  const onNextCursor = useCallback((idx: number, cursor: string) => {
    setCursors((prev) => {
      const next = [...prev];
      next[idx] = cursor;
      return next;
    });
  }, []);

  const { rows, total, updatedAt, isFetching, isLastPage } = useEntityGridData({
    sortField,
    sortDirection,
    pageIndex,
    pageSize,
    cursors,
    onNextCursor,
    searchExpression,
    entityExpression,
    timeRange,
    view,
  });

  // Chain-fetch forward when user jumps beyond loaded pages.
  useEffect(() => {
    if (targetPageIndex == null) return;
    if (pageIndex >= targetPageIndex || isLastPage) {
      setTargetPageIndex(null);
      return;
    }
    const nextPage = pageIndex + 1;
    if (cursors[nextPage] != null) onPageChange(nextPage);
  }, [cursors, pageIndex, targetPageIndex, isLastPage, onPageChange]);

  // ── column handlers ───────────────────────────────────────────────────────
  const onAddColumn = useCallback(
    (columnId: string) => setVisibleColumns((prev) => [...prev, columnId]),
    []
  );
  const onRemoveColumn = useCallback(
    (columnId: string) => setVisibleColumns((prev) => prev.filter((id) => id !== columnId)),
    []
  );
  const onResetColumns = useCallback(() => setVisibleColumns(columns.map((c) => c.id)), [columns]);

  // ── renderers ─────────────────────────────────────────────────────────────
  const renderCellValue = useCallback(
    (cellProps: { rowIndex: number; columnId: string }) => {
      const { rowIndex, columnId } = cellProps;
      const row = rows[rowIndex - pageIndex * pageSize];
      if (!row) return null;
      return renderEntityCell(
        columnId as GridColumnId,
        row[columnId],
        row,
        watchlistNames,
        euiTheme,
        cellHandlers,
        rowActions
      );
    },
    [rows, pageIndex, pageSize, watchlistNames, euiTheme, cellHandlers, rowActions]
  );

  const expanderColumn = useMemo(
    () => ({
      id: 'expander',
      width: 36,
      headerCellRender: () => null,
      rowCellRender: (rowCellProps: { rowIndex: number }) => {
        const { rowIndex } = rowCellProps;
        const row = rows[rowIndex - pageIndex * pageSize];
        if (!row) return null;
        const entityId = row['entity.id'] as string;
        const groupSize = (row['group_size'] as number) ?? 1;
        if (groupSize <= 1) return null;
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
      },
    }),
    [rows, pageIndex, pageSize, expandedIds, prefetchChildren, toggleExpandedId]
  );

  const renderCustomGridBody = useCallback(
    ({
      Cell,
      visibleColumns: visCols,
      visibleRowData,
      headerRow,
      footerRow,
    }: EuiDataGridCustomBodyProps) => (
      <>
        {headerRow}
        {(rows as Row[]).map((row, i) => {
          const absoluteIndex = visibleRowData.startRow + i;
          const entityId = row['entity.id'] as string;
          const isExpanded = expandedIds.has(entityId);
          const children = isExpanded ? childMap.get(entityId) ?? [] : [];
          return (
            <React.Fragment key={entityId ?? i}>
              <div
                role="row"
                className="euiDataGridRow"
                css={css`
                  inline-size: fit-content;
                  min-inline-size: 100%;
                  border-block-end: ${euiTheme.border.thin};
                `}
              >
                <div
                  css={css`
                    display: flex;
                  `}
                >
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
                  visCols={visCols}
                  columns={columns}
                  euiTheme={euiTheme}
                  watchlistNames={watchlistNames}
                  handlers={cellHandlers}
                  rowActions={rowActions}
                />
              ))}
            </React.Fragment>
          );
        })}
        {footerRow}
      </>
    ),
    [rows, expandedIds, childMap, columns, euiTheme, watchlistNames, cellHandlers, rowActions]
  );

  const sorting = useMemo(
    () => ({
      columns: [{ id: sortField, direction: sortDirection }],
      onSort: (cols: Array<{ id: string; direction: 'asc' | 'desc' }>) => {
        const col = cols.find((c) => c.id !== sortField) ?? cols[0];
        if (!col) return;
        onSortChange(col.id, col.direction);
        resetCursors();
      },
    }),
    [sortField, sortDirection, onSortChange, resetCursors]
  );

  const handleChangePage = useCallback(
    (nextPageIndex: number) => {
      if (cursors[nextPageIndex] !== undefined) {
        onPageChange(nextPageIndex);
      } else {
        setTargetPageIndex(nextPageIndex);
        onPageChange(cursors.length - 1);
      }
    },
    [cursors, onPageChange]
  );

  const handleChangeItemsPerPage = useCallback(
    (newSize: number) => {
      onPageSizeChange(newSize);
      resetCursors();
    },
    [onPageSizeChange, resetCursors]
  );

  const isChildrenFetching = useMemo(
    () => [...expandedIds].some((id) => isChildFetching(id)),
    [expandedIds, isChildFetching]
  );

  // Expanded child rows use static `initialWidth`s; keep parent columns fixed so they stay aligned.
  const gridColumns = useMemo(
    () => columns.map((col) => ({ ...col, isResizable: false })),
    [columns]
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
      <EuiDataGrid
        aria-label={GRID_ARIA_LABEL}
        leadingControlColumns={!isRawView ? [expanderColumn] : []}
        columns={gridColumns}
        columnVisibility={{ visibleColumns, setVisibleColumns }}
        rowCount={total}
        renderCellValue={renderCellValue}
        renderCustomGridBody={renderCustomGridBody}
        sorting={sorting}
        pagination={{
          pageIndex,
          pageSize,
          pageSizeOptions,
          onChangePage: handleChangePage,
          onChangeItemsPerPage: handleChangeItemsPerPage,
        }}
        toolbarVisibility={
          showToolbar
            ? {
                showColumnSelector: true,
                showSortSelector: false,
                showDisplaySelector: true,
                showKeyboardShortcuts: true,
                additionalControls: {
                  left: {
                    prepend: (
                      <AdditionalControls
                        total={total}
                        title={isRawView ? 'records' : 'entities'}
                        columns={visibleColumns}
                        onAddColumn={onAddColumn}
                        onRemoveColumn={onRemoveColumn}
                        onResetColumns={onResetColumns}
                        showFieldsButton={false}
                      />
                    ),
                    append:
                      updatedAt != null ? (
                        <div
                          css={css`
                            border-inline-start: ${euiTheme.border.thin};
                            padding-inline-start: ${euiTheme.size.s};
                          `}
                        >
                          <LastUpdated updatedAt={updatedAt} />
                        </div>
                      ) : null,
                  },
                  right: groupSelectorComponent,
                },
              }
            : false
        }
        gridStyle={{
          border: 'horizontal',
          header: 'underline',
          cellPadding: 'm',
          fontSize: 'm',
          stripes: false,
        }}
      />
    </div>
  );
};
