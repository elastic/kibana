/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ComponentProps, ComponentType } from 'react';
import {
  EuiButton,
  EuiEmptyPrompt,
  useEuiTheme,
  type EuiDataGridCellValueElementProps,
  type EuiDataGridCustomBodyProps,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { SerializedStyles } from '@emotion/react';
import { defaultRangeExtractor, useVirtualizer } from '@tanstack/react-virtual';
import type { Range } from '@tanstack/react-virtual';
import { i18n } from '@kbn/i18n';
import { getEntityId } from '../common';
import type { Row } from '../common';
import { useResetEntityGridFilters } from '../hooks/use_reset_entity_grid_filters';
import { RenderEntityGridCell } from './entities_cell_renderer';
import type { EntityGridCellContext } from './entities_cell_renderer';
import { ExpandedEntityGroup, ROW_HEIGHT_PX, getCellPaddingBlock } from './entities_expanded_row';
import { gridRowCellsCss, gridRowCss } from './entities_grid_styles';
import { useEntityGridView } from './entities_grid_view_context';

const EMPTY_GRID_MESSAGE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.home.grid.emptyMessage',
  { defaultMessage: 'No records match the current filters' }
);

const RESET_FILTERS_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.home.grid.resetFiltersButton',
  { defaultMessage: 'Reset' }
);

/** Height of a row before it renders; each row is measured once it does. */
const ESTIMATED_ROW_HEIGHT = 41;

/** Rows rendered above and below the visible ones, so fast scrolling doesn't show gaps. */
const OVERSCAN_ROWS = 5;

/**
 * Most rows kept rendered after they leave the view: rendering a row costs more than a frame
 * allows when many come into view at once, so scrolling back to rows already seen renders none.
 */
const MAX_KEPT_ROWS = 40;

/** Rows always rendered at the top, so going back to the top renders none. */
const TOP_ROWS = 15;

/** The grid scrolls its own rows: only the rows in view are rendered. */
const scrollContainerCss = css`
  max-block-size: 70vh;
  overflow: auto;
`;

/** A rendered row, placed by the virtualizer. */
const rowContainerCss = css`
  position: absolute;
  inset-block-start: 0;
  min-inline-size: 100%;
`;

const stickyHeaderCss = css`
  position: sticky;
  inset-block-start: 0;
  z-index: 1;
`;

type GroupProps = Omit<ComponentProps<typeof ExpandedEntityGroup>, 'entityId'>;

interface EntityGridRowProps {
  index: number;
  entityId: string | undefined;
  isExpanded: boolean;
  visCols: EuiDataGridCustomBodyProps['visibleColumns'];
  rowBorderCss: SerializedStyles;
  cellCss: SerializedStyles;
  groupProps: GroupProps;
}

const noCellProps = () => {};

type CellValueComponent = ComponentType<
  EuiDataGridCellValueElementProps & Partial<EntityGridCellContext>
>;

/** A column's width: a control column's own, or the column's initial width. */
const getColumnWidth = (col: EuiDataGridCustomBodyProps['visibleColumns'][number]): number =>
  'width' in col && typeof col.width === 'number'
    ? col.width
    : ('initialWidth' in col && col.initialWidth) || 150;

/**
 * A row and, when expanded, its group's records. Memoized: a scroll renders only the rows that
 * come into view, not every rendered row again. The cells render the grid's cell renderers
 * directly, without EUI's cell: its focus handling made each row too costly to render while
 * scrolling.
 */
const EntityGridRow = memo(
  ({
    index,
    entityId,
    isExpanded,
    visCols,
    rowBorderCss,
    cellCss,
    groupProps,
  }: EntityGridRowProps) => (
    <>
      <div role="row" className="euiDataGridRow" css={[gridRowCss, rowBorderCss]}>
        <div css={gridRowCellsCss}>
          {visCols.map((col, colIndex) => {
            const cellProps = {
              rowIndex: index,
              colIndex,
              columnId: col.id,
              isExpandable: false,
              isExpanded: false,
              isDetails: false,
              setCellProps: noCellProps,
            };
            // EUI types a cell renderer as returning any node; ours render elements or null.
            const CellValue = (
              'rowCellRender' in col ? col.rowCellRender : RenderEntityGridCell
            ) as CellValueComponent;
            return (
              <div
                key={col.id}
                role="gridcell"
                css={cellCss}
                // Runtime size: the column's width.
                style={{ width: getColumnWidth(col) }}
              >
                <CellValue
                  {...cellProps}
                  watchlistNames={groupProps.watchlistNames}
                  euiTheme={groupProps.euiTheme}
                  cellHandlers={groupProps.handlers}
                />
              </div>
            );
          })}
        </div>
      </div>
      {entityId && isExpanded && <ExpandedEntityGroup entityId={entityId} {...groupProps} />}
    </>
  )
);
EntityGridRow.displayName = 'EntityGridRow';

/**
 * The rows to render: those in view, the first TOP_ROWS, and up to MAX_KEPT_ROWS rows seen most
 * recently, by entity id, so a new sort or filter keeps none of the rows it no longer shows.
 */
