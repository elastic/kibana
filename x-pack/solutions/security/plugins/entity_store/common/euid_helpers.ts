/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * EUID translation layer: helpers that depend on entity definitions and streamlang.
 * Import from here when you need euid DSL/ESQL/Painless. For entity types use common (index).
 * Do not import this file from plugin public (browser) code synchronously — it pulls in @kbn/streamlang.
 * For browser bundles, load the same {@link euid} object via dynamic import (`euid_browser` / `loadEuidApi()`).
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
   * Flat map of ECS field → scalar value for the winning identity branch (same pipeline as {@link euid.getEuidFromObject}).
   * Use to seed flyouts, filters, and resolution when you need field-level context, not only the composed EUID string.
   */
  getEntityIdentifiersFromDocument: euidModule.getEntityIdentifiersFromDocument,
  /**
   * Builds EUID from Timeline “non-ECS” row arrays (field + value[]) without importing timelines types.
   */
  getEuidFromTimelineNonEcsData: euidModule.getEuidFromTimelineNonEcsData,
  /**
   * Returns which source fields are read for EUID for an entity type (`requiresOneOf`, full `identitySourceFields` list).
   * Exposed so UIs and CRUD can request minimal `_source` or validate partial documents.
   */
  getEuidSourceFields: euidModule.getEuidSourceFields,

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
     * ESQL predicate that locates documents matching one sample document's identity (mirrors per-doc DSL).
     * Input: entity type and sample document; output: parenthesized boolean expression or `undefined` if not buildable.
     */
    getEuidFilterBasedOnDocument: euidModule.getEuidEsqlFilterBasedOnDocument,

    /**
     * Returns the ESQL `EVAL` expressions for field evaluations (e.g. entity.namespace derivation).
     * Input: entity type. Output: ESQL expression string for `EVAL`, or `undefined` if none defined.
     */
    getFieldEvaluations: euidModule.getFieldEvaluationsEsql,
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

/** Full EUID API (memory + painless + esql + dsl) — same object for Node and browser lazy chunk. */
export type EntityStoreEuid = typeof euid;

/**
 * EUID API surface passed through the entity_store plugin React context and `loadEuidApi()`.
 * Aligns with the {@link euid} object from this module.
 */
export interface EntityStoreEuidApi {
  euid: EntityStoreEuid;
}
