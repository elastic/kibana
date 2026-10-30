/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
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
import { useVirtualizer } from '@tanstack/react-virtual';
import { i18n } from '@kbn/i18n';
import { getEntityId } from '../common';
import { useResetEntityGridFilters } from '../hooks/use_reset_entity_grid_filters';
import { RenderEntityGridCell } from './entities_cell_renderer';
import type { EntityGridCellContext, RowCellHandlers } from './entities_cell_renderer';
import { ExpandedEntityGroup } from './entities_expanded_row';
import {
  ROW_HEIGHT_PX,
  getCellPaddingBlock,
  getColumnWidth,
  gridRowCellsCss,
  gridRowCss,
} from './entities_grid_styles';
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

// Grouped grids have no height to fill, so the cap keeps their rows virtualized.
const scrollContainerCss = css`
  block-size: 100%;
  max-block-size: var(--kbn-application--content-height);
  overflow: auto;
`;

// Placed with `top`, not a transform: sticky expanded rows read the untransformed position.
const rowContainerCss = css`
  position: absolute;
  min-inline-size: 100%;
`;

const stickyHeaderCss = css`
  position: sticky;
  inset-block-start: 0;
  z-index: 2;
`;

type GroupProps = Omit<ComponentProps<typeof ExpandedEntityGroup>, 'entityId'>;

interface EntityGridRowProps {
  index: number;
  entityId: string | undefined;
  isExpanded: boolean;
  visCols: EuiDataGridCustomBodyProps['visibleColumns'];
  rowBorderCss: SerializedStyles;
  expandedRowCss: SerializedStyles;
  cellCss: SerializedStyles;
  cellHandlers?: RowCellHandlers;
  groupProps: GroupProps;
}

const noCellProps = () => {};

type CellValueComponent = ComponentType<
  EuiDataGridCellValueElementProps & Partial<EntityGridCellContext>
>;

/** Memoized, with plain cells instead of EUI's: its focus handling made rows too costly to scroll. */
const EntityGridRow = memo(
  ({
    index,
    entityId,
    isExpanded,
    visCols,
    rowBorderCss,
    expandedRowCss,
    cellCss,
    cellHandlers,
    groupProps,
  }: EntityGridRowProps) => (
    <>
      <div
        role="row"
        className="euiDataGridRow"
        css={[gridRowCss, rowBorderCss, isExpanded && expandedRowCss]}
      >
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
                style={{ width: getColumnWidth(col) }}
              >
                <CellValue
                  {...cellProps}
                  watchlistNames={groupProps.watchlistNames}
                  euiTheme={groupProps.euiTheme}
                  cellHandlers={cellHandlers}
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
      recordCellHandlers,
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
        handlers: recordCellHandlers,
      }),
      [
        timeRange,
        keepFields,
        cellPadding,
        visCols,
        columns,
        euiTheme,
        watchlistNames,
        recordCellHandlers,
      ]
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

    // An expanded row stays under the header while its records scroll, until its group ends.
    const expandedRowCss = useMemo(
      () => css`
        position: sticky;
        inset-block-start: ${listOffset}px;
        z-index: 1;
        background-color: ${euiTheme.colors.emptyShade};
      `,
      [listOffset, euiTheme.colors.emptyShade]
    );

    const virtualizer = useVirtualizer({
      count: rows.length,
      getScrollElement: () => scrollElement,
      estimateSize: () => ESTIMATED_ROW_HEIGHT,
      overscan: OVERSCAN_ROWS,
      scrollMargin: listOffset,
      getItemKey: (index) => getEntityId(rows[index]) ?? index,
    });
    const virtualRows = virtualizer.getVirtualItems();
    // Only the rows in view are enriched, not the overscan ones.
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
                  style={{ insetBlockStart: start - listOffset }}
                >
                  <EntityGridRow
                    index={index}
                    entityId={entityId}
                    isExpanded={entityId != null && expandedIds.has(entityId)}
                    visCols={visCols}
                    rowBorderCss={rowBorderCss}
                    expandedRowCss={expandedRowCss}
                    cellCss={cellCss}
                    cellHandlers={cellHandlers}
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