const useKeptRowsRangeExtractor = (rows: readonly Row[]) => {
  const keptIds = useRef(new Set<string>());
  const indexById = useMemo(
    () => new Map(rows.map((row, index) => [getEntityId(row), index])),
    [rows]
  );
  return useCallback(
    (range: Range): number[] => {
      const inView = defaultRangeExtractor(range);
      const kept = keptIds.current;
      for (const index of inView) {
        const id = getEntityId(rows[index]);
        if (id != null) {
          // Most recently seen last, so the oldest go first.
          kept.delete(id);
          kept.add(id);
        }
      }
      for (const id of kept) {
        if (kept.size <= MAX_KEPT_ROWS) break;
        kept.delete(id);
      }
      const topIndexes = Array.from({ length: Math.min(TOP_ROWS, range.count) }, (_, i) => i);
      const keptIndexes = [...kept].flatMap((id) => indexById.get(id) ?? []);
      return [...new Set([...topIndexes, ...inView, ...keptIndexes])].sort((a, b) => a - b);
    },
    [rows, indexById]
  );
};

export const EntityGridCustomBody = memo(
  ({
    visibleColumns: visCols,
    headerRow,
    footerRow,
    setCustomGridBodyProps,
  }: EuiDataGridCustomBodyProps) => {
    const { euiTheme } = useEuiTheme();
    const {
      rows,
      expandedIds,
      timeRange,
      keepFields,
      columns,
      watchlistNames,
      cellHandlers,
      isFetching,
      cellPadding,
      onRowsInViewChange,
    } = useEntityGridView();
    const onResetFilters = useResetEntityGridFilters();
    // One style object for all rows, instead of serializing it again for each row.
    const rowBorderCss = useMemo(
      () => css`
        border-block-end: ${euiTheme.border.thin};
      `,
      [euiTheme.border.thin]
    );
    const cellCss = useMemo(
      () => css`
        flex-shrink: 0;
        display: flex;
        align-items: center;
        overflow: hidden;
        white-space: nowrap;
        block-size: ${ROW_HEIGHT_PX[cellPadding]}px;
        padding: ${getCellPaddingBlock(euiTheme, cellPadding)};
      `,
      [euiTheme, cellPadding]
    );
    const groupProps = useMemo(
      (): GroupProps => ({
        timeRange,
        keepFields,
        cellPadding,
        visCols,
        columns,
        euiTheme,
        watchlistNames,
        handlers: cellHandlers,
      }),
      [timeRange, keepFields, cellPadding, visCols, columns, euiTheme, watchlistNames, cellHandlers]
    );

    // The wrapping div of EUI scrolls: a state, not a ref, so the virtualizer sees it once set.
    const [scrollElement, setScrollElement] = useState<HTMLDivElement | null>(null);
    useEffect(() => {
      setCustomGridBodyProps({ ref: setScrollElement, css: scrollContainerCss });
    }, [setCustomGridBodyProps]);

    // The rows start below the header, inside the same scrolling element.
    const listRef = useRef<HTMLDivElement>(null);
    const [listOffset, setListOffset] = useState(0);
    useLayoutEffect(() => {
      setListOffset(listRef.current?.offsetTop ?? 0);
    }, [scrollElement]);

    const rangeExtractor = useKeptRowsRangeExtractor(rows);
    const virtualizer = useVirtualizer({
      count: rows.length,
      getScrollElement: () => scrollElement,
      estimateSize: () => ESTIMATED_ROW_HEIGHT,
      overscan: OVERSCAN_ROWS,
      scrollMargin: listOffset,
      getItemKey: (index) => getEntityId(rows[index]) ?? index,
      rangeExtractor,
    });
    const virtualRows = virtualizer.getVirtualItems();
    // Only the rows in view are enriched, not the kept ones.
    const firstRow = virtualizer.range?.startIndex;
    const lastRow = virtualizer.range?.endIndex;
    useEffect(() => {
      if (firstRow != null && lastRow != null) onRowsInViewChange(firstRow, lastRow);
    }, [firstRow, lastRow, onRowsInViewChange]);

    return (
      <>
        <div css={[stickyHeaderCss, { backgroundColor: euiTheme.colors.emptyShade }]}>
          {headerRow}
        </div>
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
          <div
            ref={listRef}
            // Runtime size: the height of every row.
            style={{ blockSize: virtualizer.getTotalSize(), position: 'relative' }}
          >
            {virtualRows.map(({ index, key, start }) => {
              const entityId = getEntityId(rows[index]);
              return (
                <div
                  key={key}
                  data-index={index}
                  ref={virtualizer.measureElement}
                  css={rowContainerCss}
                  // Runtime position: the kept rows aren't next to the rows in view.
                  style={{ transform: `translateY(${start - listOffset}px)` }}
                >
                  <EntityGridRow
                    index={index}
                    entityId={entityId}
                    isExpanded={entityId != null && expandedIds.has(entityId)}
                    visCols={visCols}
                    rowBorderCss={rowBorderCss}
                    cellCss={cellCss}
                    groupProps={groupProps}
                  />
                </div>
              );
            })}
          </div>
        )}
        {footerRow}
      </>
    );
  }
);
EntityGridCustomBody.displayName = 'EntityGridCustomBody';
