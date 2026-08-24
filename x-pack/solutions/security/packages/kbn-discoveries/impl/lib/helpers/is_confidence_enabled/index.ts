/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/server';

export const ATTACK_DISCOVERY_CONFIDENCE_ENABLED_FEATURE_FLAG =
  'securitySolution.attackDiscoveryConfidenceEnabled' as const;

/**
 * Reads the `attackDiscoveryConfidenceEnabled` feature flag from the global,
 * request-free feature flags service (`coreStart.featureFlags`). Independent of
 * `attackDiscoveryWorkflowsEnabled` so confidence scoring can be dark-launched
 * additively; defaults to OFF. Callable from any server context with start
 * services — including the confidence workflow step handler.
 */
export const isConfidenceEnabled = (
  featureFlags: Pick<CoreStart['featureFlags'], 'getBooleanValue'>
): Promise<boolean> =>
  featureFlags.getBooleanValue(ATTACK_DISCOVERY_CONFIDENCE_ENABLED_FEATURE_FLAG, false);
