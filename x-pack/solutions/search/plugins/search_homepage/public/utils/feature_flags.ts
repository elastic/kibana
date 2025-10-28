/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FeatureFlagsStart } from '@kbn/core-feature-flags-browser';
import { SEARCH_GETTING_STARTED_FEATURE_FLAG } from '@kbn/search-shared-ui';

/**
 * Check if the Getting Started feature is enabled via feature flag.
 * This is a client-side synchronous evaluation.
 * Default to false if the feature flag is not set.
 *
 * @param featureFlags - The FeatureFlags service from core
 * @returns boolean indicating if the feature is enabled
 */
export function isGettingStartedEnabled(featureFlags: FeatureFlagsStart): boolean {
  return featureFlags.getBooleanValue(SEARCH_GETTING_STARTED_FEATURE_FLAG, false);
}
