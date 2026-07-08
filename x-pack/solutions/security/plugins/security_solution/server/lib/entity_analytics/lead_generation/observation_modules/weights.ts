/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Central weighting for the lead-generation observation modules.
 *
 * The engine multiplies each observation's `score * confidence` by its module
 * weight when ranking entities (see `lead_generation_engine.ts`). Keeping every
 * weight in one place makes the relative influence of each signal explicit and
 * tunable, so alert volume no longer dominates the risk, anomaly, and profile
 * signals that make for prioritizable hunting leads.
 *
 * Keys MUST match each module's `MODULE_ID`.
 */
export const OBSERVATION_MODULE_WEIGHTS = {
  risk_analysis: 0.9,
  anomaly_detection: 0.8,
  temporal_state_analysis: 0.5,
  entity_profile: 0.5,
  behavioral_analysis: 0.4,
} as const;

export type ObservationModuleId = keyof typeof OBSERVATION_MODULE_WEIGHTS;
