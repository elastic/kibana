/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { ESSearchRequest } from '@kbn/es-types';
import type { IUiSettingsClient as IUiSettingsClientBrowser } from '@kbn/core/public';
import type { IUiSettingsClient as IUiSettingsClientServer } from '@kbn/core/server';
import type { IKibanaSearchRequest } from '@kbn/search-types';
import { excludeTiersQuery } from '@kbn/observability-utils-common/es/queries/exclude_tiers_query';
import type { DataTier } from './ilm_types';

// UI settings key - re-exported from observability plugin
export const SEARCH_EXCLUDED_DATA_TIERS_SETTING = 'observability:searchExcludedDataTiers';

type IUiSettingsClient = IUiSettingsClientBrowser | IUiSettingsClientServer;

/**
 * Retrieves the excluded data tiers from UI settings.
 * Returns an empty array if uiSettings is not available or if there's an error.
 */
export async function getExcludedDataTiers(uiSettings?: IUiSettingsClient): Promise<DataTier[]> {
  if (!uiSettings) {
    return [];
  }
  try {
    return await uiSettings.get<DataTier[]>(SEARCH_EXCLUDED_DATA_TIERS_SETTING);
  } catch {
    return [];
  }
}

/**
 * Creates a must_not filter for excluding specific data tiers.
 * Returns undefined if no tiers should be excluded.
 */
export function getDataTierFilterCombined(
  excludedDataTiers: DataTier[]
): QueryDslQueryContainer[] | undefined {
  if (excludedDataTiers.length === 0) {
    return undefined;
  }
  return excludeTiersQuery(excludedDataTiers);
}

/**
 * Applies data tier filter to a query by adding a must_not clause.
 * If excludedDataTiers is empty, returns the original query unchanged.
 */
export function applyDataTierFilterToQuery(
  query: QueryDslQueryContainer,
  excludedDataTiers: DataTier[]
): QueryDslQueryContainer {
  if (excludedDataTiers.length === 0) {
    return query;
  }

  const excludedQuery = excludeTiersQuery(excludedDataTiers)[0].bool!.must_not!;

  return {
    bool: {
      must: [query],
      must_not: excludedQuery,
    },
  };
}

/**
 * Merges an excluded data tiers filter into an existing must_not array.
 * Returns a new array with the combined filters.
 */
export function mergeDataTierFilter(
  existingMustNot: QueryDslQueryContainer | QueryDslQueryContainer[] | undefined,
  excludedDataTiers: DataTier[]
): QueryDslQueryContainer[] {
  if (excludedDataTiers.length === 0) {
    const existing = existingMustNot ?? [];
    return Array.isArray(existing) ? existing : [existing];
  }

  const excludedQuery = excludeTiersQuery(excludedDataTiers)[0].bool!.must_not!;
  const existing = existingMustNot ?? [];
  return ([] as QueryDslQueryContainer[]).concat(existing, excludedQuery);
}

/**
 * Applies data tier filter to an Elasticsearch search request.
 * Merges the filter into the existing body.query.bool.must_not field.
 * If excludedDataTiers is empty, returns the original request unchanged.
 */
export function applyDataTierFilterToSearchRequest<T extends ESSearchRequest>(
  searchRequest: T,
  excludedDataTiers: DataTier[]
): T {
  if (excludedDataTiers.length === 0) {
    return searchRequest;
  }

  // If body is a string (NDJSON), we can't modify it - return unchanged
  if (typeof searchRequest.body === 'string') {
    return searchRequest;
  }

  const body = searchRequest.body as Record<string, any> | undefined;
  const existingQuery = body?.query as QueryDslQueryContainer | undefined;
  const mustNot = mergeDataTierFilter(existingQuery?.bool?.must_not, excludedDataTiers);

  return {
    ...searchRequest,
    body: {
      ...body,
      query: {
        ...existingQuery,
        bool: {
          ...existingQuery?.bool,
          must_not: mustNot,
        },
      },
    },
  } as T;
}

/**
 * Applies data tier filter to a Kibana search request (IKibanaSearchRequest).
 * This is for client-side searches using the data plugin's search API,
 * where the query is at params.query instead of body.query.
 */
export function applyDataTierFilterToKibanaSearchRequest<
  T extends IKibanaSearchRequest & { params: { index?: string } }
>(searchRequest: T, excludedDataTiers: DataTier[]): T {
  if (excludedDataTiers.length === 0) {
    return searchRequest;
  }

  const params = searchRequest.params as Record<string, any> | undefined;
  const existingQuery = params?.query as QueryDslQueryContainer | undefined;
  const mustNot = mergeDataTierFilter(existingQuery?.bool?.must_not, excludedDataTiers);

  return {
    ...searchRequest,
    params: {
      ...params,
      query: {
        ...existingQuery,
        bool: {
          ...existingQuery?.bool,
          must_not: mustNot,
        },
      },
    },
  } as T;
}
