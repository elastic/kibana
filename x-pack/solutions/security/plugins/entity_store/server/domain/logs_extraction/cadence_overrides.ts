/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LogExtractionConfig, EngineLogExtractionOverrides } from '../saved_objects';

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
