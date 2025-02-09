/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProductFeaturesService } from './product_features_service';
import { ProductFeatures } from './product_features';
import type {
  ProductFeaturesConfig,
  BaseKibanaFeatureConfig,
  ProductFeaturesConfigurator,
} from '@kbn/security-solution-features';
import { loggerMock } from '@kbn/logging-mocks';
import type { ExperimentalFeatures } from '../../../common';
import { featuresPluginMock } from '@kbn/features-plugin/server/mocks';
import type {
  AssistantSubFeatureId,
  CasesSubFeatureId,
  SecuritySubFeatureId,
} from '@kbn/security-solution-features/keys';
import { ProductFeatureKey } from '@kbn/security-solution-features/keys';
import { httpServiceMock } from '@kbn/core-http-server-mocks';
import type {
  AuthzEnabled,
  KibanaRequest,
  LifecycleResponseFactory,
  OnPostAuthHandler,
} from '@kbn/core-http-server';

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
  getCasesFeature: () => mockGetFeature(),
  getCasesV2Feature: () => mockGetFeature(),
  getCasesV3Feature: () => mockGetFeature(),
  getAttackDiscoveryFeature: () => mockGetFeature(),
  getAssistantFeature: () => mockGetFeature(),
  getTimelineFeature: () => mockGetFeature(),
  getNotesFeature: () => mockGetFeature(),
  getSiemMigrationsFeature: () => mockGetFeature(),
}));

