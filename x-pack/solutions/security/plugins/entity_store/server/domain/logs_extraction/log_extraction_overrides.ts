/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LogExtractionConfig, EngineLogExtractionOverrides } from '../saved_objects';

/** The subset of `LogExtractionConfig` fields that can be overridden per entity type. */
export const OVERRIDABLE_LOG_EXTRACTION_FIELDS = ['frequency', 'delay', 'lookbackPeriod'] as const;
export type OverridableLogExtractionField = (typeof OVERRIDABLE_LOG_EXTRACTION_FIELDS)[number];

/**
 * A caller-supplied per-type log extraction override, as accepted by the public API
 * (`install/{entityType}` / `PUT /{entityType}`). Only real values are accepted —
 * there is no `null` to clear a field back to the shared default; callers that want
 * the default must set it explicitly.
 */
export type LogExtractionOverridePatch = Partial<Record<OverridableLogExtractionField, string>>;

/**
 * Returns the effective log extraction config for an entity type: the shared
 * (store-wide) config with the overridable fields (`OVERRIDABLE_LOG_EXTRACTION_FIELDS`)
 * replaced by the entity type's override, when set.
 *
 * A `null`/`undefined` override field means "no override for this field" — the
 * shared global value is used. All other `LogExtractionConfig` fields (index
 * patterns, volume limits, etc.) always come from the global config; they are
 * not overridable per entity type (see #269261).
 */
export const mergeLogExtractionOverrides = (
  globalConfig: LogExtractionConfig,
  overrides: EngineLogExtractionOverrides | undefined
): LogExtractionConfig => {
  const merged = { ...globalConfig };
  for (const field of OVERRIDABLE_LOG_EXTRACTION_FIELDS) {
    merged[field] = overrides?.[field] ?? globalConfig[field];
  }
  return merged;
};

/**
 * Returns which overridable fields were explicitly supplied in a (partial) log
 * extraction params object. Used to decide, at the store-wide `install`/`update`
 * endpoints, which per-type overrides must be reset so the explicitly requested
 * global value wins uniformly across all entity types (see #269261).
 */
export const getExplicitOverrideFields = (
  params: Partial<Record<OverridableLogExtractionField, unknown>> | undefined
): OverridableLogExtractionField[] =>
  OVERRIDABLE_LOG_EXTRACTION_FIELDS.filter((field) => params?.[field] !== undefined);
