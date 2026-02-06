/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
  getEuidDslFilterBasedOnDocument: euidModule.getEuidDslFilterBasedOnDocument,
  getEuidEsqlDocumentsContainsIdFilter: euidModule.getEuidEsqlDocumentsContainsIdFilter,
  getEuidEsqlEvaluation: euidModule.getEuidEsqlEvaluation,
  getEuidEsqlFilterBasedOnDocument: euidModule.getEuidEsqlFilterBasedOnDocument,
};

export type { EntityType } from './domain/definitions/entity_schema';
