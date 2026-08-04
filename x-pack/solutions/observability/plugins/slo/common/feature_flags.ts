/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const SLO_COMPOSITE_ENABLED = 'slo.compositeSloEnabled';

/** Use with `feature_flags.overrides` in kibana.yml to toggle CPS header picker for SLO. */
export const OBSERVABILITY_SLO_CPS_ENABLED_FEATURE_FLAG = 'observability.slo.cpsEnabled' as const;

/** Fallback when the flag is unset and no override exists. */
export const OBSERVABILITY_SLO_CPS_ENABLED_DEFAULT = false;
