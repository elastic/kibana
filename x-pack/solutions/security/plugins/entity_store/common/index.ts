/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Public API for the entity_store plugin.
 * Exports only constants and types needed on every load (including browser).
 * For EUID translation helpers (DSL/ESQL/Painless, entity types), use common/euid_helpers.
 */

import { z } from '@kbn/zod/v4';

export const PLUGIN_ID = 'entityStore';
export const PLUGIN_NAME = 'Entity Store';

export const FF_ENABLE_ENTITY_STORE_V2 = 'securitySolution:entityStoreEnableV2';

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
  CRUD_CREATE: `${ENTITY_STORE_BASE_ROUTE}/entities/{entityType}`,
  CRUD_UPDATE: `${ENTITY_STORE_BASE_ROUTE}/entities/{entityType}`,
  CRUD_BULK_UPDATE: `${ENTITY_STORE_BASE_ROUTE}/entities/bulk`,
  CRUD_DELETE: `${ENTITY_STORE_BASE_ROUTE}/entities/`,
  RESOLUTION_LINK: `${ENTITY_STORE_BASE_ROUTE}/resolution/link`,
  RESOLUTION_UNLINK: `${ENTITY_STORE_BASE_ROUTE}/resolution/unlink`,
  RESOLUTION_GROUP: `${ENTITY_STORE_BASE_ROUTE}/resolution/group`,
  ENTITY_MAINTAINERS_START: `${ENTITY_STORE_BASE_ROUTE}/entity_maintainers/start/{id}`,
  ENTITY_MAINTAINERS_STOP: `${ENTITY_STORE_BASE_ROUTE}/entity_maintainers/stop/{id}`,
  ENTITY_MAINTAINERS_RUN: `${ENTITY_STORE_BASE_ROUTE}/entity_maintainers/run/{id}`,
  ENTITY_MAINTAINERS_GET: `${ENTITY_STORE_BASE_ROUTE}/entity_maintainers`,
  ENTITY_MAINTAINERS_INIT: `${ENTITY_STORE_BASE_ROUTE}/entity_maintainers/init`,
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

export interface IdentitySourceFields {
  /** Fields that participate in identity (EUID composition). */
  requiresOneOf: string[];
  /** All field names used in EUID composition, deduplicated. */
  identitySourceFields: string[];
}

export type { Entity } from './domain/definitions/entity.gen';

export {
  ENTITY_LATEST,
  ENTITY_UPDATES,
  ENTITY_HISTORY,
  ENTITY_BASE_PREFIX,
  ENTITY_SCHEMA_VERSION_V2,
  getEntityIndexPattern,
  getEntitiesAliasPattern,
  getLatestEntitiesIndexName,
} from './domain/entity_index';
