/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CategoriesResponse, RetentionInfo } from './types';

/**
 * Returns the subset of retention items that belong to at least one categorized SIEM index.
 *
 * Uses contains-match rather than exact-match because retention items carry data stream
 * names (e.g. `logs-cloud.stream-default`) while the categories API returns backing index
 * names (e.g. `.ds-logs-cloud.stream-default-2024.01.01-000001`). A data stream name is
 * always a substring of its backing index names, so `backingIndex.includes(dataStream)`
 * reliably identifies membership.
 *
 * This is the canonical filtering predicate shared by:
 *   - the server-side agent tool (getRetentionTool) — to decide which items to surface
 *   - the UI retention tab — as the first step before grouping by activeCategories
 *
 * Keeping the predicate here ensures both consumers always agree on which data streams
 * are "in scope" for SIEM readiness, even as the category mapping evolves.
 */
export const filterRetentionItemsByCategories = (
  items: RetentionInfo[],
  categoriesData: CategoriesResponse | undefined
): RetentionInfo[] => {
  const { mainCategoriesMap } = categoriesData ?? {};
  if (!mainCategoriesMap?.length) return [];
  return items.filter((item) =>
    mainCategoriesMap.some((group) =>
      group.indices.some((idx) => idx.indexName.includes(item.indexName))
    )
  );
};
