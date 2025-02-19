/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndexSummaryTableItem } from '../../../../types';

export const getPageIndex = ({
  indexName,
  items,
  pageSize,
}: {
  indexName: string;
  items: IndexSummaryTableItem[];
  pageSize: number;
}): number | null => {
  const index = items.findIndex((x) => x.indexName === indexName);

  if (index !== -1 && pageSize !== 0) {
    return Math.floor(index / pageSize);
  } else {
    return null;
  }
};
