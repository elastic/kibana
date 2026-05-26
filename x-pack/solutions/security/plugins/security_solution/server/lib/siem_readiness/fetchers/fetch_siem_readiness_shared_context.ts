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
import { fetchRulesReverseMap, buildPackageToPlatform } from './fetch_rules_reverse_map';

export interface SiemReadinessSharedContext {
  reverseMapResult: ReverseMapResult;
  categoriesResult: CategoriesResponse;
  packageToPlatform: Map<string, string>;
}

export interface FetchSiemReadinessSharedContextDeps {
  rulesClient: RulesClient;
  esClient: ElasticsearchClient;
  dataViewsService: DataViewsService;
  /** Optional Fleet plugin start — used for dynamic package→platform mapping */
  fleet?: {
    packageService: {
      asInternalUser: {
        getPackages: () => Promise<Array<{ name: string; title: string }>>;
      };
    };
  };
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
  const promise = fetch();
  requestCache.set(request, promise);
  return promise;
};

/**
 * Fetches all context shared across SIEM readiness dimensions:
 * - Fleet package→platform map (graceful fallback to rule tags if Fleet is unavailable)
 * - SIEM categories (single ES aggregation over event.category)
 * - Rules reverse map (index/pipeline/category → enabled rules)
 *
 * Categories are fetched first and passed into fetchRulesReverseMap to eliminate the
 * duplicate fetchCategories call that previously occurred inside that function.
 */
export const fetchSiemReadinessSharedContext = async ({
  rulesClient,
  esClient,
  dataViewsService,
  fleet,
  logger,
}: FetchSiemReadinessSharedContextDeps): Promise<SiemReadinessSharedContext> => {
  let packageToPlatform = new Map<string, string>();
  try {
    if (fleet) {
      const pkgs = await fleet.packageService.asInternalUser.getPackages();
      packageToPlatform = buildPackageToPlatform(pkgs);
    }
  } catch {
    logger.warn('Failed to fetch Fleet packages, platform mapping will use tag fallback');
  }

  // Fetch categories first so they can be passed into fetchRulesReverseMap,
  // avoiding a second fetchCategories call inside that function.
  const categoriesResult = await fetchCategories({ esClient, logger });
  const reverseMapResult = await fetchRulesReverseMap({
    rulesClient,
    esClient,
    dataViewsService,
    logger,
    packageToPlatform,
    categoriesData: categoriesResult,
  });

  return { reverseMapResult, categoriesResult, packageToPlatform };
};
