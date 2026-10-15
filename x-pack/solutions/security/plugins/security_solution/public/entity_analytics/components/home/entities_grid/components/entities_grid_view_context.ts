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
import type { EntityGridCellContext } from './entities_cell_renderer';

/**
 * The React context of the custom body and the expander: the cell context plus the expanded
 * groups (expand state lives here, not in the cell context), the columns, the load-more state
 * and the callbacks. `timeRange` and `keepFields` are those of the expanded groups' records,
 * `cellPadding` is the display selector's density, which child rows match, and `total` is the
 * number of entities in view.
 */
export interface EntityGridView extends EntityGridCellContext {
  expandedIds: ReadonlySet<string>;
  timeRange: TimeRange;
  keepFields: readonly string[];
  columns: EuiDataGridColumn[];
  prefetchChildren: (entityId: string) => void;
  toggleExpandedId: (entityId: string) => void;
  rowActions?: RowActions;
  isFetching: boolean;
  cellPadding: EuiDataGridStyleCellPaddings;
  total: number;
  canLoadMore: boolean;
  isAtLoadLimit: boolean;
  isLoadingMore: boolean;
  loadMore: () => void;
}

export const EntityGridBodyContext = createContext<EntityGridView | null>(null);

export const useEntityGridView = (): EntityGridView => {
  const value = useContext(EntityGridBodyContext);
  if (!value) {
    throw new Error('EntityGridBodyContext is missing');
  }
  return value;
};
