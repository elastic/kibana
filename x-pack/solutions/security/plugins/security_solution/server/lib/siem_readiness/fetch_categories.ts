/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { CategoryGroup, SiemReadinessCategory } from '@kbn/siem-readiness-common';
import { ECS_CATEGORY_TO_MAIN } from '@kbn/siem-readiness-common';

export interface CategoryIndexBucket {
  key: string;
  doc_count: number;
  by_category?: { buckets: Array<{ key: string; doc_count: number }> };
}

export interface CategoriesData {
  /** Raw per-ECS-category groups, as returned by the HTTP route. */
  rawCategoriesMap: CategoryGroup[];
  /** Aggregated into the five main SIEM Readiness categories, as returned by the HTTP route. */
  mainCategoriesMap: CategoryGroup[];
  /**
   * Convenience map from index name → main SIEM Readiness category.
   * Useful for agent tools that need to join other data (pipelines, retention) to categories.
   */
  indexToCategoryMap: Map<string, SiemReadinessCategory>;
  /**
   * Raw aggregation buckets, preserved for consumers that need per-index ECS category detail
   * (e.g. the coverage tool's activeEcsCategories computation).
   */
  rawIndexBuckets: CategoryIndexBucket[];
}

/**
 * Fetches and classifies all indices by SIEM Readiness category using an
 * `event.category` aggregation. Shared between the HTTP route handler and
 * agent tool handlers so both always show the same data.
 */
export const fetchCategories = async (esClient: ElasticsearchClient): Promise<CategoriesData> => {
  const searchResult = await esClient.search({
    index: '*',
    size: 0,
    aggs: {
      by_index: {
        terms: { field: '_index', size: 1000 },
        aggs: { by_category: { terms: { field: 'event.category', size: 20 } } },
      },
    },
  });

  const rawIndexBuckets =
    (
      searchResult.aggregations as {
        by_index?: { buckets: CategoryIndexBucket[] };
      }
    )?.by_index?.buckets ?? [];

  // Build raw category map: ecsCategory → IndexInfo[]
  const rawCategoryMap: Record<string, Array<{ indexName: string; docs: number }>> = {};

  rawIndexBuckets.forEach(({ key: indexName, by_category }) => {
    by_category?.buckets.forEach(({ key: ecsCategory, doc_count: docs }) => {
      if (!rawCategoryMap[ecsCategory]) rawCategoryMap[ecsCategory] = [];
      rawCategoryMap[ecsCategory].push({ indexName, docs });
    });
  });

  const rawCategoriesMap: CategoryGroup[] = Object.entries(rawCategoryMap).map(
    ([category, indices]) => ({ category, indices })
  );

  // Aggregate into five main categories, summing doc counts for shared indices
  const mainCategoryDocMap: Record<string, Record<string, number>> = {};

  rawCategoriesMap.forEach(({ category: ecsCategory, indices }) => {
    const mainCat = ECS_CATEGORY_TO_MAIN[ecsCategory];
    if (!mainCat) return;
    if (!mainCategoryDocMap[mainCat]) mainCategoryDocMap[mainCat] = {};
    indices.forEach(({ indexName, docs }) => {
      mainCategoryDocMap[mainCat][indexName] = (mainCategoryDocMap[mainCat][indexName] ?? 0) + docs;
    });
  });

  const mainCategoriesMap: CategoryGroup[] = Object.entries(mainCategoryDocMap).map(
    ([category, indexMap]) => ({
      category,
      indices: Object.entries(indexMap).map(([indexName, docs]) => ({ indexName, docs })),
    })
  );

  // Build index → main category map for agent tool consumers
  const indexToCategoryMap = new Map<string, SiemReadinessCategory>();
  mainCategoriesMap.forEach(({ category, indices }) => {
    indices.forEach(({ indexName }) => {
      indexToCategoryMap.set(indexName, category as SiemReadinessCategory);
    });
  });

  return { rawCategoriesMap, mainCategoriesMap, indexToCategoryMap, rawIndexBuckets };
};
