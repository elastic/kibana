/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Full entity_store common API including `euid` (DSL, Painless, etc.).
 * Use `./index` for lightweight exports; this module pulls in streamlang and euid domain code.
 */

export * from '.';

import { getEuidFromObject, getEntityIdentifiersFromDocument } from './domain/euid/memory';
import { getEuidFromTimelineNonEcsData } from './domain/euid/non_ecs_timeline_data';
import { getEuidPainlessEvaluation, getEuidPainlessRuntimeMapping } from './domain/euid/painless';
import {
  getEuidDslFilterBasedOnDocument,
  getEuidDslDocumentsContainsIdFilter,
} from './domain/euid/dsl';
import { getEuidSourceFields } from './domain/euid/identity_fields';

/**
 * Library API: euid helpers for use by other plugins (browser-safe: DSL + Painless only, no ESQL).
 * For ESQL helpers (getEuidEsql*), use common/euid_helpers (server-only).
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
