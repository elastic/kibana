/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core/public';
import type { Entity, EntityType } from '../common';
import { API_VERSIONS, ENTITY_STORE_ROUTES } from '../common';
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
 * List/search Entity Store v2 unified latest index via the internal list-entities route
 * (`ENTITY_STORE_ROUTES.public.CRUD_GET`, page mode). Requires Entity Store v2 feature flag.
 */
export async function searchEntitiesFromEntityStore(
  http: HttpStart,
  params: SearchEntitiesFromEntityStoreParams,
  options?: { signal?: AbortSignal }
): Promise<SearchEntitiesFromEntityStoreResponse> {
  return http.fetch<SearchEntitiesFromEntityStoreResponse>(ENTITY_STORE_ROUTES.public.CRUD_GET, {
    version: API_VERSIONS.public.v1,
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