describe('ProductFeaturesService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create ProductFeatureService instance', () => {
    const experimentalFeatures = {} as ExperimentalFeatures;
    new ProductFeaturesService(loggerMock.create(), experimentalFeatures);

    expect(mockGetFeature).toHaveBeenCalledTimes(10);
    expect(MockedProductFeatures).toHaveBeenCalledTimes(10);
  });

  it('should init all ProductFeatures when initialized', () => {
    const experimentalFeatures = {} as ExperimentalFeatures;
    const productFeaturesService = new ProductFeaturesService(
      loggerMock.create(),
      experimentalFeatures
    );

    const featuresSetup = featuresPluginMock.createSetup();
    productFeaturesService.init(featuresSetup);

    expect(MockedProductFeatures.mock.instances[0].init).toHaveBeenCalledWith(featuresSetup);
    expect(MockedProductFeatures.mock.instances[1].init).toHaveBeenCalledWith(featuresSetup);
    expect(MockedProductFeatures.mock.instances[2].init).toHaveBeenCalledWith(featuresSetup);
  });

  it('should configure ProductFeatures', () => {
    const experimentalFeatures = {} as ExperimentalFeatures;
    const productFeaturesService = new ProductFeaturesService(
      loggerMock.create(),
      experimentalFeatures
    );

    const featuresSetup = featuresPluginMock.createSetup();
    productFeaturesService.init(featuresSetup);

    const mockSecurityConfig = new Map() as ProductFeaturesConfig<SecuritySubFeatureId>;
    const mockCasesConfig = new Map() as ProductFeaturesConfig<CasesSubFeatureId>;
    const mockAssistantConfig = new Map() as ProductFeaturesConfig<AssistantSubFeatureId>;
    const mockAttackDiscoveryConfig = new Map() as ProductFeaturesConfig;
    const mockSiemMigrationsConfig = new Map() as ProductFeaturesConfig;
    const mockTimelineConfig = new Map() as ProductFeaturesConfig;
    const mockNotesConfig = new Map() as ProductFeaturesConfig;

    const configurator: ProductFeaturesConfigurator = {
      security: jest.fn(() => mockSecurityConfig),
      cases: jest.fn(() => mockCasesConfig),
      securityAssistant: jest.fn(() => mockAssistantConfig),
      attackDiscovery: jest.fn(() => mockAttackDiscoveryConfig),
      siemMigrations: jest.fn(() => mockSiemMigrationsConfig),
      timeline: jest.fn(() => mockTimelineConfig),
      notes: jest.fn(() => mockNotesConfig),
    };
    productFeaturesService.setProductFeaturesConfigurator(configurator);

    expect(configurator.security).toHaveBeenCalled();
    expect(configurator.cases).toHaveBeenCalled();
    expect(configurator.securityAssistant).toHaveBeenCalled();
    expect(configurator.attackDiscovery).toHaveBeenCalled();
    expect(configurator.siemMigrations).toHaveBeenCalled();

    expect(MockedProductFeatures.mock.instances[0].setConfig).toHaveBeenCalledWith(
      mockSecurityConfig
    );
    expect(MockedProductFeatures.mock.instances[1].setConfig).toHaveBeenCalledWith(mockCasesConfig);
    expect(MockedProductFeatures.mock.instances[2].setConfig).toHaveBeenCalledWith(
      mockAssistantConfig
    );
    expect(MockedProductFeatures.mock.instances[3].setConfig).toHaveBeenCalledWith(
      mockAttackDiscoveryConfig
    );
    expect(MockedProductFeatures.mock.instances[3].setConfig).toHaveBeenCalledWith(
      mockSiemMigrationsConfig
    );
  });

  it('should return isEnabled for enabled features', () => {
    const experimentalFeatures = {} as ExperimentalFeatures;
    const productFeaturesService = new ProductFeaturesService(
      loggerMock.create(),
      experimentalFeatures
    );

    const featuresSetup = featuresPluginMock.createSetup();
    productFeaturesService.init(featuresSetup);

    const mockSecurityConfig = new Map([
      [ProductFeatureKey.advancedInsights, {}],
      [ProductFeatureKey.endpointExceptions, {}],
    ]) as ProductFeaturesConfig<SecuritySubFeatureId>;
    const mockCasesConfig = new Map([
      [ProductFeatureKey.casesConnectors, {}],
    ]) as ProductFeaturesConfig<CasesSubFeatureId>;
    const mockAssistantConfig = new Map([
      [ProductFeatureKey.assistant, {}],
    ]) as ProductFeaturesConfig<AssistantSubFeatureId>;
    const mockAttackDiscoveryConfig = new Map([
      [ProductFeatureKey.attackDiscovery, {}],
    ]) as ProductFeaturesConfig;
    const mockSiemMigrationsConfig = new Map([
      [ProductFeatureKey.siemMigrations, {}],
    ]) as ProductFeaturesConfig;
    const mockTimelineConfig = new Map([[ProductFeatureKey.timeline, {}]]) as ProductFeaturesConfig;
    const mockNotesConfig = new Map([[ProductFeatureKey.notes, {}]]) as ProductFeaturesConfig;

    const configurator: ProductFeaturesConfigurator = {
      security: jest.fn(() => mockSecurityConfig),
      cases: jest.fn(() => mockCasesConfig),
      securityAssistant: jest.fn(() => mockAssistantConfig),
      attackDiscovery: jest.fn(() => mockAttackDiscoveryConfig),
      siemMigrations: jest.fn(() => mockSiemMigrationsConfig),
      timeline: jest.fn(() => mockTimelineConfig),
      notes: jest.fn(() => mockNotesConfig),
    };
    productFeaturesService.setProductFeaturesConfigurator(configurator);

    expect(productFeaturesService.isEnabled(ProductFeatureKey.advancedInsights)).toEqual(true);
    expect(productFeaturesService.isEnabled(ProductFeatureKey.endpointExceptions)).toEqual(true);
    expect(productFeaturesService.isEnabled(ProductFeatureKey.casesConnectors)).toEqual(true);
    expect(productFeaturesService.isEnabled(ProductFeatureKey.assistant)).toEqual(true);
    expect(productFeaturesService.isEnabled(ProductFeatureKey.attackDiscovery)).toEqual(true);
    expect(productFeaturesService.isEnabled(ProductFeatureKey.siemMigrations)).toEqual(true);
    expect(productFeaturesService.isEnabled(ProductFeatureKey.externalRuleActions)).toEqual(false);
  });

  it('should call isApiPrivilegeEnabled for api actions', () => {
    const experimentalFeatures = {} as ExperimentalFeatures;
    const productFeaturesService = new ProductFeaturesService(
      loggerMock.create(),
      experimentalFeatures
    );

    productFeaturesService.isApiPrivilegeEnabled('writeEndpointExceptions');

    expect(MockedProductFeatures.mock.instances[0].isActionRegistered).toHaveBeenCalledWith(
      'api:securitySolution-writeEndpointExceptions'
    );
    expect(MockedProductFeatures.mock.instances[1].isActionRegistered).toHaveBeenCalledWith(
      'api:securitySolution-writeEndpointExceptions'
    );
    expect(MockedProductFeatures.mock.instances[2].isActionRegistered).toHaveBeenCalledWith(
      'api:securitySolution-writeEndpointExceptions'
    );
  });

  describe('registerApiAccessControl', () => {
    const mockHttpSetup = httpServiceMock.createSetupContract();
    let lastRegisteredFn: OnPostAuthHandler;
    mockHttpSetup.registerOnPostAuth.mockImplementation((fn) => {
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
      productFeaturesService.registerApiAccessControl(mockHttpSetup);

      expect(mockHttpSetup.registerOnPostAuth).toHaveBeenCalledTimes(1);
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
        productFeaturesService.registerApiAccessControl(mockHttpSetup);

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
        productFeaturesService.registerApiAccessControl(mockHttpSetup);

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
        productFeaturesService.registerApiAccessControl(mockHttpSetup);
        mockIsActionRegistered = MockedProductFeatures.mock.instances[0]
          .isActionRegistered as jest.Mock;
      });

      describe('when using access tag', () => {
        const getReq = (tags: string[] = []) =>
          ({
            route: { options: { tags } },
            url: { pathname: '', search: '' },
          } as unknown as KibanaRequest);

        it('should authorize when no tag matches', async () => {
          await lastRegisteredFn(
            getReq(['access:something', 'access:securitySolution']),
            res,
            toolkit
          );

          expect(mockIsActionRegistered).not.toHaveBeenCalled();
          expect(res.notFound).not.toHaveBeenCalled();
          expect(toolkit.next).toHaveBeenCalledTimes(1);
        });

        it('should check when tag matches and return not found when not action registered', async () => {
          mockIsActionRegistered.mockReturnValueOnce(false);
          await lastRegisteredFn(getReq(['access:securitySolution-foo']), res, toolkit);

          expect(mockIsActionRegistered).toHaveBeenCalledWith('api:securitySolution-foo');
          expect(res.notFound).toHaveBeenCalledTimes(1);
          expect(toolkit.next).not.toHaveBeenCalled();
        });

        it('should check when tag matches and continue when action registered', async () => {
          mockIsActionRegistered.mockReturnValueOnce(true);
          await lastRegisteredFn(getReq(['access:securitySolution-foo']), res, toolkit);

          expect(mockIsActionRegistered).toHaveBeenCalledWith('api:securitySolution-foo');
          expect(res.notFound).not.toHaveBeenCalled();
          expect(toolkit.next).toHaveBeenCalledTimes(1);
        });
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
