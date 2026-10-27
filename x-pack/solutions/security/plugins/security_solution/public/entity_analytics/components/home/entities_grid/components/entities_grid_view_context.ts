/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createContext, useContext } from 'react';
import type { EuiDataGridColumn, EuiDataGridStyleCellPaddings } from '@elastic/eui';
import type { TimeRange } from '../common';
import type { RowActions } from './cells/row_actions_cell';
import type {
  EntityGridCellContext,
  EntityGridRows,
  RowCellHandlers,
} from './entities_cell_renderer';

/** Expand state lives here, not in the cell context, which must stay stable. */
export interface EntityGridView extends EntityGridCellContext, EntityGridRows {
  expandedIds: ReadonlySet<string>;
  timeRange: TimeRange;
  keepFields: readonly string[];
  columns: EuiDataGridColumn[];
  prefetchChildren: (entityId: string) => void;
  toggleExpandedId: (entityId: string) => void;
  rowActions?: RowActions;
  /** The records an expanded group lists are individual rows, whatever the grid's rows mode. */
  recordCellHandlers?: RowCellHandlers;
  isFetching: boolean;
  cellPadding: EuiDataGridStyleCellPaddings;
  /** The body reports the rows it renders, so only those are enriched. */
  onRowsInViewChange: (firstRow: number, lastRow: number) => void;
}

export const EntityGridBodyContext = createContext<EntityGridView | null>(null);

export const useEntityGridView = (): EntityGridView => {
  const value = useContext(EntityGridBodyContext);
  if (!value) {
    throw new Error('EntityGridBodyContext is missing');
  }
  return value;
};
