/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Plugin, CoreSetup } from '@kbn/core/server';
import { getProductProductFeaturesConfigurator } from './product_features';
import { DEFAULT_PRODUCT_FEATURES } from './constants';

import type {
  SecuritySolutionEssPluginSetup,
  SecuritySolutionEssPluginStart,
  SecuritySolutionEssPluginSetupDeps,
  SecuritySolutionEssPluginStartDeps,
} from './types';

export class SecuritySolutionEssPlugin
  implements
    Plugin<
      SecuritySolutionEssPluginSetup,
      SecuritySolutionEssPluginStart,
      SecuritySolutionEssPluginSetupDeps,
      SecuritySolutionEssPluginStartDeps
    >
{
  public setup(_coreSetup: CoreSetup, pluginsSetup: SecuritySolutionEssPluginSetupDeps) {
    const productFeaturesConfigurator =
      getProductProductFeaturesConfigurator(DEFAULT_PRODUCT_FEATURES);
    pluginsSetup.securitySolution.setProductFeaturesConfigurator(productFeaturesConfigurator);
    return {};
  }

  public start() {
    return {};
  }

  public stop() {}
}
