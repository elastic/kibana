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
 * euid.dsl.getEuidDocumentsContainsIdFilter('host');
 */

import * as euidModule from './domain/euid';

export const euid = {
  /**
   * Resolves the entity unique id (EUID) for one document using entity definitions (in-memory only).
   * Input: entity type (e.g. `user`) and a document body like ES `_source` (nested or flattened).
   * Output: EUID string such as `user:…` / `host:…`, or `undefined` when no id can be derived.
   */
  getEuidFromObject: euidModule.getEuidFromObject,

  /**
   * Painless-backed EUID helpers for runtime fields and scripts (same semantics as `getEuidFromObject`).
   */
  painless: {
    /**
     * Builds the Painless expression text that computes the same EUID as `getEuidFromObject` at search time.
     * Input: entity type. Output: a Painless snippet string to embed in scripts or runtime fields.
     */
    getEuidEvaluation: euidModule.getEuidPainlessEvaluation,

    /**
     * Elasticsearch `runtime_mappings` entry that exposes the EUID as a `keyword` runtime field (`entity_id`).
     * Input: entity type. Output: mapping object suitable for the Search API `runtime_mappings` map.
     */
    getEuidRuntimeMapping: euidModule.getEuidPainlessRuntimeMapping,
  },

  /**
   * ESQL strings for extraction pipelines and `WHERE` clauses (aligned with entity definitions).
   */
  esql: {
    /**
     * Broad predicate: documents allowed into the entity pipeline and that could carry an EUID for this type.
     * Input: entity type only. Output: ESQL boolean fragment for `WHERE` (no leading `WHERE`).
     */
    getEuidDocumentsContainsIdFilter: euidModule.getEuidEsqlDocumentsContainsIdFilter,

    /**
     * Full ESQL expression used in extraction to compute the typed EUID (e.g. inside `EVAL` / `STATS`).
     * Input: entity type. Output: ESQL expression string (often a `CONCAT`/`CASE` around identity fields).
     */
    getEuidEvaluation: euidModule.getEuidEsqlEvaluation,

    /**
     * ESQL predicate that locates documents matching one sample document’s identity (mirrors per-doc DSL).
     * Input: entity type and sample document; output: parenthesized boolean expression or `undefined` if not buildable.
     */
    getEuidFilterBasedOnDocument: euidModule.getEuidEsqlFilterBasedOnDocument,
  },

  /**
   * Elasticsearch Query DSL for filters and searches (aligned with entity definitions).
   */
  dsl: {
    /**
     * Query DSL that should match documents sharing the same identity fields as the given sample document.
     * Input: entity type and one document; output: bool/term-style filter, or `undefined` if identity or pipeline gate fails.
     */
    getEuidFilterBasedOnDocument: euidModule.getEuidDslFilterBasedOnDocument,

    /**
     * Broad DSL filter: documents that may participate in the entity pipeline and could have an EUID for this type.
     * Input: entity type only. Output: query DSL equivalent to documentsFilter (and postAgg when defined).
     */
    getEuidDocumentsContainsIdFilter: euidModule.getEuidDslDocumentsContainsIdFilter,
  },
};
