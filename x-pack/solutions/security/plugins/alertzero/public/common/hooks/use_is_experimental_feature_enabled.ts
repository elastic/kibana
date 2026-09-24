/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExperimentalFeatures } from '../../../common/experimental_features';
import { ExperimentalFeaturesService } from '../experimental_features_service';

/**
 * Reads a single AlertZero experimental flag. Components call this directly (no context
 * provider) because `ExperimentalFeaturesService` is initialized synchronously in
 * `AlertZeroPlugin#setup`, before any Watch page can render.
 */
export const useIsExperimentalFeatureEnabled = (feature: keyof ExperimentalFeatures): boolean => {
  const experimentalFeatures = ExperimentalFeaturesService.get();
  return experimentalFeatures[feature] ?? false;
};
