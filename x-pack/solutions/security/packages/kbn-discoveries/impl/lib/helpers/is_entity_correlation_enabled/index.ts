/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/server';

export const ATTACK_DISCOVERY_ENTITY_CORRELATION_ENABLED_FEATURE_FLAG =
  'securitySolution.attackDiscoveryEntityCorrelationEnabled' as const;

/**
 * Reads the `attackDiscoveryEntityCorrelationEnabled` feature flag from the
 * global, request-free feature flags service (`coreStart.featureFlags`).
 * Defaults to `false` (OFF): the correlate-entities workflow step passes
 * discoveries through unmodified unless the flag is explicitly enabled.
 */
export const isEntityCorrelationEnabled = (
  featureFlags: Pick<CoreStart['featureFlags'], 'getBooleanValue'>
): Promise<boolean> =>
  featureFlags.getBooleanValue(ATTACK_DISCOVERY_ENTITY_CORRELATION_ENABLED_FEATURE_FLAG, false);
