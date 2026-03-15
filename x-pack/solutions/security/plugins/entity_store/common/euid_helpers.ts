/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * EUID translation layer: helpers that depend on entity definitions and streamlang.
 * Import from here when you need euid DSL/ESQL/Painless. For entity types use common (index).
 * Do not import this file from plugin public (browser) code — it pulls in @kbn/streamlang.
 *
 * @example
 * import { euid } from '@kbn/entity-store/common/euid_helpers';
 * euid.getEuidFromObject('host', doc);
 */

import * as euidModule from './domain/euid';

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
