/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CategoriesResponse, PipelineStats } from './types';
import { getIndexCategoryMap } from './get_index_category_map';

/**
 * Returns the subset of pipelines that serve at least one categorized SIEM index.
 *
 * Uses exact-match against the categories backing index list: a pipeline is included
 * if any of its `indices` entries appears as a key in the index→category map built
 * from `categoriesData`.
 *
 * This is the canonical filtering predicate shared by:
 *   - the server-side agent tool (getContinuityTool) — to decide which pipelines to surface
 *   - the UI continuity tab — as the first step before grouping by activeCategories
 *
 * Keeping the predicate here ensures both consumers always agree on which pipelines
 * are "in scope" for SIEM readiness, even as the category mapping evolves.
 */
export const filterPipelinesByCategories = (
  pipelines: PipelineStats[],
  categoriesData: CategoriesResponse | undefined
): PipelineStats[] => {
  if (!categoriesData?.mainCategoriesMap?.length) return [];
  const indexToCategoryMap = getIndexCategoryMap(categoriesData);
  return pipelines.filter((p) => p.indices.some((idx) => indexToCategoryMap.has(idx)));
};
