/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core/public';
import { ENTITY_STORE_ROUTES, type EntityType } from '../common/constants';
import { ENTITY_STORE_INTERNAL_HTTP_API_VERSION } from './search_entities_api';

export interface UpsertEntityInEntityStoreParams {
  entityType: EntityType;
  /**
   * Full entity document (e.g. from search). Validated by the entity_store route with the v2 schema.
   * Typed loosely so callers can pass Security Solution API entities without duplicate-type friction.
   */
  body: Record<string, unknown>;
  /** When true, bypasses merge rules for user-provided fields (e.g. asset criticality). */
  force?: boolean;
}

/**
 * Create or update an entity via the Entity Store plugin internal CRUD route (API v2).
 * Use this for Entity Store v2 flows (same version as {@link searchEntitiesFromEntityStore}).
 */
export async function upsertEntityInEntityStore(
  http: HttpStart,
  params: UpsertEntityInEntityStoreParams,
  options?: { signal?: AbortSignal }
): Promise<void> {
  const path = ENTITY_STORE_ROUTES.CRUD_UPSERT.replace('{entityType}', params.entityType);
  await http.fetch<{ ok: boolean }>(path, {
    version: ENTITY_STORE_INTERNAL_HTTP_API_VERSION,
    method: 'PUT',
    body: JSON.stringify(params.body),
    query: params.force !== undefined ? { force: params.force ? 'true' : 'false' } : undefined,
    signal: options?.signal,
  });
}
