/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Temporary flag until the feature is fully enabled.
 * Use with `feature_flags.overrides` in kibana.yml to toggle the pod schema selector.
 */
export const INFRA_POD_SCHEMA_SELECTOR_FEATURE_FLAG = 'infra.pod.schema.selector' as const;

/** Fallback when the flag is unset and no override exists. */
export const INFRA_POD_SCHEMA_SELECTOR_DEFAULT = false;
