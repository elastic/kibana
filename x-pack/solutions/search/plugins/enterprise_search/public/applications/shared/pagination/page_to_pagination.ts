/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Page } from '../../../../common/types/pagination';

export function pageToPagination(page: Page) {
  // Prevent divide-by-zero-error
  const pageIndex = page.size ? Math.trunc(page.from / page.size) : 0;
  return {
    pageIndex,
    pageSize: page.size,
    totalItemCount: page.total,
  };
}
