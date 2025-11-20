/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isGettingStartedEnabled } from '../utils/feature_flags';
import { useKibana } from './use_kibana';

/**
 * React hook to check if the Getting Started feature is enabled.
 * Default to false if the feature flag is not set or the feature flags service is not available.
 *
 * @returns boolean indicating if the feature is enabled
 */
export const useSearchGettingStartedFeatureFlag = (): boolean => {
  const { featureFlags } = useKibana().services;

  return featureFlags ? isGettingStartedEnabled(featureFlags) : false;
};
