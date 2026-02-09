/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProductFeaturesService } from './product_features_service';
import { ProductFeatures } from './product_features';
import type {
  BaseKibanaFeatureConfig,
  ProductFeaturesConfigurator,
} from '@kbn/security-solution-features';
import { loggerMock } from '@kbn/logging-mocks';
import type { ExperimentalFeatures } from '../../../common';
import { featuresPluginMock } from '@kbn/features-plugin/server/mocks';
import { ProductFeatureKey } from '@kbn/security-solution-features/keys';
import { httpServiceMock } from '@kbn/core-http-server-mocks';
import type {
  AuthzEnabled,
  KibanaRequest,
  LifecycleResponseFactory,
  OnPostAuthHandler,
} from '@kbn/core-http-server';
import type { SecuritySolutionPluginSetupDependencies } from '../../plugin_contract';
import { coreLifecycleMock } from '@kbn/core-lifecycle-server-mocks';

jest.mock('./product_features');
const MockedProductFeatures = ProductFeatures as unknown as jest.MockedClass<
  typeof ProductFeatures
>;

const productFeature = {
  subFeaturesMap: new Map(),
  baseKibanaFeature: {} as BaseKibanaFeatureConfig,
  baseKibanaSubFeatureIds: [],
};
const mockGetFeature = jest.fn().mockReturnValue(productFeature);
jest.mock('@kbn/security-solution-features/product_features', () => ({
  getSecurityFeature: () => mockGetFeature(),
  getSecurityV2Feature: () => mockGetFeature(),
  getSecurityV3Feature: () => mockGetFeature(),
  getSecurityV4Feature: () => mockGetFeature(),
  getSecurityV5Feature: () => mockGetFeature(),
  getRulesFeature: () => mockGetFeature(),
  getRulesV2Feature: () => mockGetFeature(),
  getCasesFeature: () => mockGetFeature(),
  getCasesV2Feature: () => mockGetFeature(),
  getCasesV3Feature: () => mockGetFeature(),
  getAttackDiscoveryFeature: () => mockGetFeature(),
  getAssistantFeature: () => mockGetFeature(),
  getTimelineFeature: () => mockGetFeature(),
  getNotesFeature: () => mockGetFeature(),
  getSiemMigrationsFeature: () => mockGetFeature(),
}));

const coreSetup = coreLifecycleMock.createCoreSetup();
const featuresSetup = featuresPluginMock.createSetup();
const pluginsSetup = {
  features: featuresSetup,
} as unknown as SecuritySolutionPluginSetupDependencies;

