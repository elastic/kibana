/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const TABLE_PER_PAGE_POPOVER_BTN = '[data-test-subj="tablePaginationPopoverButton"]';

export const rowsPerPageSelector = (count: number) =>
  `[data-test-subj="tablePagination-${count}-rows"]`;

// 1-based page number
export const tablePageSelector = (pageNumber: number) =>
  `[data-test-subj="pagination-button-${pageNumber - 1}"]`;

export const TABLE_FIRST_PAGE = tablePageSelector(1);

export const TABLE_SECOND_PAGE = tablePageSelector(2);

export const TABLE_SORT_COLUMN_BTN = '[data-test-subj="tableHeaderSortButton"]';

export const TABLE_SEARCH_BAR = '[data-test-subj="search-bar"]';
