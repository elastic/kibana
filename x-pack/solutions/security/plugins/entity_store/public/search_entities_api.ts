/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core/public';
import { ENTITY_STORE_ROUTES, type Entity, type EntityType } from '../common/constants';

/** Version header for internal entity_store HTTP APIs (see server/routes/constants API_VERSIONS.internal.v2). */
export const ENTITY_STORE_INTERNAL_HTTP_API_VERSION = '2';

export interface SearchEntitiesFromEntityStoreParams {
  entityTypes: EntityType[];
  filterQuery?: string;
  page: number;
  perPage: number;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface SearchEntitiesFromEntityStoreResponse {
  records: Entity[];
  page: number;
  per_page: number;
  total: number;
  inspect?: { dsl: string[]; response: string[] };
}

/**
 * Search Entity Store v2 unified latest index via the entity_store plugin route.
 * Requires Entity Store v2 feature flag (same as other internal entity_store APIs).
 */
export async function searchEntitiesFromEntityStore(
  http: HttpStart,
  params: SearchEntitiesFromEntityStoreParams,
  options?: { signal?: AbortSignal }
): Promise<SearchEntitiesFromEntityStoreResponse> {
  return http.fetch<SearchEntitiesFromEntityStoreResponse>(ENTITY_STORE_ROUTES.SEARCH_ENTITIES, {
    version: ENTITY_STORE_INTERNAL_HTTP_API_VERSION,
    method: 'GET',
    query: {
      entity_types: params.entityTypes,
      sort_field: params.sortField,
      sort_order: params.sortOrder,
      page: params.page,
      per_page: params.perPage,
      filterQuery: params.filterQuery,
    },
    signal: options?.signal,
  });
}