describe('ProductFeaturesService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create ProductFeatureService instance', () => {
    const experimentalFeatures = {} as ExperimentalFeatures;
    new ProductFeaturesService(loggerMock.create(), experimentalFeatures);

    expect(mockGetFeature).toHaveBeenCalled();
    expect(MockedProductFeatures).toHaveBeenCalled();
  });

  it('should init all ProductFeatures when initialized', () => {
    const experimentalFeatures = {} as ExperimentalFeatures;
    const productFeaturesService = new ProductFeaturesService(
      loggerMock.create(),
      experimentalFeatures
    );

    productFeaturesService.setup(coreSetup, pluginsSetup);
    expect(MockedProductFeatures.mock.instances[0].init).toHaveBeenCalledWith(featuresSetup);
  });

  describe('setProductFeaturesConfigurator', () => {
    it('should configure ProductFeatures with basic configuration', () => {
      const experimentalFeatures = {} as ExperimentalFeatures;
      const productFeaturesService = new ProductFeaturesService(
        loggerMock.create(),
        experimentalFeatures
      );

      productFeaturesService.setup(coreSetup, pluginsSetup);

      // Simple configurator with just enabled keys and no extensions
      const configurator: ProductFeaturesConfigurator = {
        enabledProductFeatureKeys: [
          ProductFeatureKey.advancedInsights,
          ProductFeatureKey.casesConnectors,
        ],
        extensions: {},
      };

      productFeaturesService.setProductFeaturesConfigurator(configurator);

      // Verify that register was called with the enabledProductFeatureKeys and empty extensions
      const { register } = MockedProductFeatures.mock.instances[0];
      expect(register).toHaveBeenCalledWith(
        configurator.enabledProductFeatureKeys,
        configurator.extensions
      );
    });

    it('should configure ProductFeatures with extensions', () => {
      const log = loggerMock.create();
      const experimentalFeatures = {} as ExperimentalFeatures;
      const productFeaturesService = new ProductFeaturesService(log, experimentalFeatures);

      productFeaturesService.setup(coreSetup, pluginsSetup);

      // Configurator with both enabled keys and extensions
      const configurator: ProductFeaturesConfigurator = {
        enabledProductFeatureKeys: [
          ProductFeatureKey.advancedInsights,
          ProductFeatureKey.casesConnectors,
          ProductFeatureKey.assistant,
          ProductFeatureKey.timeline,
          ProductFeatureKey.notes,
        ],
        extensions: {
          security: {
            allVersions: {
              [ProductFeatureKey.advancedInsights]: {
                privileges: {
                  all: {
                    api: ['test-api'],
                  },
                },
              },
            },
            version: {},
          },
          cases: {
            allVersions: {
              [ProductFeatureKey.casesConnectors]: {
                privileges: {
                  all: {
                    api: ['test-cases-api'],
                  },
                },
              },
            },
            version: {},
          },
        },
      };

      productFeaturesService.setProductFeaturesConfigurator(configurator);

      // Verify that register was called with both enabledProductFeatureKeys and extensions
      const { register } = MockedProductFeatures.mock.instances[0];
      expect(register).toHaveBeenCalledWith(
        configurator.enabledProductFeatureKeys,
        configurator.extensions
      );

      // Verify that the logger was used to log the enabled features
      expect(log.get().debug).toHaveBeenCalledWith(
        expect.stringContaining('Registering product features:')
      );
    });
  });

  describe('isEnabled', () => {
    it('should throw an error if not configured yet', () => {
      const experimentalFeatures = {} as ExperimentalFeatures;
      const productFeaturesService = new ProductFeaturesService(
        loggerMock.create(),
        experimentalFeatures
      );

      productFeaturesService.setup(coreSetup, pluginsSetup);

      // isEnabled should throw error because setProductFeaturesConfigurator hasn't been called
      expect(() => {
        productFeaturesService.isEnabled(ProductFeatureKey.advancedInsights);
      }).toThrow('ProductFeatures has not yet been configured');
    });

    it('should return true for enabled features and false for disabled features', () => {
      const experimentalFeatures = {} as ExperimentalFeatures;
      const productFeaturesService = new ProductFeaturesService(
        loggerMock.create(),
        experimentalFeatures
      );

      productFeaturesService.setup(coreSetup, pluginsSetup);

      const enabledKeys = [
        ProductFeatureKey.advancedInsights,
        ProductFeatureKey.endpointExceptions,
        ProductFeatureKey.casesConnectors,
        ProductFeatureKey.assistant,
        ProductFeatureKey.attackDiscovery,
        ProductFeatureKey.siemMigrations,
        ProductFeatureKey.timeline,
        ProductFeatureKey.notes,
      ];

      const configurator: ProductFeaturesConfigurator = {
        enabledProductFeatureKeys: enabledKeys,
        extensions: {},
      };

      productFeaturesService.setProductFeaturesConfigurator(configurator);

      expect(productFeaturesService.isEnabled(ProductFeatureKey.advancedInsights)).toEqual(true);
      expect(productFeaturesService.isEnabled(ProductFeatureKey.endpointExceptions)).toEqual(true);
      expect(productFeaturesService.isEnabled(ProductFeatureKey.casesConnectors)).toEqual(true);
      expect(productFeaturesService.isEnabled(ProductFeatureKey.assistant)).toEqual(true);
      expect(productFeaturesService.isEnabled(ProductFeatureKey.attackDiscovery)).toEqual(true);
      expect(productFeaturesService.isEnabled(ProductFeatureKey.siemMigrations)).toEqual(true);
      expect(productFeaturesService.isEnabled(ProductFeatureKey.timeline)).toEqual(true);
      expect(productFeaturesService.isEnabled(ProductFeatureKey.notes)).toEqual(true);
      expect(productFeaturesService.isEnabled(ProductFeatureKey.externalRuleActions)).toEqual(
        false
      );
    });
  });

  describe('getApiActionName', () => {
    it('should return API action name with proper prefix', () => {
      const experimentalFeatures = {} as ExperimentalFeatures;
      const productFeaturesService = new ProductFeaturesService(
        loggerMock.create(),
        experimentalFeatures
      );

      expect(productFeaturesService.getApiActionName('test')).toEqual('api:securitySolution-test');
      expect(productFeaturesService.getApiActionName('case/create')).toEqual(
        'api:securitySolution-case/create'
      );
    });
  });

  describe('isActionRegistered', () => {
    it('should delegate to ProductFeatures.isActionRegistered', () => {
      const experimentalFeatures = {} as ExperimentalFeatures;
      const productFeaturesService = new ProductFeaturesService(
        loggerMock.create(),
        experimentalFeatures
      );

      productFeaturesService.setup(coreSetup, pluginsSetup);

      const mockIsActionRegistered = MockedProductFeatures.mock.instances[0]
        .isActionRegistered as jest.Mock;

      // Set up mock return values
      mockIsActionRegistered.mockReturnValueOnce(true).mockReturnValueOnce(false);

      // Test delegating to isActionRegistered
      expect(productFeaturesService.isActionRegistered('action1')).toBe(true);
      expect(productFeaturesService.isActionRegistered('action2')).toBe(false);

      // Verify the delegated calls
      expect(mockIsActionRegistered).toHaveBeenCalledWith('action1');
      expect(mockIsActionRegistered).toHaveBeenCalledWith('action2');
    });
  });

  describe('registerApiAccessControl', () => {
    let lastRegisteredFn: OnPostAuthHandler;
    coreSetup.http.registerOnPostAuth.mockImplementation((fn) => {
      lastRegisteredFn = fn;
    });

    const res = { notFound: jest.fn() } as unknown as LifecycleResponseFactory;
    const toolkit = httpServiceMock.createOnPostAuthToolkit();

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should register api authorization http route interceptor', () => {
      const experimentalFeatures = {} as ExperimentalFeatures;
      const productFeaturesService = new ProductFeaturesService(
        loggerMock.create(),
        experimentalFeatures
      );
      productFeaturesService.setup(coreSetup, pluginsSetup);

      expect(coreSetup.http.registerOnPostAuth).toHaveBeenCalledTimes(1);
    });

    describe('when using productFeature tag', () => {
      const getReq = (tags: string[] = []) =>
        ({
          route: { options: { tags } },
          url: { pathname: '', search: '' },
        } as unknown as KibanaRequest);

      it('should check when productFeature tag when it matches and return not found when not enabled', async () => {
        const experimentalFeatures = {} as ExperimentalFeatures;
        const productFeaturesService = new ProductFeaturesService(
          loggerMock.create(),
          experimentalFeatures
        );
        productFeaturesService.setup(coreSetup, pluginsSetup);

        productFeaturesService.isEnabled = jest.fn().mockReturnValueOnce(false);

        await lastRegisteredFn(getReq(['securitySolutionProductFeature:foo']), res, toolkit);

        expect(productFeaturesService.isEnabled).toHaveBeenCalledWith('foo');
        expect(res.notFound).toHaveBeenCalledTimes(1);
        expect(toolkit.next).not.toHaveBeenCalled();
      });

      it('should check when productFeature tag when it matches and continue when enabled', async () => {
        const experimentalFeatures = {} as ExperimentalFeatures;
        const productFeaturesService = new ProductFeaturesService(
          loggerMock.create(),
          experimentalFeatures
        );
        productFeaturesService.setup(coreSetup, pluginsSetup);

        productFeaturesService.isEnabled = jest.fn().mockReturnValueOnce(true);

        await lastRegisteredFn(getReq(['securitySolutionProductFeature:foo']), res, toolkit);

        expect(productFeaturesService.isEnabled).toHaveBeenCalledWith('foo');
        expect(res.notFound).not.toHaveBeenCalled();
        expect(toolkit.next).toHaveBeenCalledTimes(1);
      });
    });

    // Documentation: https://docs.elastic.dev/kibana-dev-docs/key-concepts/security-api-authorization
    describe('when using authorization', () => {
      let productFeaturesService: ProductFeaturesService;
      let mockIsActionRegistered: jest.Mock;

      beforeEach(() => {
        const experimentalFeatures = {} as ExperimentalFeatures;
        productFeaturesService = new ProductFeaturesService(
          loggerMock.create(),
          experimentalFeatures
        );
        productFeaturesService.setup(coreSetup, pluginsSetup);
        mockIsActionRegistered = MockedProductFeatures.mock.instances[0]
          .isActionRegistered as jest.Mock;
      });

      describe('when using security authz', () => {
        beforeEach(() => {
          mockIsActionRegistered.mockImplementation((action: string) => action.includes('enabled'));
        });

        const getReq = (requiredPrivileges?: AuthzEnabled['requiredPrivileges']) =>
          ({
            route: { options: { security: { authz: { requiredPrivileges } } } },
            url: { pathname: '', search: '' },
          } as unknown as KibanaRequest);

        it('should authorize when no privilege matches', async () => {
          await lastRegisteredFn(getReq(['something', 'securitySolution']), res, toolkit);

          expect(mockIsActionRegistered).not.toHaveBeenCalled();
          expect(res.notFound).not.toHaveBeenCalled();
          expect(toolkit.next).toHaveBeenCalledTimes(1);
        });

        it('should check when privilege matches and return not found when not action registered', async () => {
          await lastRegisteredFn(getReq(['securitySolution-disabled']), res, toolkit);

          expect(mockIsActionRegistered).toHaveBeenCalledWith('api:securitySolution-disabled');
          expect(res.notFound).toHaveBeenCalledTimes(1);
          expect(toolkit.next).not.toHaveBeenCalled();
        });

        it('should check when privilege matches and continue when action registered', async () => {
          mockIsActionRegistered.mockReturnValueOnce(true);
          await lastRegisteredFn(getReq(['securitySolution-enabled']), res, toolkit);

          expect(mockIsActionRegistered).toHaveBeenCalledWith('api:securitySolution-enabled');
          expect(res.notFound).not.toHaveBeenCalled();
          expect(toolkit.next).toHaveBeenCalledTimes(1);
        });

        it('should restrict access when one action is not registered', async () => {
          mockIsActionRegistered.mockReturnValueOnce(true);
          await lastRegisteredFn(
            getReq([
              'securitySolution-enabled',
              'securitySolution-disabled',
              'securitySolution-enabled2',
            ]),
            res,
            toolkit
          );

          expect(mockIsActionRegistered).toHaveBeenCalledTimes(2);
          expect(mockIsActionRegistered).toHaveBeenCalledWith('api:securitySolution-enabled');
          expect(mockIsActionRegistered).toHaveBeenCalledWith('api:securitySolution-disabled');

          expect(res.notFound).toHaveBeenCalledTimes(1);
          expect(toolkit.next).not.toHaveBeenCalled();
        });

        describe('when using nested requiredPrivileges', () => {
          describe('when using allRequired', () => {
            it('should allow access when all actions are registered', async () => {
              const req = getReq([
                {
                  allRequired: [
                    'securitySolution-enabled',
                    'securitySolution-enabled2',
                    'securitySolution-enabled3',
                  ],
                },
              ]);
              await lastRegisteredFn(req, res, toolkit);

              expect(mockIsActionRegistered).toHaveBeenCalledTimes(3);
              expect(mockIsActionRegistered).toHaveBeenCalledWith('api:securitySolution-enabled');
              expect(mockIsActionRegistered).toHaveBeenCalledWith('api:securitySolution-enabled2');
              expect(mockIsActionRegistered).toHaveBeenCalledWith('api:securitySolution-enabled3');

              expect(res.notFound).not.toHaveBeenCalled();
              expect(toolkit.next).toHaveBeenCalledTimes(1);
            });

            it('should allow access when all actions are registered with nested anyOf', async () => {
              const req = getReq([
                {
                  allRequired: [
                    { anyOf: ['securitySolution-enabled', 'securitySolution-enabled2'] },
                    'securitySolution-enabled3',
                  ],
                },
              ]);
              await lastRegisteredFn(req, res, toolkit);

              expect(mockIsActionRegistered).toHaveBeenCalledTimes(2);
              expect(mockIsActionRegistered).toHaveBeenCalledWith('api:securitySolution-enabled');
              expect(mockIsActionRegistered).toHaveBeenCalledWith('api:securitySolution-enabled3');

              expect(res.notFound).not.toHaveBeenCalled();
              expect(toolkit.next).toHaveBeenCalledTimes(1);
            });

            it('should restrict access if one action is not registered', async () => {
              const req = getReq([
                {
                  allRequired: [
                    'securitySolution-enabled',
                    'securitySolution-disabled',
                    'securitySolution-notCalled',
                  ],
                },
              ]);
              await lastRegisteredFn(req, res, toolkit);

              expect(mockIsActionRegistered).toHaveBeenCalledTimes(2);
              expect(mockIsActionRegistered).toHaveBeenCalledWith('api:securitySolution-enabled');
              expect(mockIsActionRegistered).toHaveBeenCalledWith('api:securitySolution-disabled');

              expect(res.notFound).toHaveBeenCalledTimes(1);
              expect(toolkit.next).not.toHaveBeenCalled();
            });

            it('should allow only based on security privileges and ignore non-security', async () => {
              const req = getReq([
                { allRequired: ['notSecurityPrivilege', 'securitySolution-enabled'] },
              ]);
              await lastRegisteredFn(req, res, toolkit);

              expect(mockIsActionRegistered).toHaveBeenCalledTimes(1);
              expect(mockIsActionRegistered).toHaveBeenCalledWith('api:securitySolution-enabled');

              expect(res.notFound).not.toHaveBeenCalled();
              expect(toolkit.next).toHaveBeenCalledTimes(1);
            });

            it('should restrict only based on security privileges and ignore non-security', async () => {
              const req = getReq([
                { allRequired: ['notSecurityPrivilege', 'securitySolution-disabled'] },
              ]);
              await lastRegisteredFn(req, res, toolkit);

              expect(mockIsActionRegistered).toHaveBeenCalledTimes(1);
              expect(mockIsActionRegistered).toHaveBeenCalledWith('api:securitySolution-disabled');

              expect(res.notFound).toHaveBeenCalledTimes(1);
              expect(toolkit.next).not.toHaveBeenCalled();
            });

            it('should restrict only based on security privileges and ignore non-security with nested anyOf', async () => {
              const req = getReq([
                {
                  allRequired: [
                    { anyOf: ['securitySolution-disabled', 'securitySolution-disabled2'] },
                    'notSecurityPrivilege',
                  ],
                },
              ]);
              await lastRegisteredFn(req, res, toolkit);

              expect(mockIsActionRegistered).toHaveBeenCalledTimes(2);
              expect(mockIsActionRegistered).toHaveBeenCalledWith('api:securitySolution-disabled');
              expect(mockIsActionRegistered).toHaveBeenCalledWith('api:securitySolution-disabled2');

              expect(res.notFound).toHaveBeenCalledTimes(1);
              expect(toolkit.next).not.toHaveBeenCalled();
            });
          });

          describe('when using anyRequired', () => {
            it('should allow access when one action is registered', async () => {
              const req = getReq([
                {
                  anyRequired: [
                    'securitySolution-disabled',
                    'securitySolution-enabled',
                    'securitySolution-notCalled',
                  ],
                },
              ]);
              await lastRegisteredFn(req, res, toolkit);

              expect(mockIsActionRegistered).toHaveBeenCalledTimes(2);
              expect(mockIsActionRegistered).toHaveBeenCalledWith('api:securitySolution-disabled');
              expect(mockIsActionRegistered).toHaveBeenCalledWith('api:securitySolution-enabled');

              expect(res.notFound).not.toHaveBeenCalled();
              expect(toolkit.next).toHaveBeenCalledTimes(1);
            });

            it('should allow access when one action is registered with nested allOf', async () => {
              const req = getReq([
                {
                  anyRequired: [
                    { allOf: ['securitySolution-disabled2', 'securitySolution-disabled'] },
                    'securitySolution-enabled',
                    'securitySolution-notCalled',
                  ],
                },
              ]);
              await lastRegisteredFn(req, res, toolkit);

              expect(mockIsActionRegistered).toHaveBeenCalledTimes(2);
              expect(mockIsActionRegistered).toHaveBeenCalledWith('api:securitySolution-disabled2');
              expect(mockIsActionRegistered).toHaveBeenCalledWith('api:securitySolution-enabled');

              expect(res.notFound).not.toHaveBeenCalled();
              expect(toolkit.next).toHaveBeenCalledTimes(1);
            });

            it('should restrict access when no action is registered', async () => {
              const req = getReq([
                {
                  anyRequired: ['securitySolution-disabled', 'securitySolution-disabled2'],
                },
              ]);
              await lastRegisteredFn(req, res, toolkit);

              expect(mockIsActionRegistered).toHaveBeenCalledTimes(2);
              expect(mockIsActionRegistered).toHaveBeenCalledWith('api:securitySolution-disabled');
              expect(mockIsActionRegistered).toHaveBeenCalledWith('api:securitySolution-disabled2');

              expect(res.notFound).toHaveBeenCalledTimes(1);
              expect(toolkit.next).not.toHaveBeenCalled();
            });

            it('should restrict access when no action is registered with nested allOf', async () => {
              const req = getReq([
                {
                  anyRequired: [
                    { allOf: ['notSecurityPrivilege', 'securitySolution-disabled2'] },
                    { allOf: ['notSecurityPrivilege2', 'securitySolution-disabled'] },
                  ],
                },
              ]);
              await lastRegisteredFn(req, res, toolkit);

              expect(mockIsActionRegistered).toHaveBeenCalledTimes(2);
              expect(mockIsActionRegistered).toHaveBeenCalledWith('api:securitySolution-disabled');
              expect(mockIsActionRegistered).toHaveBeenCalledWith('api:securitySolution-disabled2');

              expect(res.notFound).toHaveBeenCalledTimes(1);
              expect(toolkit.next).not.toHaveBeenCalled();
            });

            it('should restrict only based on security privileges and allow when non-security privilege is present', async () => {
              const req = getReq([
                {
                  anyRequired: ['notSecurityPrivilege', 'securitySolution-disabled'],
                },
              ]);
              await lastRegisteredFn(req, res, toolkit);

              expect(mockIsActionRegistered).not.toHaveBeenCalled();

              expect(res.notFound).not.toHaveBeenCalled();
              expect(toolkit.next).toHaveBeenCalledTimes(1);
            });
          });
        });
      });
    });
  });
});
