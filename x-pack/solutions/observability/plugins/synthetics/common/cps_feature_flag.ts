/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Use with `feature_flags.overrides` in kibana.yml to toggle CPS integration for Synthetics. */
export const OBSERVABILITY_SYNTHETICS_CPS_ENABLED_FEATURE_FLAG =
  'observability.synthetics.cpsEnabled' as const;

/**
 * Fallback when the flag is unset. Matches APM / Infra so serverless
 * deployments with platform CPS on get the Synthetics picker by default.
 */
export const OBSERVABILITY_SYNTHETICS_CPS_ENABLED_DEFAULT = true;
