/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, KibanaRequest } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { RulesClient } from '@kbn/alerting-plugin/server';
import type { DataViewsService } from '@kbn/data-views-plugin/common';
import type { CategoriesResponse, ReverseMapResult } from '@kbn/siem-readiness';

import { fetchCategories } from './fetch_categories';
import { fetchRulesReverseMap } from './fetch_rules_reverse_map';
import { fetchIndexPlatforms } from './fetch_index_platforms';

export interface SiemReadinessSharedContext {
  reverseMapResult: ReverseMapResult;
  categoriesResult: CategoriesResponse;
  /** Map of index/data stream name → platform label, derived from ECS fields in the actual data */
  indexToPlatform: Map<string, string>;
}

export interface FetchSiemReadinessSharedContextDeps {
  rulesClient: RulesClient;
  esClient: ElasticsearchClient;
  dataViewsService: DataViewsService;
  logger: Logger;
}

// Per-request WeakMap cache: automatically GC'd when the request object is finalized.
// This ensures that if multiple code paths within the same request ask for the shared context,
// only one actual fetch is performed.
const requestCache = new WeakMap<KibanaRequest, Promise<SiemReadinessSharedContext>>();

/**
 * Returns the per-request lazy shared context for SIEM readiness.
 * The first call for a given request performs the fetch; subsequent calls return the cached Promise.
 *
 * On failure the cache entry is evicted so a later tool call within the same request can retry
 * rather than inheriting a permanently poisoned, already-rejected promise.
 *
 * @param request - The Kibana request object (used as the cache key)
 * @param fetch   - Factory that performs the actual fetches when the cache is cold
 */
export const getSiemReadinessSharedContext = (
  request: KibanaRequest,
  fetch: () => Promise<SiemReadinessSharedContext>
): Promise<SiemReadinessSharedContext> => {
  const cached = requestCache.get(request);
  if (cached) {
    return cached;
  }
  const promise = fetch().catch((err) => {
    requestCache.delete(request);
    throw err;
  });
  requestCache.set(request, promise);
  return promise;
};

/**
 * Fetches all context shared across SIEM readiness dimensions:
 * - SIEM categories (single ES aggregation over event.category)
 * - Index platform map (ECS field aggregation — cloud.provider, host.os.family, etc.)
 * - Rules reverse map (index/pipeline/category → enabled rules)
 *
 * Categories are fetched first and passed into fetchRulesReverseMap to eliminate a
 * duplicate fetchCategories call inside that function.
 */
export const fetchSiemReadinessSharedContext = async ({
  rulesClient,
  esClient,
  dataViewsService,
  logger,
}: FetchSiemReadinessSharedContextDeps): Promise<SiemReadinessSharedContext> => {
  // Fetch categories and index platforms in parallel, then pass categories into
  // fetchRulesReverseMap to avoid a duplicate fetchCategories call inside that function.
  const [categoriesResult, indexToPlatform] = await Promise.all([
    fetchCategories({ esClient, logger }),
    fetchIndexPlatforms({ esClient, logger }),
  ]);

  const reverseMapResult = await fetchRulesReverseMap({
    rulesClient,
    esClient,
    dataViewsService,
    logger,
    categoriesData: categoriesResult,
  });

  return { reverseMapResult, categoriesResult, indexToPlatform };
};
