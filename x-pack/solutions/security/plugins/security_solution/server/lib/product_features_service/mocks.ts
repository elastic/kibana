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
import { allowedExperimentalValues, type ExperimentalFeatures } from '../../../common';
import { ProductFeaturesService } from './product_features_service';

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
}));

export const createProductFeaturesServiceMock = (
  /** What features keys should be enabled. Default is all */
  enabledFeatureKeys: ProductFeatureKeys = [...ALL_PRODUCT_FEATURE_KEYS],
  experimentalFeatures: ExperimentalFeatures = { ...allowedExperimentalValues },
  featuresPluginSetupContract: FeaturesPluginSetup = featuresPluginMock.createSetup(),
  logger: Logger = loggingSystemMock.create().get('productFeatureMock')
) => {
  const productFeaturesService = new ProductFeaturesService(logger, experimentalFeatures);

  productFeaturesService.init(featuresPluginSetupContract);

  if (enabledFeatureKeys) {
    productFeaturesService.setProductFeaturesConfigurator({
      security: jest.fn().mockReturnValue(
        new Map(
          enabledFeatureKeys.map((key) => [
            key,
            {
              privileges: {
                all: {
                  ui: ['entity-analytics'],
                  api: [`test-entity-analytics`],
                },
                read: {
                  ui: ['entity-analytics'],
                  api: [`test-entity-analytics`],
                },
              },
            },
          ])
        )
      ),
      cases: jest.fn().mockReturnValue(
        new Map(
          enabledFeatureKeys.map((key) => [
            key,
            {
              privileges: {
                all: {
                  ui: ['entity-analytics'],
                  api: [`test-entity-analytics`],
                },
                read: {
                  ui: ['entity-analytics'],
                  api: [`test-entity-analytics`],
                },
              },
            },
          ])
        )
      ),
      securityAssistant: jest.fn().mockReturnValue(
        new Map(
          enabledFeatureKeys.map((key) => [
            key,
            {
              privileges: {
                all: {
                  ui: ['entity-analytics'],
                  api: [`test-entity-analytics`],
                },
                read: {
                  ui: ['entity-analytics'],
                  api: [`test-entity-analytics`],
                },
              },
            },
          ])
        )
      ),
      attackDiscovery: jest.fn().mockReturnValue(
        new Map(
          enabledFeatureKeys.map((key) => [
            key,
            {
              privileges: {
                all: {
                  ui: ['entity-analytics'],
                  api: [`test-entity-analytics`],
                },
                read: {
                  ui: ['entity-analytics'],
                  api: [`test-entity-analytics`],
                },
              },
            },
          ])
        )
      ),
      timeline: jest.fn().mockReturnValue(
        new Map(
          enabledFeatureKeys.map((key) => [
            key,
            {
              privileges: {
                all: {
                  ui: ['entity-analytics'],
                },
                read: {
                  ui: ['entity-analytics'],
                },
              },
            },
          ])
        )
      ),
      notes: jest.fn().mockReturnValue(
        new Map(
          enabledFeatureKeys.map((key) => [
            key,
            {
              privileges: {
                all: {
                  ui: ['entity-analytics'],
                },
                read: {
                  ui: ['entity-analytics'],
                },
              },
            },
          ])
        )
      ),
      siemMigrations: jest.fn().mockReturnValue(
        new Map(
          enabledFeatureKeys.map((key) => [
            key,
            {
              privileges: {
                all: {
                  api: ['test-api-action'],
                  ui: ['test-ui-action'],
                },
              },
            },
          ])
        )
      ),
    });
  }

  return productFeaturesService;
};
