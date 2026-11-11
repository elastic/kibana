/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface CandidatePage<T> {
  items: T[];
  total?: number;
  fetchedCount: number;
}

export async function collectPages<T>(
  fetchPage: (page: number) => Promise<CandidatePage<T>>,
  { pageSize, maxPages }: { pageSize: number; maxPages: number }
): Promise<{ items: T[]; truncated: boolean; total?: number }> {
  const items: T[] = [];
  let total: number | undefined;
  let fetchedTotal = 0;

  for (let page = 1; page <= maxPages; page++) {
    const { items: pageItems, total: pageTotal, fetchedCount } = await fetchPage(page);
    items.push(...pageItems);
    total = pageTotal;

    fetchedTotal += fetchedCount;

    if (fetchedCount < pageSize) {
      break;
    }

    if (pageTotal === undefined || fetchedTotal >= pageTotal) {
      break;
    }
  }

  return { items, truncated: total !== undefined && fetchedTotal < total, total };
}
