/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Use with `feature_flags.overrides` in kibana.yml to enable the significant events overview. */
export const OBSERVABILITY_SIGEVENTS_OVERVIEW_FEATURE_FLAG =
  'observability.sigeventsOverviewEnabled' as const;

/**
 * Fallback when the flag is unset and no override exists.
 */
export const OBSERVABILITY_SIGEVENTS_OVERVIEW_DEFAULT = true;
