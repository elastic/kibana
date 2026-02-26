/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import * as euidModule from './domain/euid';

export const PLUGIN_ID = 'entityStore';
export const PLUGIN_NAME = 'Entity Store';

export const FF_ENABLE_ENTITY_STORE_V2 = 'securitySolution:entityStoreEnableV2';

/**
 * Library API: euid helpers for use by other plugins.
 * Import the `euid` object instead of using the plugin start contract.
 *
 * @example
 * import { euid, type EntityType } from '@kbn/entity-store-plugin';
 * euid.getEuidFromObject('host', doc);
 * euid.getEuidPainlessEvaluation('user');
 */
export const euid = {
  getEuidFromObject: euidModule.getEuidFromObject,
  getEuidPainlessEvaluation: euidModule.getEuidPainlessEvaluation,
  getEuidPainlessRuntimeMapping: euidModule.getEuidPainlessRuntimeMapping,
  getEuidDslFilterBasedOnDocument: euidModule.getEuidDslFilterBasedOnDocument,
  getEuidDslDocumentsContainsIdFilter: euidModule.getEuidDslDocumentsContainsIdFilter,
  getEuidEsqlDocumentsContainsIdFilter: euidModule.getEuidEsqlDocumentsContainsIdFilter,
  getEuidEsqlEvaluation: euidModule.getEuidEsqlEvaluation,
  getEuidEsqlFilterBasedOnDocument: euidModule.getEuidEsqlFilterBasedOnDocument,
  getEuidSourceFields: euidModule.getEuidSourceFields,
};

export type { EntityType } from './domain/definitions/entity_schema';
export type { Entity } from './domain/definitions/entity.gen';
export type { IdentitySourceFields } from './domain/euid';
export { ALL_ENTITY_TYPES } from './domain/definitions/entity_schema';

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
  UNINSTALL: `${ENTITY_STORE_BASE_ROUTE}/uninstall`,
  STATUS: `${ENTITY_STORE_BASE_ROUTE}/status`,
  START: `${ENTITY_STORE_BASE_ROUTE}/start`,
  STOP: `${ENTITY_STORE_BASE_ROUTE}/stop`,
  FORCE_LOG_EXTRACTION: `${ENTITY_STORE_BASE_ROUTE}/{entityType}/force_log_extraction`,
  CRUD_UPSERT: `${ENTITY_STORE_BASE_ROUTE}/entities/{entityType}`,
  CRUD_UPSERT_BULK: `${ENTITY_STORE_BASE_ROUTE}/entities/bulk`,
  CRUD_DELETE: `${ENTITY_STORE_BASE_ROUTE}/entities/`,
} as const satisfies Record<string, string>;
