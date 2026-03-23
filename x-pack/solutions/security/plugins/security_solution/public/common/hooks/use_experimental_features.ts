/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExperimentalFeatures } from '../../../common/experimental_features';
import {
  allowedExperimentalValues,
  getExperimentalAllowedValuesKeys,
} from '../../../common/experimental_features';

const allowedExperimentalValuesKeys = getExperimentalAllowedValuesKeys();

export const useIsExperimentalFeatureEnabled = (feature: keyof ExperimentalFeatures): boolean => {
  if (!allowedExperimentalValues || !(feature in allowedExperimentalValues)) {
    throw new Error(
      `Invalid enable value ${feature}. Allowed values are: ${allowedExperimentalValuesKeys.join(
        ', '
      )}`
    );
  }
  return allowedExperimentalValues[feature];
};
