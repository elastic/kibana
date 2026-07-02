/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LogExtractionConfig, EngineLogExtractionOverrides } from '../saved_objects';

/** The subset of `LogExtractionConfig` fields that can be overridden per entity type. */
export const CADENCE_FIELDS = ['frequency', 'delay', 'lookbackPeriod'] as const;
export type CadenceField = (typeof CADENCE_FIELDS)[number];

/**
 * A caller-supplied per-type cadence override, as accepted by the public API
 * (`install/{entityType}` / `update/{entityType}`). Only real duration values are
 * accepted — there is no `null` to clear a field back to the shared default; callers
 * that want the default must set it explicitly.
 */
export type CadenceOverridePatch = Partial<Record<CadenceField, string>>;

/**
 * Returns the effective log extraction config for an entity type: the shared
 * (store-wide) config with the cadence-related fields (`frequency`, `delay`,
 * `lookbackPeriod`) replaced by the entity type's override, when set.
 *
 * A `null`/`undefined` override field means "no override for this field" — the
 * shared global value is used. All other `LogExtractionConfig` fields (index
 * patterns, volume limits, etc.) always come from the global config; they are
 * not overridable per entity type (see #269261).
 */
export const mergeCadenceOverrides = (
  globalConfig: LogExtractionConfig,
  overrides: EngineLogExtractionOverrides | undefined
): LogExtractionConfig => ({
  ...globalConfig,
  frequency: overrides?.frequency ?? globalConfig.frequency,
  delay: overrides?.delay ?? globalConfig.delay,
  lookbackPeriod: overrides?.lookbackPeriod ?? globalConfig.lookbackPeriod,
});

/**
 * Returns which cadence fields were explicitly supplied in a (partial) log extraction
 * params object. Used to decide, at the store-wide `install`/`update` endpoints, which
 * per-type overrides must be reset so the explicitly requested global value wins
 * uniformly across all entity types (see #269261).
 */
export const getExplicitCadenceFields = (
  params: Partial<Record<CadenceField, unknown>> | undefined
): CadenceField[] => CADENCE_FIELDS.filter((field) => params?.[field] !== undefined);
