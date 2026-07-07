/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProductFeatureKeys } from '@kbn/security-solution-features';
import type { SecuritySolutionEssPluginSetupDeps } from '../types';
import { productFeaturesExtensions } from './product_features_extensions';

export const registerProductFeatures = (
  pluginsSetup: SecuritySolutionEssPluginSetupDeps,
  enabledProductFeatureKeys: ProductFeatureKeys
): void => {
  pluginsSetup.securitySolution.setProductFeaturesConfigurator({
    enabledProductFeatureKeys,
    extensions: productFeaturesExtensions,
  });
};
