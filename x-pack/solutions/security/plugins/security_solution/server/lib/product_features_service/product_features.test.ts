/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { ProductFeatures } from './product_features';
import type {
  ProductFeatureKeyType,
  ProductFeatureKibanaConfig,
  BaseKibanaFeatureConfig,
  ProductFeatureParams,
  ProductFeatureGroup,
} from '@kbn/security-solution-features';
import type { SubFeatureConfig } from '@kbn/features-plugin/common';

const category = {
  id: 'security',
  label: 'Security app category',
};

const baseKibanaFeature: BaseKibanaFeatureConfig = {
  id: 'FEATURE_ID',
  name: 'Base Feature',
  order: 1100,
  app: ['FEATURE_ID', 'kibana'],
  catalogue: ['APP_ID'],
  privileges: {
    all: {
      api: ['api-read', 'api-write'],
      app: ['FEATURE_ID', 'kibana'],
      catalogue: ['APP_ID'],
      savedObject: {
        all: [],
        read: [],
      },
      ui: ['write', 'read'],
    },
    read: {
      api: ['api-read'],
      app: ['FEATURE_ID', 'kibana'],
      catalogue: ['APP_ID'],
      savedObject: {
        all: [],
        read: [],
      },
      ui: ['read'],
    },
  },
  category,
};

// sub-features definition
const SUB_FEATURE: SubFeatureConfig = {
  name: 'subFeature1',
  privilegeGroups: [
    {
      groupType: 'independent',
      privileges: [
        {
          id: 'subFeature1',
          name: 'subFeature1',
          includeIn: 'all',
          savedObject: {
            all: [],
            read: [],
          },
          ui: ['subFeature1-action'],
          api: ['subFeature1-action'],
        },
      ],
    },
  ],
};

const SUB_FEATURE_2: SubFeatureConfig = {
  name: 'subFeature2',
  privilegeGroups: [
    {
      groupType: 'independent',
      privileges: [
        {
          id: 'subFeature2',
          name: 'subFeature2',
          includeIn: 'all',
          savedObject: {
            all: [],
            read: [],
          },
          ui: ['subFeature2-action'],
          api: ['subFeature2-action'],
        },
      ],
    },
  ],
};

const subFeaturesMap = new Map([
  [SUB_FEATURE.name, SUB_FEATURE],
  [SUB_FEATURE_2.name, SUB_FEATURE_2],
]);

// app features configs
const testSubFeaturePrivilegeConfig: ProductFeatureKibanaConfig = {
  subFeatureIds: [SUB_FEATURE.name],
};

const testFeaturePrivilegeConfig: ProductFeatureKibanaConfig = {
  privileges: {
    all: {
      ui: ['test-action'],
      api: ['test-action'],
    },
    read: {
      ui: ['test-action'],
      api: ['test-action'],
    },
  },
};

const expectedBaseWithTestConfigPrivileges = {
  privileges: {
    all: {
      api: ['api-read', 'api-write', 'test-action'],
      app: ['FEATURE_ID', 'kibana'],
      catalogue: ['APP_ID'],
      savedObject: {
        all: [],
        read: [],
      },
      ui: ['write', 'read', 'test-action'],
    },
    read: {
      api: ['api-read', 'test-action'],
      app: ['FEATURE_ID', 'kibana'],
      catalogue: ['APP_ID'],
      savedObject: {
        all: [],
        read: [],
      },
      ui: ['read', 'test-action'],
    },
  },
};

const testFeatureKey1 = 'test-feature' as ProductFeatureKeyType;
const testFeatureKey2 = 'test-sub-feature' as ProductFeatureKeyType;

const testFeatureParams: ProductFeatureParams = {
  subFeaturesMap,
  baseKibanaFeature,
  baseKibanaSubFeatureIds: [],
};

const logger = loggingSystemMock.create().get('mock');
const featureGroup = 'test-feature' as ProductFeatureGroup;

const featuresSetup = {
  registerKibanaFeature: jest.fn(),
  getKibanaFeatures: jest.fn(),
} as unknown as FeaturesPluginSetup;

