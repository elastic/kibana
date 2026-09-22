/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { css } from '@emotion/react';
import { EuiDataGrid, EuiProgress, useEuiTheme } from '@elastic/eui';
import { useEntityGridData } from './use_entity_grid_data';
import { renderEntityCell } from './entity_cell_renderer';
import { CHILD_GRID_COLUMNS } from './constants';
import type { TimeRange } from './constants';

interface ChildEntityGridProps {
  filter: object | undefined;
  timeRange: TimeRange;
  watchlistNames: Map<string, string>;
}

export const ChildEntityGrid: React.FC<ChildEntityGridProps> = ({
  filter,
  timeRange,
  watchlistNames,
}) => {
  const { euiTheme } = useEuiTheme();
  const [sortField, setSortField] = useState('entity.risk.calculated_score_norm');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [cursors, setCursors] = useState<Array<string | null>>([null]);

  const onNextCursor = useCallback((idx: number, cursor: string) => {
    setCursors((prev) => {
      const next = [...prev];
      next[idx] = cursor;
      return next;
    });
  }, []);

  const { rows, total, isFetching } = useEntityGridData({
    sortField,
    sortDirection,
    pageIndex,
    pageSize,
    cursors,
    onNextCursor,
    filter,
    timeRange,
    view: 'raw',
  });

  const [visibleColumns, setVisibleColumns] = useState(CHILD_GRID_COLUMNS.map((c) => c.id));

  const renderCellValue = useCallback(
    (props: { rowIndex: number; columnId: string }) => {
      const { rowIndex, columnId } = props;
      const relativeIndex = rowIndex - pageIndex * pageSize;
      const row = rows[relativeIndex] ?? {};
      return renderEntityCell(columnId, row[columnId], row, watchlistNames, euiTheme);
    },
    [rows, pageIndex, pageSize, watchlistNames, euiTheme]
  );

  return (
    <div
      css={css`
        padding: 8px 16px 16px;
        position: relative;
      `}
    >
      {isFetching && <EuiProgress size="xs" color="accent" position="absolute" />}
      <EuiDataGrid
        aria-label="Entity group members"
        columns={CHILD_GRID_COLUMNS}
        columnVisibility={{ visibleColumns, setVisibleColumns }}
        rowCount={total}
        renderCellValue={renderCellValue}
        sorting={{
          columns: [{ id: sortField, direction: sortDirection }],
          onSort: (cols) => {
            const col = cols.find((c) => c.id !== sortField) ?? cols[0];
            if (!col) return;
            setSortField(col.id);
            setSortDirection(col.direction);
            setPageIndex(0);
            setCursors([null]);
          },
        }}
        pagination={{
          pageIndex,
          pageSize,
          pageSizeOptions: [5, 10, 25],
          onChangePage: (newPage) => {
            if (cursors[newPage] !== undefined) {
              setPageIndex(newPage);
            } else {
              setPageIndex(cursors.length - 1);
            }
          },
          onChangeItemsPerPage: (newSize) => {
            setPageSize(newSize);
            setPageIndex(0);
            setCursors([null]);
          },
        }}
        gridStyle={{
          border: 'horizontal',
          header: 'underline',
          cellPadding: 'm',
          fontSize: 'm',
          stripes: false,
        }}
        toolbarVisibility={{
          showColumnSelector: false,
          showSortSelector: false,
          showDisplaySelector: false,
          showKeyboardShortcuts: false,
        }}
      />
    </div>
  );
};
