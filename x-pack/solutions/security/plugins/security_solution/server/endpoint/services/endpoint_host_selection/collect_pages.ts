/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface CandidatePage<T> {
  items: T[];
  total?: number;
  /**
   * Raw backend page length before space-based visibility filtering.
   *
   * Page termination must be judged on this, never on `items.length`: a page
   * that is full on the backend but has some agents hidden from the caller's
   * space filters down to fewer visible items, and treating that as "the last
   * page" stops the walk early — reporting a matching endpoint on a later page
   * as not-found.
   */
  rawItemCount?: number;
}

/**
 * Walks pages until the backend reports it has handed over everything it
 * matched, and reports whether the walk had to stop early. `total` is optional
 * because a backend that does not report it gives no evidence of more results;
 * an unknown total is treated as "nothing further", matching the pre-paging
 * behavior.
 *
 * The walk tracks the RAW record count, not the accumulated (possibly
 * filtered) `items`: `total` counts pre-filter records, so comparing the
 * filtered length against it would keep the loop running to
 * `maxPages` whenever any record was hidden, and `truncated` would
 * then be reported for a hostname that had in fact been fully examined.
 */
export async function collectPages<T>(
  fetchPage: (page: number) => Promise<CandidatePage<T>>,
  { pageSize, maxPages }: { pageSize: number; maxPages: number }
): Promise<{ items: T[]; truncated: boolean; total?: number }> {
  const items: T[] = [];
  let total: number | undefined;
  let rawCount = 0;

  for (let page = 1; page <= maxPages; page++) {
    const { items: pageItems, total: pageTotal, rawItemCount } = await fetchPage(page);
    items.push(...pageItems);
    total = pageTotal;

    const pageLength = rawItemCount ?? pageItems.length;
    rawCount += pageLength;

    if (pageLength < pageSize) {
      break;
    }

    if (pageTotal === undefined || rawCount >= pageTotal) {
      break;
    }
  }

  return { items, truncated: total !== undefined && rawCount < total, total };
}
