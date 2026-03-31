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

export const API_VERSIONS = {
  public: {
    v1: '2023-10-31',
  },
  internal: {
    v2: '2',
  },
} as const;

const PUBLIC_BASE_ROUTE = '/api/security/entity_store';
const INTERNAL_BASE_ROUTE = '/internal/security/entity_store';

export const ENTITY_STORE_ROUTES = {
  // Public routes
  INSTALL: `${PUBLIC_BASE_ROUTE}/install`,
  UPDATE: PUBLIC_BASE_ROUTE,
  UNINSTALL: `${PUBLIC_BASE_ROUTE}/uninstall`,
  STATUS: `${PUBLIC_BASE_ROUTE}/status`,
  START: `${PUBLIC_BASE_ROUTE}/start`,
  STOP: `${PUBLIC_BASE_ROUTE}/stop`,
  CHECK_PRIVILEGES: `${PUBLIC_BASE_ROUTE}/check_privileges`,
  CRUD_CREATE: `${PUBLIC_BASE_ROUTE}/entities/{entityType}`,
  CRUD_UPDATE: `${PUBLIC_BASE_ROUTE}/entities/{entityType}`,
  CRUD_BULK_UPDATE: `${PUBLIC_BASE_ROUTE}/entities/bulk`,
  CRUD_GET: `${PUBLIC_BASE_ROUTE}/entities`,
  CRUD_DELETE: `${PUBLIC_BASE_ROUTE}/entities/`,
  RESOLUTION_LINK: `${PUBLIC_BASE_ROUTE}/resolution/link`,
  RESOLUTION_UNLINK: `${PUBLIC_BASE_ROUTE}/resolution/unlink`,
  RESOLUTION_GROUP: `${PUBLIC_BASE_ROUTE}/resolution/group`,
  // Internal routes (debug/operational)
  FORCE_LOG_EXTRACTION: `${INTERNAL_BASE_ROUTE}/{entityType}/force_log_extraction`,
  FORCE_CCS_EXTRACT_TO_UPDATES: `${INTERNAL_BASE_ROUTE}/{entityType}/force_ccs_extract_to_updates`,
  FORCE_HISTORY_SNAPSHOT: `${INTERNAL_BASE_ROUTE}/force_history_snapshot`,
  ENTITY_MAINTAINERS_START: `${INTERNAL_BASE_ROUTE}/entity_maintainers/start/{id}`,
  ENTITY_MAINTAINERS_STOP: `${INTERNAL_BASE_ROUTE}/entity_maintainers/stop/{id}`,
  ENTITY_MAINTAINERS_RUN: `${INTERNAL_BASE_ROUTE}/entity_maintainers/run/{id}`,
  ENTITY_MAINTAINERS_GET: `${INTERNAL_BASE_ROUTE}/entity_maintainers`,
  ENTITY_MAINTAINERS_INIT: `${INTERNAL_BASE_ROUTE}/entity_maintainers/init`,
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
export interface IdentitySourceFields {
  /** Fields that participate in identity (EUID composition). */
  requiresOneOf: string[];
  /** All field names used in EUID composition, deduplicated. */
  identitySourceFields: string[];
}
