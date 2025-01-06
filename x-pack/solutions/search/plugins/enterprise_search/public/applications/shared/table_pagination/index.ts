/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Meta } from '../../../../common/types';

/**
 * Note: App Search's API pages start at 1 & EuiBasicTables' pages start at 0
 * These helpers both automatically handle off-by-1 conversion in addition to
 * automatically converting our snake_cased API meta to camelCased EUI props
 */

export const convertMetaToPagination = (meta: Meta) => ({
  pageIndex: meta.page.current - 1,
  pageSize: meta.page.size,
  totalItemCount: meta.page.total_results,
});

interface EuiBasicTableOnChange {
  page: { index: number };
}
export const handlePageChange =
  (paginationCallback: Function) =>
  ({ page: { index } }: EuiBasicTableOnChange) => {
    paginationCallback(index + 1);
  };

/**
 * Helper for updating Kea `meta` state without mutating nested objs
 */

export const updateMetaPageIndex = (oldState: Meta, newPageIndex: number) => {
  const newMetaState = { ...oldState, page: { ...oldState.page } };
  newMetaState.page.current = newPageIndex;
  return newMetaState;
};
