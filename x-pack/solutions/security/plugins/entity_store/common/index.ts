/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Public API for the entity_store plugin.
 * Exports only constants and types needed on every load (including browser).
 * Does NOT import domain/euid barrel so ESQL is excluded from browser bundle.
 * For full euid including ESQL helpers, use common/euid_helpers (server-only).
 */

import { z } from '@kbn/zod/v4';

import { getEuidFromObject, getEntityIdentifiersFromDocument } from './domain/euid/memory';
import { getEuidFromTimelineNonEcsData } from './domain/euid/non_ecs_timeline_data';
import { getEuidPainlessEvaluation, getEuidPainlessRuntimeMapping } from './domain/euid/painless';
import {
  getEuidDslFilterBasedOnDocument,
  getEuidDslDocumentsContainsIdFilter,
} from './domain/euid/dsl';
import { getEuidSourceFields } from './domain/euid/identity_fields';

export const PLUGIN_ID = 'entityStore';
export const PLUGIN_NAME = 'Entity Store';

export const FF_ENABLE_ENTITY_STORE_V2 = 'securitySolution:entityStoreEnableV2';

/**
 * Library API: euid helpers for use by other plugins (browser-safe: DSL + Painless only, no ESQL).
 * Import the `euid` object instead of using the plugin start contract.
 * For ESQL helpers (getEuidEsql*), use common/euid_helpers (server-only).
 *
 * @example
 * import { euid, type EntityType } from '@kbn/entity-store/common';
 * euid.getEuidFromObject('host', doc);
 * euid.getEntityIdentifiersFromDocument('host', doc);
 * euid.getEuidFromTimelineNonEcsData('host', timelineRowData);
 * euid.getEuidDslFilterBasedOnDocument('host', identifiers);
 */
export const euid = {
  getEuidFromObject,
  getEntityIdentifiersFromDocument,
  getEuidFromTimelineNonEcsData,
  getEuidPainlessEvaluation,
  getEuidPainlessRuntimeMapping,
  getEuidDslFilterBasedOnDocument,
  getEuidDslDocumentsContainsIdFilter,
  getEuidSourceFields,
};

export type EntityStoreStatus = z.infer<typeof EntityStoreStatus>;
export const EntityStoreStatus = z.enum([
  'not_installed',
  'installing',
  'running',
  'stopped',
  'error',
]);

const ENTITY_STORE_BASE_ROUTE = '/internal/security/entity_store';

export const ENTITY_STORE_ROUTES = {
  INSTALL: `${ENTITY_STORE_BASE_ROUTE}/install`,
  UPDATE: ENTITY_STORE_BASE_ROUTE,
  UNINSTALL: `${ENTITY_STORE_BASE_ROUTE}/uninstall`,
  STATUS: `${ENTITY_STORE_BASE_ROUTE}/status`,
  START: `${ENTITY_STORE_BASE_ROUTE}/start`,
  STOP: `${ENTITY_STORE_BASE_ROUTE}/stop`,
  CHECK_PRIVILEGES: `${ENTITY_STORE_BASE_ROUTE}/check_privileges`,
  FORCE_LOG_EXTRACTION: `${ENTITY_STORE_BASE_ROUTE}/{entityType}/force_log_extraction`,
  FORCE_HISTORY_SNAPSHOT: `${ENTITY_STORE_BASE_ROUTE}/force_history_snapshot`,
  CRUD_UPSERT: `${ENTITY_STORE_BASE_ROUTE}/entities/{entityType}`,
  CRUD_UPSERT_BULK: `${ENTITY_STORE_BASE_ROUTE}/entities/bulk`,
  CRUD_DELETE: `${ENTITY_STORE_BASE_ROUTE}/entities/`,
  RESOLUTION_LINK: `${ENTITY_STORE_BASE_ROUTE}/resolution/link`,
  RESOLUTION_UNLINK: `${ENTITY_STORE_BASE_ROUTE}/resolution/unlink`,
  RESOLUTION_GROUP: `${ENTITY_STORE_BASE_ROUTE}/resolution/group`,
  ENTITY_MAINTAINERS_START: `${ENTITY_STORE_BASE_ROUTE}/entity_maintainers/start/{id}`,
  ENTITY_MAINTAINERS_STOP: `${ENTITY_STORE_BASE_ROUTE}/entity_maintainers/stop/{id}`,
  ENTITY_MAINTAINERS_RUN: `${ENTITY_STORE_BASE_ROUTE}/entity_maintainers/run/{id}`,
  ENTITY_MAINTAINERS_GET: `${ENTITY_STORE_BASE_ROUTE}/entity_maintainers`,
  ENTITY_MAINTAINERS_INIT: `${ENTITY_STORE_BASE_ROUTE}/entity_maintainers/init`,
  /** V2 unified index search (replaces entity_analytics list for flyout / EUID flows when v2 is on). */
  SEARCH_ENTITIES: `${ENTITY_STORE_BASE_ROUTE}/entities/search`,
} as const satisfies Record<string, string>;

export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return String(error);
};

// Entity types (slim definitions; for EUID translation use common/euid_helpers)
export type EntityType = z.infer<typeof EntityType>;
export const EntityType = z.enum(['user', 'host', 'service', 'generic']);

export const ALL_ENTITY_TYPES = Object.values(EntityType.enum);

export type { IdentitySourceFields } from './domain/euid/identity_fields';
export type { NonEcsTimelineDataRow } from './domain/euid/non_ecs_timeline_data';
export type { Entity } from './domain/definitions/entity.gen';
