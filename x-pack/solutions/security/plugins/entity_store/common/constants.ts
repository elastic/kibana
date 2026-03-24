/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Constants and types for the entity_store plugin with zero dependency on domain/euid or zod.
 * Use this from the plugin's public entry so the page-load bundle stays under limit.
 */

export const PLUGIN_ID = 'entityStore';
export const PLUGIN_NAME = 'Entity Store';

export const FF_ENABLE_ENTITY_STORE_V2 = 'securitySolution:entityStoreEnableV2';

/** Runtime values mirror the former z.enum shape (`EntityStoreStatus.enum.running`). */
export const EntityStoreStatus = {
  enum: {
    not_installed: 'not_installed',
    installing: 'installing',
    running: 'running',
    stopped: 'stopped',
    error: 'error',
  },
} as const;

export type EntityStoreStatus =
  (typeof EntityStoreStatus.enum)[keyof typeof EntityStoreStatus.enum];

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
  CRUD_GET: `${ENTITY_STORE_BASE_ROUTE}/entities`,
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

/** Runtime values mirror the former z.enum shape (`EntityType.enum.host`). */
export const EntityType = {
  enum: {
    user: 'user',
    host: 'host',
    service: 'service',
    generic: 'generic',
  },
} as const;

export type EntityType = (typeof EntityType.enum)[keyof typeof EntityType.enum];

export const ALL_ENTITY_TYPES = Object.values(EntityType.enum);
export interface IdentitySourceFields {
  /** Fields that participate in identity (EUID composition). */
  requiresOneOf: string[];
  /** All field names used in EUID composition, deduplicated. */
  identitySourceFields: string[];
}

export type { Entity } from './domain/definitions/entity.gen';
