/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { featuresPluginMock } from '@kbn/features-plugin/server/mocks';

import type { ProductFeatureKeys } from '@kbn/security-solution-features';
import { ALL_PRODUCT_FEATURE_KEYS } from '@kbn/security-solution-features/keys';
import { coreLifecycleMock } from '@kbn/core-lifecycle-server-mocks';
import { allowedExperimentalValues, type ExperimentalFeatures } from '../../../common';
import { ProductFeaturesService } from './product_features_service';
import type { SecuritySolutionPluginSetupDependencies } from '../../plugin_contract';

jest.mock('@kbn/security-solution-features/product_features', () => ({
  getSecurityFeature: jest.fn(() => ({
    baseKibanaFeature: {},
    baseKibanaSubFeatureIds: [],
    subFeaturesMap: new Map(),
  })),
  getSecurityV2Feature: jest.fn(() => ({
    baseKibanaFeature: {},
    baseKibanaSubFeatureIds: [],
    subFeaturesMap: new Map(),
  })),
  getSecurityV3Feature: jest.fn(() => ({
    baseKibanaFeature: {},
    baseKibanaSubFeatureIds: [],
    subFeaturesMap: new Map(),
  })),
  getSecurityV4Feature: jest.fn(() => ({
    baseKibanaFeature: {},
    baseKibanaSubFeatureIds: [],
    subFeaturesMap: new Map(),
  })),
  getSecurityV5Feature: jest.fn(() => ({
    baseKibanaFeature: {},
    baseKibanaSubFeatureIds: [],
    subFeaturesMap: new Map(),
  })),
  getCasesFeature: jest.fn(() => ({
    baseKibanaFeature: {},
    baseKibanaSubFeatureIds: [],
    subFeaturesMap: new Map(),
  })),
  getCasesV2Feature: jest.fn(() => ({
    baseKibanaFeature: {},
    baseKibanaSubFeatureIds: [],
    subFeaturesMap: new Map(),
  })),
  getCasesV3Feature: jest.fn(() => ({
    baseKibanaFeature: {},
    baseKibanaSubFeatureIds: [],
    subFeaturesMap: new Map(),
  })),
  getAssistantFeature: jest.fn(() => ({
    baseKibanaFeature: {},
    baseKibanaSubFeatureIds: [],
    subFeaturesMap: new Map(),
  })),
  getAttackDiscoveryFeature: jest.fn(() => ({
    baseKibanaFeature: {},
    baseKibanaSubFeatureIds: [],
    subFeaturesMap: new Map(),
  })),
  getTimelineFeature: jest.fn(() => ({
    baseKibanaFeature: {},
    baseKibanaSubFeatureIds: [],
    subFeaturesMap: new Map(),
  })),
  getNotesFeature: jest.fn(() => ({
    baseKibanaFeature: {},
    baseKibanaSubFeatureIds: [],
    subFeaturesMap: new Map(),
  })),
  getSiemMigrationsFeature: jest.fn(() => ({
    baseKibanaFeature: {},
    baseKibanaSubFeatureIds: [],
    subFeaturesMap: new Map(),
  })),
  getRulesFeature: jest.fn(() => ({
    baseKibanaFeature: {},
    baseKibanaSubFeatureIds: [],
    subFeaturesMap: new Map(),
  })),
  getRulesV2Feature: jest.fn(() => ({
    baseKibanaFeature: {},
    baseKibanaSubFeatureIds: [],
    subFeaturesMap: new Map(),
  })),
}));

export const createProductFeaturesServiceMock = (
  /** What features keys should be enabled. Default is all */
  enabledProductFeatureKeys: ProductFeatureKeys = [...ALL_PRODUCT_FEATURE_KEYS],
  experimentalFeatures: ExperimentalFeatures = { ...allowedExperimentalValues },
  featuresPluginSetupContract: FeaturesPluginSetup = featuresPluginMock.createSetup(),
  logger: Logger = loggingSystemMock.create().get('productFeatureMock')
) => {
  const productFeaturesService = new ProductFeaturesService(logger, experimentalFeatures);

  productFeaturesService.setup(coreLifecycleMock.createCoreSetup(), {
    features: featuresPluginSetupContract,
  } as SecuritySolutionPluginSetupDependencies);

  if (enabledProductFeatureKeys) {
    productFeaturesService.setProductFeaturesConfigurator({
      enabledProductFeatureKeys,
    });
  }

  return productFeaturesService;
};