describe('ProductFeatures', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset productFeatureConfig for each test
    if (testFeatureParams.productFeatureConfig) {
      delete testFeatureParams.productFeatureConfig;
    }
  });

  describe('register', () => {
    it('should register base kibana features with empty enabled keys', () => {
      const productFeatures = new ProductFeatures(logger);

      productFeatures.create(featureGroup, [testFeatureParams]);
      productFeatures.init(featuresSetup);
      productFeatures.register([], {});

      expect(featuresSetup.registerKibanaFeature).toHaveBeenCalledWith({
        ...baseKibanaFeature,
        subFeatures: [],
      });
    });

    it('should register enabled kibana features', () => {
      const productFeatures = new ProductFeatures(logger);

      // Setup product feature with static config
      const paramsWithConfig = {
        ...testFeatureParams,
        productFeatureConfig: {
          [testFeatureKey1]: testFeaturePrivilegeConfig,
        },
      };

      productFeatures.create(featureGroup, [paramsWithConfig]);
      productFeatures.init(featuresSetup);

      // Register with the specific enabled key
      productFeatures.register([testFeatureKey1], {});

      expect(featuresSetup.registerKibanaFeature).toHaveBeenCalledWith({
        ...baseKibanaFeature,
        ...expectedBaseWithTestConfigPrivileges,
        subFeatures: [],
      });
    });

    it('should register enabled kibana features and sub features', () => {
      const productFeatures = new ProductFeatures(logger);

      // Setup product feature with static configs for feature and sub-feature
      const paramsWithConfig = {
        ...testFeatureParams,
        productFeatureConfig: {
          [testFeatureKey1]: testFeaturePrivilegeConfig,
          [testFeatureKey2]: testSubFeaturePrivilegeConfig,
        },
      };

      productFeatures.create(featureGroup, [paramsWithConfig]);
      productFeatures.init(featuresSetup);

      // Register with both enabled keys
      productFeatures.register([testFeatureKey1, testFeatureKey2], {});

      expect(featuresSetup.registerKibanaFeature).toHaveBeenCalledWith({
        ...baseKibanaFeature,
        ...expectedBaseWithTestConfigPrivileges,
        subFeatures: [SUB_FEATURE],
      });
    });

    it('should register enabled kibana features and default sub features', () => {
      const productFeatures = new ProductFeatures(logger);

      // Setup product feature with static configs and default sub-feature
      const paramsWithConfig = {
        ...testFeatureParams,
        baseKibanaSubFeatureIds: [SUB_FEATURE_2.name],
        productFeatureConfig: {
          [testFeatureKey1]: testFeaturePrivilegeConfig,
          [testFeatureKey2]: testSubFeaturePrivilegeConfig,
        },
      };

      productFeatures.create(featureGroup, [paramsWithConfig]);
      productFeatures.init(featuresSetup);

      // Register with both enabled keys
      productFeatures.register([testFeatureKey1, testFeatureKey2], {});

      expect(featuresSetup.registerKibanaFeature).toHaveBeenCalledWith({
        ...baseKibanaFeature,
        ...expectedBaseWithTestConfigPrivileges,
        subFeatures: [SUB_FEATURE, SUB_FEATURE_2],
      });
    });

    it('should use extensions to modify product feature config', () => {
      const productFeatures = new ProductFeatures(logger);

      // Setup base product feature with static config
      const paramsWithConfig = {
        ...testFeatureParams,
        productFeatureConfig: {
          [testFeatureKey1]: {
            privileges: {
              all: {
                ui: ['base-action'],
                api: ['base-action'],
              },
              read: {
                ui: ['base-action'],
                api: ['base-action'],
              },
            },
          },
        },
      };

      productFeatures.create(featureGroup, [paramsWithConfig]);
      productFeatures.init(featuresSetup);

      // Register with extension that adds to the static config
      const extensions = {
        [featureGroup]: {
          allVersions: {
            [testFeatureKey1]: {
              privileges: {
                all: {
                  ui: ['extension-action'],
                  api: ['extension-action'],
                },
                read: {
                  ui: ['extension-action'],
                  api: ['extension-action'],
                },
              },
            },
          },
        },
      };

      productFeatures.register([testFeatureKey1], extensions);

      // Should combine both base and extension actions
      expect(featuresSetup.registerKibanaFeature).toHaveBeenCalledWith(
        expect.objectContaining({
          privileges: {
            all: expect.objectContaining({
              ui: expect.arrayContaining(['base-action', 'extension-action']),
              api: expect.arrayContaining(['base-action', 'extension-action']),
            }),
            read: expect.objectContaining({
              ui: expect.arrayContaining(['base-action', 'extension-action']),
              api: expect.arrayContaining(['base-action', 'extension-action']),
            }),
          },
        })
      );
    });
  });

  describe('isActionRegistered', () => {
    it('should register base privilege actions', () => {
      const productFeatures = new ProductFeatures(logger);
      productFeatures.create(featureGroup, [testFeatureParams]);
      productFeatures.init(featuresSetup);
      productFeatures.register([], {});

      expect(productFeatures.isActionRegistered('api:api-read')).toEqual(true);
      expect(productFeatures.isActionRegistered('ui:read')).toEqual(true);
      expect(productFeatures.isActionRegistered('api:api-write')).toEqual(true);
      expect(productFeatures.isActionRegistered('ui:write')).toEqual(true);
      expect(productFeatures.isActionRegistered('api:test-action')).toEqual(false);
      expect(productFeatures.isActionRegistered('ui:test-action')).toEqual(false);
      expect(productFeatures.isActionRegistered('api:subFeature1-action')).toEqual(false);
      expect(productFeatures.isActionRegistered('ui:subFeature1-action')).toEqual(false);
      expect(productFeatures.isActionRegistered('api:subFeature2-action')).toEqual(false);
      expect(productFeatures.isActionRegistered('ui:subFeature2-action')).toEqual(false);
    });

    it('should register config privilege actions', () => {
      const productFeatures = new ProductFeatures(logger);

      const paramsWithConfig = {
        ...testFeatureParams,
        productFeatureConfig: {
          [testFeatureKey1]: testFeaturePrivilegeConfig,
        },
      };

      productFeatures.create(featureGroup, [paramsWithConfig]);
      productFeatures.init(featuresSetup);
      productFeatures.register([testFeatureKey1], {});

      expect(productFeatures.isActionRegistered('api:api-read')).toEqual(true);
      expect(productFeatures.isActionRegistered('ui:read')).toEqual(true);
      expect(productFeatures.isActionRegistered('api:api-write')).toEqual(true);
      expect(productFeatures.isActionRegistered('ui:write')).toEqual(true);
      expect(productFeatures.isActionRegistered('api:test-action')).toEqual(true);
      expect(productFeatures.isActionRegistered('ui:test-action')).toEqual(true);
      expect(productFeatures.isActionRegistered('api:subFeature1-action')).toEqual(false);
      expect(productFeatures.isActionRegistered('ui:subFeature1-action')).toEqual(false);
      expect(productFeatures.isActionRegistered('api:subFeature2-action')).toEqual(false);
      expect(productFeatures.isActionRegistered('ui:subFeature2-action')).toEqual(false);
    });

    it('should register config sub-feature privilege actions', () => {
      const productFeatures = new ProductFeatures(logger);

      const paramsWithConfig = {
        ...testFeatureParams,
        productFeatureConfig: {
          [testFeatureKey1]: testFeaturePrivilegeConfig,
          [testFeatureKey2]: testSubFeaturePrivilegeConfig,
        },
      };

      productFeatures.create(featureGroup, [paramsWithConfig]);
      productFeatures.init(featuresSetup);
      productFeatures.register([testFeatureKey1, testFeatureKey2], {});

      expect(productFeatures.isActionRegistered('api:api-read')).toEqual(true);
      expect(productFeatures.isActionRegistered('ui:read')).toEqual(true);
      expect(productFeatures.isActionRegistered('api:api-write')).toEqual(true);
      expect(productFeatures.isActionRegistered('ui:write')).toEqual(true);
      expect(productFeatures.isActionRegistered('api:test-action')).toEqual(true);
      expect(productFeatures.isActionRegistered('ui:test-action')).toEqual(true);
      expect(productFeatures.isActionRegistered('api:subFeature1-action')).toEqual(true);
      expect(productFeatures.isActionRegistered('ui:subFeature1-action')).toEqual(true);
      expect(productFeatures.isActionRegistered('api:subFeature2-action')).toEqual(false);
      expect(productFeatures.isActionRegistered('ui:subFeature2-action')).toEqual(false);
    });

    it('should register default and config sub-feature privilege actions', () => {
      const productFeatures = new ProductFeatures(logger);

      const paramsWithConfig = {
        ...testFeatureParams,
        baseKibanaSubFeatureIds: [SUB_FEATURE_2.name],
        productFeatureConfig: {
          [testFeatureKey1]: testFeaturePrivilegeConfig,
          [testFeatureKey2]: testSubFeaturePrivilegeConfig,
        },
      };

      productFeatures.create(featureGroup, [paramsWithConfig]);
      productFeatures.init(featuresSetup);
      productFeatures.register([testFeatureKey1, testFeatureKey2], {});

      expect(productFeatures.isActionRegistered('api:api-read')).toEqual(true);
      expect(productFeatures.isActionRegistered('ui:read')).toEqual(true);
      expect(productFeatures.isActionRegistered('api:api-write')).toEqual(true);
      expect(productFeatures.isActionRegistered('ui:write')).toEqual(true);
      expect(productFeatures.isActionRegistered('api:test-action')).toEqual(true);
      expect(productFeatures.isActionRegistered('ui:test-action')).toEqual(true);
      expect(productFeatures.isActionRegistered('api:subFeature1-action')).toEqual(true);
      expect(productFeatures.isActionRegistered('ui:subFeature1-action')).toEqual(true);
      expect(productFeatures.isActionRegistered('api:subFeature2-action')).toEqual(true);
      expect(productFeatures.isActionRegistered('ui:subFeature2-action')).toEqual(true);
    });
  });
});
