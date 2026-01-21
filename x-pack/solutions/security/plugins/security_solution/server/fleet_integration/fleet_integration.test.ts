/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExceptionListSchema } from '@kbn/securitysolution-io-ts-list-types';

import type { ElasticsearchClientMock } from '@kbn/core/server/mocks';
import {
  elasticsearchServiceMock,
  httpServerMock,
  savedObjectsClientMock,
} from '@kbn/core/server/mocks';
import {
  createNewPackagePolicyMock,
  deletePackagePolicyMock,
} from '@kbn/fleet-plugin/common/mocks';
import { cloudMock } from '@kbn/cloud-plugin/server/mocks';
import {
  policyFactory,
  policyFactoryWithoutPaidFeatures,
  policyFactoryWithoutPaidEnterpriseFeatures,
} from '../../common/endpoint/models/policy_config';
import { buildManifestManagerMock } from '../endpoint/services/artifacts/manifest_manager/manifest_manager.mock';
import {
  getAgentPolicyCreateCallback,
  getAgentPolicyUpdateCallback,
  getPackagePolicyCreateCallback,
  getPackagePolicyDeleteCallback,
  getPackagePolicyPostCreateCallback,
  getPackagePolicyUpdateCallback,
} from './fleet_integration';
import type { KibanaRequest, Logger, RequestHandlerContext } from '@kbn/core/server';
import {
  ALL_PRODUCT_FEATURE_KEYS,
  ProductFeatureSecurityKey,
} from '@kbn/security-solution-features/keys';
import { requestContextMock } from '../lib/detection_engine/routes/__mocks__';
import { requestContextFactoryMock } from '../request_context_factory.mock';
import type { EndpointAppContextServiceStartContract } from '../endpoint/endpoint_app_context_services';
import {
  createMockEndpointAppContextService,
  createMockEndpointAppContextServiceStartContract,
} from '../endpoint/mocks';
import { licenseMock } from '@kbn/licensing-plugin/common/licensing.mock';
import { LicenseService } from '../../common/license';
import { Subject } from 'rxjs';
import type { ILicense } from '@kbn/licensing-types';
import { EndpointDocGenerator } from '../../common/endpoint/generate_data';
import type { PolicyConfig, PolicyData } from '../../common/endpoint/types';
import { AntivirusRegistrationModes, ProtectionModes } from '../../common/endpoint/types';
import { getExceptionListClientMock } from '@kbn/lists-plugin/server/services/exception_lists/exception_list_client.mock';
import { getExceptionListSchemaMock } from '@kbn/lists-plugin/common/schemas/response/exception_list_schema.mock';
import type { ExceptionListClient } from '@kbn/lists-plugin/server';
import type { InternalArtifactCompleteSchema } from '../endpoint/schemas/artifacts';
import { ManifestManager } from '../endpoint/services/artifacts/manifest_manager';
import { getMockArtifacts, toArtifactRecords } from '../endpoint/lib/artifacts/mocks';
import { Manifest } from '../endpoint/lib/artifacts';
import type {
  NewPackagePolicy,
  PackagePolicy,
  UpdatePackagePolicy,
} from '@kbn/fleet-plugin/common/types/models';
import type { ManifestSchema } from '../../common/endpoint/schema/manifest';
import type {
  GetAgentPoliciesResponseItem,
  PostDeletePackagePoliciesResponse,
} from '@kbn/fleet-plugin/common';
import { createMockPolicyData } from '../endpoint/services/feature_usage/mocks';
import { ALL_ENDPOINT_ARTIFACT_LIST_IDS } from '../../common/endpoint/service/artifacts/constants';
import { ENDPOINT_ARTIFACT_LISTS } from '@kbn/securitysolution-list-constants';
import * as PolicyConfigHelpers from '../../common/endpoint/models/policy_config_helpers';
import { disableProtections } from '../../common/endpoint/models/policy_config_helpers';
import type { ProductFeaturesService } from '../lib/product_features_service/product_features_service';
import { createProductFeaturesServiceMock } from '../lib/product_features_service/mocks';
import * as moment from 'moment';
import type {
  PostAgentPolicyCreateCallback,
  PostPackagePolicyPostCreateCallback,
  PutPackagePolicyUpdateCallback,
} from '@kbn/fleet-plugin/server/types';
import type { EndpointMetadataService } from '../endpoint/services/metadata';
import { createEndpointMetadataServiceTestContextMock } from '../endpoint/services/metadata/mocks';
import { createPolicyDataStreamsIfNeeded as _createPolicyDataStreamsIfNeeded } from './handlers/create_policy_datastreams';
import { createTelemetryConfigProviderMock } from '../../common/telemetry_config/mocks';
import { FleetPackagePolicyGenerator } from '../../common/endpoint/data_generators/fleet_package_policy_generator';
import { RESPONSE_ACTIONS_SUPPORTED_INTEGRATION_TYPES } from '../../common/endpoint/service/response_actions/constants';
import { pick } from 'lodash';
import { ENDPOINT_ACTIONS_INDEX } from '../../common/endpoint/constants';
import type { ExperimentalFeatures } from '../../common';
import type { IRequestContextFactory } from '../request_context_factory';
import { installEndpointSecurityPrebuiltRule as _installEndpointSecurityPrebuiltRule } from '../lib/detection_engine/prebuilt_rules/logic/integrations/install_endpoint_security_prebuilt_rule';

const installEndpointSecurityPrebuiltRuleMock = _installEndpointSecurityPrebuiltRule as jest.Mock;

jest.mock(
  '../lib/detection_engine/prebuilt_rules/logic/integrations/install_endpoint_security_prebuilt_rule',
  () => {
    const actualModule = jest.requireActual(
      '../lib/detection_engine/prebuilt_rules/logic/integrations/install_endpoint_security_prebuilt_rule'
    );

    return {
      ...actualModule,
      installEndpointSecurityPrebuiltRule: jest.fn(
        actualModule.installEndpointSecurityPrebuiltRule
      ),
    };
  }
);

jest.mock('uuid', () => ({
  v4: (): string => 'NEW_UUID',
}));

jest.mock('./handlers/create_policy_datastreams', () => {
  const actualModule = jest.requireActual('./handlers/create_policy_datastreams');

  return {
    ...actualModule,
    createPolicyDataStreamsIfNeeded: jest.fn(async () => {}),
  };
});

const createPolicyDataStreamsIfNeededMock =
  _createPolicyDataStreamsIfNeeded as unknown as jest.Mock;

describe('Fleet integrations', () => {
  let endpointAppContextStartContract: EndpointAppContextServiceStartContract;
  let req: KibanaRequest;
  let ctx: ReturnType<typeof requestContextMock.create>;
  const exceptionListClient: ExceptionListClient = getExceptionListClientMock();
  let licenseEmitter: Subject<ILicense>;
  let licenseService: LicenseService;
  const Platinum = licenseMock.createLicense({
    license: { type: 'platinum', mode: 'platinum', uid: 'updated-uid' },
  });
  const Gold = licenseMock.createLicense({
    license: { type: 'gold', mode: 'gold', uid: 'updated-uid' },
  });
  const Enterprise = licenseMock.createLicense({
    license: { type: 'enterprise', uid: 'updated-uid' },
  });
  const generator = new EndpointDocGenerator();
  const cloudService = cloudMock.createSetup();
  const telemetryConfigProviderMock = createTelemetryConfigProviderMock();
  let productFeaturesService: ProductFeaturesService;
  let endpointMetadataService: EndpointMetadataService;
  let logger: Logger;
  let experimentalFeatures: ExperimentalFeatures;

  beforeEach(() => {
    endpointAppContextStartContract = createMockEndpointAppContextServiceStartContract();
    ctx = requestContextMock.createTools().context;
    req = httpServerMock.createKibanaRequest();
    licenseEmitter = new Subject();
    licenseService = new LicenseService();
    licenseService.start(licenseEmitter);
    experimentalFeatures = {
      trustedDevices: true,
      linuxDnsEvents: true,
    } as ExperimentalFeatures;
    productFeaturesService = endpointAppContextStartContract.productFeaturesService;

    const metadataMocks = createEndpointMetadataServiceTestContextMock();
    logger = metadataMocks.logger;
    endpointMetadataService = metadataMocks.endpointMetadataService;

    jest
      .spyOn(endpointMetadataService, 'getFleetEndpointPackagePolicy')
      .mockResolvedValue(createMockPolicyData());
  });

  afterEach(() => {
    licenseService.stop();
    licenseEmitter.complete();
    jest.clearAllMocks();
  });

  describe('package policy create callback', () => {
    let soClient: ReturnType<typeof savedObjectsClientMock.create>;
    let esClient: ReturnType<typeof elasticsearchServiceMock.createClusterClient>['asInternalUser'];
    let securitySolutionRequestContextFactory: jest.Mocked<IRequestContextFactory>;
    let endpointServicesMock: ReturnType<typeof createMockEndpointAppContextService>;

    const invokeCallback = async (manifestManager: ManifestManager): Promise<NewPackagePolicy> => {
      const callback = getPackagePolicyCreateCallback(
        logger,
        manifestManager,
        securitySolutionRequestContextFactory,
        endpointAppContextStartContract.alerting,
        licenseService,
        cloudService,
        productFeaturesService,
        telemetryConfigProviderMock,
        experimentalFeatures
      );

      return callback(
        createNewPackagePolicyMock(),
        soClient,
        esClient,
        requestContextMock.convertContext(ctx),
        req
      );
    };

    beforeEach(async () => {
      soClient = savedObjectsClientMock.create();
      esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
      endpointServicesMock = createMockEndpointAppContextService();
      securitySolutionRequestContextFactory = requestContextFactoryMock.create();
      const reqContextMock = await securitySolutionRequestContextFactory.create(
        ctx as unknown as RequestHandlerContext,
        req
      );
      (reqContextMock.getEndpointService as jest.Mock).mockReturnValue(endpointServicesMock);
      securitySolutionRequestContextFactory.create.mockReturnValue(Promise.resolve(reqContextMock));
    });

    describe('SIEM rule install', () => {
      it('should call utility to install SIEM prebuilt rule', async () => {
        await invokeCallback(buildManifestManagerMock());

        expect(installEndpointSecurityPrebuiltRuleMock).toHaveBeenCalled();
      });

      it('should not call utility to install SIEM prebuilt rule when server config setting is enabled', async () => {
        (endpointServicesMock.getServerConfigValue as jest.Mock).mockReturnValue(true);
        await invokeCallback(buildManifestManagerMock());

        expect(installEndpointSecurityPrebuiltRuleMock).not.toHaveBeenCalled();
      });
    });

    describe('Artifacts manifest initialisation', () => {
      const createNewEndpointPolicyInput = (
        manifest: ManifestSchema,
        license = 'platinum',
        cloud = cloudService.isCloudEnabled,
        licenseUuid = 'updated-uid',
        clusterUuid = '',
        clusterName = '',
        isServerlessEnabled = cloudService.isServerlessEnabled,
        isTelemetryEnabled = true
      ) => ({
        type: 'endpoint',
        enabled: true,
        streams: [],
        config: {
          integration_config: {},
          policy: {
            value: disableProtections(
              policyFactory({
                license,
                cloud,
                licenseUuid,
                clusterUuid,
                clusterName,
                serverless: isServerlessEnabled,
                isGlobalTelemetryEnabled: isTelemetryEnabled,
              })
            ),
          },
          artifact_manifest: { value: manifest },
        },
      });

      const TEST_POLICY_ID_1 = 'c6d16e42-c32d-4dce-8a88-113cfe276ad1';
      const TEST_POLICY_ID_2 = '93c46720-c217-11ea-9906-b5b8a21b268e';
      const ARTIFACT_NAME_EXCEPTIONS_MACOS = 'endpoint-exceptionlist-macos-v1';
      const ARTIFACT_NAME_TRUSTED_APPS_MACOS = 'endpoint-trustlist-macos-v1';
      const ARTIFACT_NAME_TRUSTED_APPS_WINDOWS = 'endpoint-trustlist-windows-v1';
      let ARTIFACT_EXCEPTIONS_MACOS: InternalArtifactCompleteSchema;
      let ARTIFACT_EXCEPTIONS_WINDOWS: InternalArtifactCompleteSchema;
      let ARTIFACT_TRUSTED_APPS_MACOS: InternalArtifactCompleteSchema;
      let ARTIFACT_TRUSTED_APPS_WINDOWS: InternalArtifactCompleteSchema;

      beforeAll(async () => {
        const artifacts = await getMockArtifacts();
        ARTIFACT_EXCEPTIONS_MACOS = artifacts[0];
        ARTIFACT_EXCEPTIONS_WINDOWS = artifacts[1];
        ARTIFACT_TRUSTED_APPS_MACOS = artifacts[3];
        ARTIFACT_TRUSTED_APPS_WINDOWS = artifacts[4];
      });

      beforeEach(() => {
        licenseEmitter.next(Platinum); // set license level to platinum
      });

      test('default manifest is taken when there is none and there are errors building new one', async () => {
        const manifestManager = buildManifestManagerMock();
        manifestManager.getLastComputedManifest = jest.fn().mockResolvedValue(null);
        manifestManager.buildNewManifest = jest.fn().mockRejectedValue(new Error());

        expect((await invokeCallback(manifestManager)).inputs[0]).toStrictEqual(
          createNewEndpointPolicyInput({
            artifacts: {},
            manifest_version: '1.0.0',
            schema_version: 'v1',
          })
        );

        expect(manifestManager.buildNewManifest).toHaveBeenCalledWith();
        expect(manifestManager.pushArtifacts).not.toHaveBeenCalled();
        expect(manifestManager.commit).not.toHaveBeenCalled();
      });

      test('default manifest is taken when there is none and there are errors pushing artifacts', async () => {
        const newManifest = ManifestManager.createDefaultManifest();
        newManifest.addEntry(ARTIFACT_EXCEPTIONS_MACOS);

        const manifestManager = buildManifestManagerMock();
        manifestManager.getLastComputedManifest = jest.fn().mockResolvedValue(null);
        manifestManager.buildNewManifest = jest.fn().mockResolvedValue(newManifest);
        manifestManager.pushArtifacts = jest.fn().mockResolvedValue([new Error()]);

        expect((await invokeCallback(manifestManager)).inputs[0]).toStrictEqual(
          createNewEndpointPolicyInput({
            artifacts: {},
            manifest_version: '1.0.0',
            schema_version: 'v1',
          })
        );

        expect(manifestManager.buildNewManifest).toHaveBeenCalledWith();
        expect(manifestManager.pushArtifacts).toHaveBeenCalledWith(
          [ARTIFACT_EXCEPTIONS_MACOS],
          newManifest
        );
        expect(manifestManager.commit).not.toHaveBeenCalled();
      });

      test('default manifest is taken when there is none and there are errors commiting manifest', async () => {
        const newManifest = ManifestManager.createDefaultManifest();
        newManifest.addEntry(ARTIFACT_EXCEPTIONS_MACOS);

        const manifestManager = buildManifestManagerMock();
        manifestManager.getLastComputedManifest = jest.fn().mockResolvedValue(null);
        manifestManager.buildNewManifest = jest.fn().mockResolvedValue(newManifest);
        manifestManager.pushArtifacts = jest.fn().mockResolvedValue([]);
        manifestManager.commit = jest.fn().mockRejectedValue(new Error());

        expect((await invokeCallback(manifestManager)).inputs[0]).toStrictEqual(
          createNewEndpointPolicyInput({
            artifacts: {},
            manifest_version: '1.0.0',
            schema_version: 'v1',
          })
        );

        expect(manifestManager.buildNewManifest).toHaveBeenCalledWith();
        expect(manifestManager.pushArtifacts).toHaveBeenCalledWith(
          [ARTIFACT_EXCEPTIONS_MACOS],
          newManifest
        );
        expect(manifestManager.commit).toHaveBeenCalledWith(newManifest);
      });

      test('manifest is created successfuly when there is none', async () => {
        const newManifest = ManifestManager.createDefaultManifest();
        newManifest.addEntry(ARTIFACT_EXCEPTIONS_MACOS);
        newManifest.addEntry(ARTIFACT_TRUSTED_APPS_MACOS);

        const manifestManager = buildManifestManagerMock();
        manifestManager.getLastComputedManifest = jest.fn().mockResolvedValue(null);
        manifestManager.buildNewManifest = jest.fn().mockResolvedValue(newManifest);
        manifestManager.pushArtifacts = jest.fn().mockResolvedValue([]);
        manifestManager.commit = jest.fn().mockResolvedValue(null);

        expect((await invokeCallback(manifestManager)).inputs[0]).toStrictEqual(
          createNewEndpointPolicyInput({
            artifacts: toArtifactRecords({
              [ARTIFACT_NAME_EXCEPTIONS_MACOS]: ARTIFACT_EXCEPTIONS_MACOS,
              [ARTIFACT_NAME_TRUSTED_APPS_MACOS]: ARTIFACT_TRUSTED_APPS_MACOS,
            }),
            manifest_version: '1.0.0',
            schema_version: 'v1',
          })
        );

        expect(manifestManager.buildNewManifest).toHaveBeenCalledWith();
        expect(manifestManager.pushArtifacts).toHaveBeenCalledWith(
          [ARTIFACT_EXCEPTIONS_MACOS, ARTIFACT_TRUSTED_APPS_MACOS],
          newManifest
        );
        expect(manifestManager.commit).toHaveBeenCalledWith(newManifest);
      });

      test('policy is updated with only default entries from manifest', async () => {
        const manifest = new Manifest({ soVersion: '1.0.1', semanticVersion: '1.0.1' });
        manifest.addEntry(ARTIFACT_EXCEPTIONS_MACOS);
        manifest.addEntry(ARTIFACT_EXCEPTIONS_WINDOWS, TEST_POLICY_ID_1);
        manifest.addEntry(ARTIFACT_TRUSTED_APPS_MACOS, TEST_POLICY_ID_2);
        manifest.addEntry(ARTIFACT_TRUSTED_APPS_WINDOWS);

        const manifestManager = buildManifestManagerMock();
        manifestManager.getLastComputedManifest = jest.fn().mockResolvedValue(manifest);

        expect((await invokeCallback(manifestManager)).inputs[0]).toStrictEqual(
          createNewEndpointPolicyInput({
            artifacts: toArtifactRecords({
              [ARTIFACT_NAME_EXCEPTIONS_MACOS]: ARTIFACT_EXCEPTIONS_MACOS,
              [ARTIFACT_NAME_TRUSTED_APPS_WINDOWS]: ARTIFACT_TRUSTED_APPS_WINDOWS,
            }),
            manifest_version: '1.0.1',
            schema_version: 'v1',
          })
        );

        expect(manifestManager.buildNewManifest).not.toHaveBeenCalled();
        expect(manifestManager.pushArtifacts).not.toHaveBeenCalled();
        expect(manifestManager.commit).not.toHaveBeenCalled();
      });

      it('should correctly set meta.billable', async () => {
        const isBillablePolicySpy = jest.spyOn(PolicyConfigHelpers, 'isBillablePolicy');
        isBillablePolicySpy.mockReturnValue(false);
        const manifestManager = buildManifestManagerMock();

        let packagePolicy = await invokeCallback(manifestManager);
        expect(isBillablePolicySpy).toHaveBeenCalled();
        expect(packagePolicy.inputs[0].config!.policy.value.meta.billable).toBe(false);

        isBillablePolicySpy.mockReset();
        isBillablePolicySpy.mockReturnValue(true);
        packagePolicy = await invokeCallback(manifestManager);
        expect(isBillablePolicySpy).toHaveBeenCalled();
        expect(packagePolicy.inputs[0].config!.policy.value.meta.billable).toBe(true);

        isBillablePolicySpy.mockRestore();
      });

      it.each([false, true])(
        'should correctly set `global_telemetry_enabled` to %s',
        async (targetValue) => {
          const manifestManager = buildManifestManagerMock();
          telemetryConfigProviderMock.getIsOptedIn.mockReturnValue(targetValue);

          const packagePolicy = await invokeCallback(manifestManager);

          const policyConfig: PolicyConfig = packagePolicy.inputs[0].config!.policy.value;
          expect(policyConfig.global_telemetry_enabled).toBe(targetValue);
        }
      );

      it('should remove Linux DNS events when linuxDnsEvents feature flag is disabled', async () => {
        // @ts-expect-error write to readonly property for testing
        experimentalFeatures.linuxDnsEvents = false;
        const manifestManager = buildManifestManagerMock();

        const packagePolicy = await invokeCallback(manifestManager);

        expect(packagePolicy.inputs[0].config!.policy.value.linux.events.dns).toBeUndefined();
      });
    });
  });

  describe('package policy post create callback', () => {
    let soClient: ReturnType<typeof savedObjectsClientMock.create>;
    let esClient: ElasticsearchClientMock;
    let callback: PostPackagePolicyPostCreateCallback;
    let policyConfig: PackagePolicy;
    let endpointAppContextServiceMock: ReturnType<typeof createMockEndpointAppContextService>;

    beforeEach(() => {
      soClient = savedObjectsClientMock.create();
      esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
      endpointAppContextServiceMock = createMockEndpointAppContextService();
      jest.clearAllMocks();
      endpointAppContextServiceMock.getExceptionListsClient.mockReturnValue(exceptionListClient);
      callback = getPackagePolicyPostCreateCallback(endpointAppContextServiceMock);
      policyConfig = generator.generatePolicyPackagePolicy() as PackagePolicy;
      // By default, simulate that the event filter list does not exist
      (exceptionListClient.getExceptionList as jest.Mock).mockResolvedValue(null);
      (exceptionListClient.createExceptionList as jest.Mock).mockResolvedValue({});
      (exceptionListClient.createExceptionListItem as jest.Mock).mockResolvedValue({});
    });

    it('should create the Endpoint Event Filters List and add the correct Event Filters List Item attached to the policy given nonInteractiveSession parameter on integration config eventFilters', async () => {
      const integrationConfig = {
        type: 'cloud',
        eventFilters: {
          nonInteractiveSession: true,
        },
      };

      policyConfig.inputs[0]!.config!.integration_config = {
        value: integrationConfig,
      };
      const postCreatedPolicyConfig = await callback(
        policyConfig,
        soClient,
        esClient,
        requestContextMock.convertContext(ctx),
        req
      );

      // Wait for all async code in createEventFilters to complete
      await new Promise(process.nextTick);

      expect(exceptionListClient.createExceptionList).toHaveBeenCalledWith(
        expect.objectContaining({
          listId: ENDPOINT_ARTIFACT_LISTS.eventFilters.id,
          meta: undefined,
        })
      );

      expect(exceptionListClient.createExceptionListItem).toHaveBeenCalledWith(
        expect.objectContaining({
          listId: ENDPOINT_ARTIFACT_LISTS.eventFilters.id,
          tags: [`policy:${postCreatedPolicyConfig.id}`],
          osTypes: ['linux'],
          entries: [
            {
              field: 'process.entry_leader.interactive',
              operator: 'included',
              type: 'match',
              value: 'false',
            },
          ],
          itemId: 'NEW_UUID',
          namespaceType: 'agnostic',
          meta: undefined,
        })
      );
    });

    it('should NOT create the Event Filters List if it already exists, but should add the Event Filters List Item', async () => {
      const integrationConfig = {
        type: 'cloud',
        eventFilters: {
          nonInteractiveSession: true,
        },
      };

      policyConfig.inputs[0]!.config!.integration_config = {
        value: integrationConfig,
      };

      // Mock getExceptionList to return a non-null value (list already exists)
      (exceptionListClient.getExceptionList as jest.Mock).mockResolvedValue({
        id: 'existing-list-id',
        listId: ENDPOINT_ARTIFACT_LISTS.eventFilters.id,
      });

      const postCreatedPolicyConfig = await callback(
        policyConfig,
        soClient,
        esClient,
        requestContextMock.convertContext(ctx),
        req
      );

      // Should NOT attempt to create the list
      expect(exceptionListClient.createExceptionList).not.toHaveBeenCalled();
      // Should still create the event filter item
      expect(exceptionListClient.createExceptionListItem).toHaveBeenCalledWith(
        expect.objectContaining({
          listId: ENDPOINT_ARTIFACT_LISTS.eventFilters.id,
          tags: [`policy:${postCreatedPolicyConfig.id}`],
          osTypes: ['linux'],
          entries: [
            {
              field: 'process.entry_leader.interactive',
              operator: 'included',
              type: 'match',
              value: 'false',
            },
          ],
          itemId: 'NEW_UUID',
          namespaceType: 'agnostic',
          meta: undefined,
        })
      );
    });

    it('should not call Event Filters List and Event Filters List Item if nonInteractiveSession parameter is not present on integration config eventFilters', async () => {
      const integrationConfig = {
        type: 'cloud',
      };

      policyConfig.inputs[0]!.config!.integration_config = {
        value: integrationConfig,
      };
      const postCreatedPolicyConfig = await callback(
        policyConfig,
        soClient,
        esClient,
        requestContextMock.convertContext(ctx),
        req
      );

      expect(exceptionListClient.createExceptionList).not.toHaveBeenCalled();

      expect(exceptionListClient.createExceptionListItem).not.toHaveBeenCalled();

      expect(postCreatedPolicyConfig.inputs[0]!.config!.integration_config.value).toEqual(
        integrationConfig
      );
    });

    it('should call `createPolicyDatastreamsIfNeeded`', async () => {
      await callback(policyConfig, soClient, esClient, requestContextMock.convertContext(ctx), req);

      expect(createPolicyDataStreamsIfNeededMock).toHaveBeenCalled();
    });
  });

  describe('agent policy update callback', () => {
    it('ProductFeature disabled - returns an error if higher tier features are turned on in the policy', async () => {
      productFeaturesService = createProductFeaturesServiceMock(
        ALL_PRODUCT_FEATURE_KEYS.filter(
          (key) => key !== ProductFeatureSecurityKey.endpointAgentTamperProtection
        )
      );
      const callback = getAgentPolicyUpdateCallback(logger, productFeaturesService);

      const policyConfig = generator.generateAgentPolicy();
      policyConfig.is_protected = true;

      await expect(() => callback(policyConfig)).rejects.toThrow(
        'Agent Tamper Protection is not allowed in current environment'
      );
    });
    it('ProductFeature disabled - returns agent policy if higher tier features are turned off in the policy', async () => {
      productFeaturesService = createProductFeaturesServiceMock(
        ALL_PRODUCT_FEATURE_KEYS.filter(
          (key) => key !== ProductFeatureSecurityKey.endpointAgentTamperProtection
        )
      );
      const callback = getAgentPolicyUpdateCallback(logger, productFeaturesService);

      const policyConfig = generator.generateAgentPolicy();

      const updatedPolicyConfig = await callback(policyConfig);

      expect(updatedPolicyConfig).toEqual(policyConfig);
    });
    it('ProductFeature enabled - returns agent policy if higher tier features are turned on in the policy', async () => {
      const callback = getAgentPolicyUpdateCallback(logger, productFeaturesService);

      const policyConfig = generator.generateAgentPolicy();
      policyConfig.is_protected = true;

      const updatedPolicyConfig = await callback(policyConfig);

      expect(updatedPolicyConfig).toEqual(policyConfig);
    });
    it('ProductFeature enabled - returns agent policy if higher tier features are turned off in the policy', async () => {
      const callback = getAgentPolicyUpdateCallback(logger, productFeaturesService);
      const policyConfig = generator.generateAgentPolicy();

      const updatedPolicyConfig = await callback(policyConfig);

      expect(updatedPolicyConfig).toEqual(policyConfig);
    });
  });

  describe('agent policy create callback', () => {
    let callback: PostAgentPolicyCreateCallback;
    let policyConfig: GetAgentPoliciesResponseItem;

    beforeEach(() => {
      callback = getAgentPolicyCreateCallback(logger, productFeaturesService);
      policyConfig = generator.generateAgentPolicy();
    });

    it('ProductFeature disabled - returns an error if higher tier features are turned on in the policy', async () => {
      productFeaturesService = createProductFeaturesServiceMock(
        ALL_PRODUCT_FEATURE_KEYS.filter(
          (key) => key !== ProductFeatureSecurityKey.endpointAgentTamperProtection
        )
      );
      callback = getAgentPolicyCreateCallback(logger, productFeaturesService);
      policyConfig.is_protected = true;

      await expect(() => callback(policyConfig)).rejects.toThrow(
        'Agent Tamper Protection is not allowed in current environment'
      );
    });

    it('ProductFeature disabled - returns agent policy if higher tier features are turned off in the policy', async () => {
      productFeaturesService = createProductFeaturesServiceMock(
        ALL_PRODUCT_FEATURE_KEYS.filter(
          (key) => key !== ProductFeatureSecurityKey.endpointAgentTamperProtection
        )
      );
      callback = getAgentPolicyCreateCallback(logger, productFeaturesService);
      const updatedPolicyConfig = await callback(policyConfig);

      expect(updatedPolicyConfig).toEqual(policyConfig);
    });

    it('ProductFeature enabled - returns agent policy if higher tier features are turned on in the policy', async () => {
      policyConfig.is_protected = true;
      const updatedPolicyConfig = await callback(policyConfig);

      expect(updatedPolicyConfig).toEqual(policyConfig);
    });

    it('ProductFeature enabled - returns agent policy if higher tier features are turned off in the policy', async () => {
      const updatedPolicyConfig = await callback(policyConfig);

      expect(updatedPolicyConfig).toEqual(policyConfig);
    });
  });

  describe('package policy update callback', () => {
    let endpointAppContextServiceMock: ReturnType<typeof createMockEndpointAppContextService>;

    beforeEach(() => {
      endpointAppContextServiceMock = createMockEndpointAppContextService();
      endpointAppContextServiceMock.getExceptionListsClient.mockReturnValue(exceptionListClient);
      endpointAppContextServiceMock.getLicenseService.mockReturnValue(licenseService);
      (
        endpointAppContextServiceMock.getInternalFleetServices().packagePolicy.get as jest.Mock
      ).mockResolvedValue(createMockPolicyData());
    });

    describe('when the license is below platinum', () => {
      const soClient = savedObjectsClientMock.create();
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

      beforeEach(() => {
        licenseEmitter.next(Gold); // set license level to gold
      });
      it('returns an error if paid features are turned on in the policy', async () => {
        const mockPolicy = policyFactory(); // defaults with paid features on
        const callback = getPackagePolicyUpdateCallback(
          endpointAppContextServiceMock,
          cloudService,
          productFeaturesService,
          experimentalFeatures
        );
        const policyConfig = generator.generatePolicyPackagePolicy();
        policyConfig.inputs[0]!.config!.policy.value = mockPolicy;
        await expect(() =>
          callback(policyConfig, soClient, esClient, requestContextMock.convertContext(ctx), req)
        ).rejects.toThrow(
          'Gold license does not support this action. Please upgrade your license.'
        );
      });
      it('updates successfully if no paid features are turned on in the policy', async () => {
        const mockPolicy = policyFactoryWithoutPaidFeatures();
        mockPolicy.windows.malware.mode = ProtectionModes.detect;
        const callback = getPackagePolicyUpdateCallback(
          endpointAppContextServiceMock,
          cloudService,
          productFeaturesService,
          experimentalFeatures
        );
        const policyConfig = generator.generatePolicyPackagePolicy();
        policyConfig.inputs[0]!.config!.policy.value = mockPolicy;
        const updatedPolicyConfig = await callback(
          policyConfig,
          soClient,
          esClient,
          requestContextMock.convertContext(ctx),
          req
        );
        expect(updatedPolicyConfig.inputs[0]!.config!.policy.value).toEqual(mockPolicy);
      });
    });

    describe('when the license is at least enterprise', () => {
      const soClient = savedObjectsClientMock.create();
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

      beforeEach(() => {
        licenseEmitter.next(Enterprise); // set license level to enterprise
      });

      it('should throw if endpointProtectionUpdates productFeature is disabled and user modifies global_manifest_version', async () => {
        productFeaturesService = createProductFeaturesServiceMock(
          ALL_PRODUCT_FEATURE_KEYS.filter((key) => key !== 'endpoint_protection_updates')
        );
        const callback = getPackagePolicyUpdateCallback(
          endpointAppContextServiceMock,
          cloudService,
          productFeaturesService,
          experimentalFeatures
        );
        const policyConfig = generator.generatePolicyPackagePolicy();
        policyConfig.inputs[0]!.config!.policy.value.global_manifest_version = '2023-01-01';
        await expect(() =>
          callback(policyConfig, soClient, esClient, requestContextMock.convertContext(ctx), req)
        ).rejects.toThrow(
          'To modify protection updates, you must add Endpoint Complete to your project.'
        );
      });

      it('should throw if endpointCustomNotification productFeature is disabled and user modifies popup.[protection].message', async () => {
        productFeaturesService = createProductFeaturesServiceMock(
          ALL_PRODUCT_FEATURE_KEYS.filter((key) => key !== 'endpoint_custom_notification')
        );
        const callback = getPackagePolicyUpdateCallback(
          endpointAppContextServiceMock,
          cloudService,
          productFeaturesService,
          experimentalFeatures
        );
        const policyConfig = generator.generatePolicyPackagePolicy();
        policyConfig.inputs[0]!.config!.policy.value.windows.popup.ransomware.message = 'foo';
        await expect(() =>
          callback(policyConfig, soClient, esClient, requestContextMock.convertContext(ctx), req)
        ).rejects.toThrow(
          'To customize the user notification, you must add Endpoint Protection Complete to your project.'
        );
      });

      it.each([
        {
          date: 'invalid',
          message: 'Invalid date format. Use "latest" or "YYYY-MM-DD" format. UTC time.',
        },
        {
          date: '2023-10-1',
          message: 'Invalid date format. Use "latest" or "YYYY-MM-DD" format. UTC time.',
        },
        {
          // Test exact "too far in the past" boundary - exactly 18 months ago (without +1 day)
          // This tests the precise boundary condition rather than an arbitrary old date
          date: moment.utc().subtract(18, 'months').format('YYYY-MM-DD'),
          message:
            'Global manifest version is too far in the past. Please use either "latest" or a date within the last 18 months. The earliest valid date is October 1, 2023, in UTC time.',
        },
        {
          date: '2100-10-01',
          message: `Global manifest version cannot be in the future. Latest selectable date is ${moment
            .utc()
            .subtract(1, 'day')
            .format('MMMM DD, YYYY')} UTC time.`,
        },
        {
          date: moment.utc().format('YYYY-MM-DD'),
          message: `Global manifest version cannot be in the future. Latest selectable date is ${moment
            .utc()
            .subtract(1, 'day')
            .format('MMMM DD, YYYY')} UTC time.`,
        },
        {
          date: 'latest',
        },
        {
          date: moment.utc().subtract(1, 'day').format('YYYY-MM-DD'), // Correct date
        },
        {
          // Test exact cutoff boundary with buffer to prevent flakiness around midnight
          // Add 30 minutes buffer to account for time elapsed between test setup and API call
          date: moment
            .utc()
            .add(30, 'minutes')
            .subtract(18, 'months')
            .add(1, 'day')
            .format('YYYY-MM-DD'),
        },
      ])(
        'should return bad request for invalid endpoint package policy global manifest values',
        async ({ date, message }) => {
          const mockPolicy = policyFactory(); // defaults with paid features on
          const callback = getPackagePolicyUpdateCallback(
            endpointAppContextServiceMock,
            cloudService,
            productFeaturesService,
            experimentalFeatures
          );
          const policyConfig = generator.generatePolicyPackagePolicy();
          policyConfig.inputs[0]!.config!.policy.value = {
            ...mockPolicy,
            global_manifest_version: date,
          };
          if (!message) {
            const updatedPolicyConfig = await callback(
              policyConfig,
              soClient,
              esClient,
              requestContextMock.convertContext(ctx),
              req
            );
            expect(updatedPolicyConfig.inputs[0]!.config!.policy.value).toEqual({
              ...mockPolicy,
              global_manifest_version: date,
            });
          } else {
            await expect(() =>
              callback(
                policyConfig,
                soClient,
                esClient,
                requestContextMock.convertContext(ctx),
                req
              )
            ).rejects.toThrow(message);
          }
        }
      );
    });

    describe('when the license is at least platinum', () => {
      const soClient = savedObjectsClientMock.create();
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

      beforeEach(() => {
        licenseEmitter.next(Platinum); // set license level to platinum
      });

      it.each([
        {
          date: '2100-10-01',
          message: 'Platinum license does not support this action. Please upgrade your license.',
        },
        {
          date: moment.utc().subtract(1, 'day').format('YYYY-MM-DD'), // Correct date
          message: 'Platinum license does not support this action. Please upgrade your license.',
        },
        {
          date: 'latest',
        },
      ])(
        'should return bad request for invalid endpoint package policy global manifest values',
        async ({ date, message }) => {
          const mockPolicy = policyFactoryWithoutPaidEnterpriseFeatures(); // Use platinum-compatible policy
          const callback = getPackagePolicyUpdateCallback(
            endpointAppContextServiceMock,
            cloudService,
            productFeaturesService,
            experimentalFeatures
          );
          const policyConfig = generator.generatePolicyPackagePolicy();
          policyConfig.inputs[0]!.config!.policy.value = {
            ...mockPolicy,
            global_manifest_version: date,
          };
          if (!message) {
            const updatedPolicyConfig = await callback(
              policyConfig,
              soClient,
              esClient,
              requestContextMock.convertContext(ctx),
              req
            );
            expect(updatedPolicyConfig.inputs[0]!.config!.policy.value).toEqual({
              ...mockPolicy,
              global_manifest_version: date,
            });
          } else {
            await expect(() =>
              callback(
                policyConfig,
                soClient,
                esClient,
                requestContextMock.convertContext(ctx),
                req
              )
            ).rejects.toThrow(message);
          }
        }
      );

      it('updates successfully when paid features are turned on', async () => {
        licenseEmitter.next(Enterprise); // Temporarily use Enterprise for this test
        const mockPolicy = policyFactory();
        mockPolicy.windows.popup.malware.message = 'paid feature';
        const callback = getPackagePolicyUpdateCallback(
          endpointAppContextServiceMock,
          cloudService,
          productFeaturesService,
          experimentalFeatures
        );
        const policyConfig = generator.generatePolicyPackagePolicy();
        policyConfig.inputs[0]!.config!.policy.value = mockPolicy;
        const updatedPolicyConfig = await callback(
          policyConfig,
          soClient,
          esClient,
          requestContextMock.convertContext(ctx),
          req
        );
        expect(updatedPolicyConfig.inputs[0]!.config!.policy.value).toEqual(mockPolicy);
      });

      it('should turn off protections if endpointPolicyProtections productFeature is disabled', async () => {
        licenseEmitter.next(Enterprise); // Temporarily use Enterprise for this test
        productFeaturesService = createProductFeaturesServiceMock(
          ALL_PRODUCT_FEATURE_KEYS.filter((key) => key !== 'endpoint_policy_protections')
        );
        const callback = getPackagePolicyUpdateCallback(
          endpointAppContextServiceMock,
          cloudService,
          productFeaturesService,
          experimentalFeatures
        );

        const updatedPolicy = await callback(
          generator.generatePolicyPackagePolicy(),
          soClient,
          esClient,
          requestContextMock.convertContext(ctx),
          req
        );

        expect(updatedPolicy.inputs?.[0]?.config?.policy.value).toMatchObject({
          linux: {
            behavior_protection: { mode: 'off' },
            malware: { mode: 'off' },
            memory_protection: { mode: 'off' },
          },
          mac: {
            behavior_protection: { mode: 'off' },
            malware: { mode: 'off' },
            memory_protection: { mode: 'off' },
          },
          windows: {
            antivirus_registration: { enabled: false },
            attack_surface_reduction: { credential_hardening: { enabled: false } },
            behavior_protection: { mode: 'off' },
            malware: { blocklist: false },
            memory_protection: { mode: 'off' },
            ransomware: { mode: 'off' },
          },
        });
      });
    });

    describe('when meta fields should be updated', () => {
      const soClient = savedObjectsClientMock.create();
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

      const infoResponse = {
        cluster_name: 'updated-name',
        cluster_uuid: 'updated-uuid',
        license_uuid: 'updated-uuid',
        name: 'name',
        tagline: 'tagline',
        version: {
          number: '1.2.3',
          lucene_version: '1.2.3',
          build_date: 'DateString',
          build_flavor: 'string',
          build_hash: 'string',
          build_snapshot: true,
          build_type: 'string',
          minimum_index_compatibility_version: '1.2.3',
          minimum_wire_compatibility_version: '1.2.3',
        },
      };

      esClient.info.mockResolvedValue(infoResponse);

      beforeEach(() => {
        licenseEmitter.next(Enterprise); // set license level to enterprise
      });

      it('updates successfully when meta fields differ from services', async () => {
        const mockPolicy = policyFactory();
        mockPolicy.meta.cloud = true; // cloud mock will return true
        mockPolicy.meta.license = 'enterprise'; // license is set to emit enterprise
        mockPolicy.meta.cluster_name = 'updated-name';
        mockPolicy.meta.cluster_uuid = 'updated-uuid';
        mockPolicy.meta.license_uuid = 'updated-uid';
        mockPolicy.meta.serverless = false;
        mockPolicy.meta.billable = false;
        const callback = getPackagePolicyUpdateCallback(
          endpointAppContextServiceMock,
          cloudService,
          productFeaturesService,
          experimentalFeatures
        );
        const policyConfig = generator.generatePolicyPackagePolicy();

        // values should be updated
        policyConfig.inputs[0]!.config!.policy.value.meta.cloud = false;
        policyConfig.inputs[0]!.config!.policy.value.meta.license = 'gold';
        policyConfig.inputs[0]!.config!.policy.value.meta.cluster_name = 'original-name';
        policyConfig.inputs[0]!.config!.policy.value.meta.cluster_uuid = 'original-uuid';
        policyConfig.inputs[0]!.config!.policy.value.meta.license_uuid = 'original-uid';
        policyConfig.inputs[0]!.config!.policy.value.meta.serverless = true;
        policyConfig.inputs[0]!.config!.policy.value.meta.billable = true;
        const updatedPolicyConfig = await callback(
          policyConfig,
          soClient,
          esClient,
          requestContextMock.convertContext(ctx),
          req
        );
        expect(updatedPolicyConfig.inputs[0]!.config!.policy.value).toEqual(mockPolicy);
      });

      it('meta fields stay the same where there is no difference', async () => {
        const mockPolicy = policyFactory();
        mockPolicy.meta.cloud = true; // cloud mock will return true
        mockPolicy.meta.license = 'enterprise'; // license is set to emit enterprise
        mockPolicy.meta.cluster_name = 'updated-name';
        mockPolicy.meta.cluster_uuid = 'updated-uuid';
        mockPolicy.meta.license_uuid = 'updated-uid';
        mockPolicy.meta.serverless = false;
        mockPolicy.meta.billable = false;
        const callback = getPackagePolicyUpdateCallback(
          endpointAppContextServiceMock,
          cloudService,
          productFeaturesService,
          experimentalFeatures
        );
        const policyConfig = generator.generatePolicyPackagePolicy();
        // values should be updated
        policyConfig.inputs[0]!.config!.policy.value.meta.cloud = true;
        policyConfig.inputs[0]!.config!.policy.value.meta.license = 'platinum';
        policyConfig.inputs[0]!.config!.policy.value.meta.cluster_name = 'updated-name';
        policyConfig.inputs[0]!.config!.policy.value.meta.cluster_uuid = 'updated-uuid';
        policyConfig.inputs[0]!.config!.policy.value.meta.license_uuid = 'updated-uid';
        policyConfig.inputs[0]!.config!.policy.value.meta.serverless = false;
        policyConfig.inputs[0]!.config!.policy.value.meta.billable = false;
        const updatedPolicyConfig = await callback(
          policyConfig,
          soClient,
          esClient,
          requestContextMock.convertContext(ctx),
          req
        );
        expect(updatedPolicyConfig.inputs[0]!.config!.policy.value).toEqual(mockPolicy);
      });
    });

    describe('when device control features are disabled', () => {
      const soClient = savedObjectsClientMock.create();
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

      beforeEach(() => {
        licenseEmitter.next(Enterprise);
      });

      it('should remove device control when endpointTrustedDevices product feature is disabled', async () => {
        productFeaturesService = createProductFeaturesServiceMock(
          ALL_PRODUCT_FEATURE_KEYS.filter(
            (key) => key !== ProductFeatureSecurityKey.endpointTrustedDevices
          )
        );

        const mockPolicy = policyFactory();
        // Add some device control settings to test removal
        if (!mockPolicy.windows.device_control) {
          mockPolicy.windows.device_control = { enabled: true, usb_storage: 'deny_all' };
        } else {
          mockPolicy.windows.device_control.enabled = true;
          mockPolicy.windows.device_control.usb_storage = 'deny_all';
        }

        const removeDeviceControlSpy = jest.spyOn(PolicyConfigHelpers, 'removeDeviceControl');

        const callback = getPackagePolicyUpdateCallback(
          endpointAppContextServiceMock,
          cloudService,
          productFeaturesService,
          experimentalFeatures
        );

        const policyConfig = generator.generatePolicyPackagePolicy();
        policyConfig.inputs[0]!.config!.policy.value = mockPolicy;

        await callback(
          policyConfig,
          soClient,
          esClient,
          requestContextMock.convertContext(ctx),
          req
        );

        expect(removeDeviceControlSpy).toHaveBeenCalledWith(mockPolicy);
      });

      it('should remove device control when trustedDevices experimental feature is disabled', async () => {
        // @ts-expect-error
        experimentalFeatures.trustedDevices = false;

        const mockPolicy = policyFactory();
        // Add some device control settings to test removal
        if (!mockPolicy.windows.device_control) {
          mockPolicy.windows.device_control = { enabled: true, usb_storage: 'deny_all' };
        } else {
          mockPolicy.windows.device_control.enabled = true;
          mockPolicy.windows.device_control.usb_storage = 'deny_all';
        }

        const removeDeviceControlSpy = jest.spyOn(PolicyConfigHelpers, 'removeDeviceControl');

        const callback = getPackagePolicyUpdateCallback(
          endpointAppContextServiceMock,
          cloudService,
          productFeaturesService,
          experimentalFeatures
        );

        const policyConfig = generator.generatePolicyPackagePolicy();
        policyConfig.inputs[0]!.config!.policy.value = mockPolicy;

        await callback(
          policyConfig,
          soClient,
          esClient,
          requestContextMock.convertContext(ctx),
          req
        );

        expect(removeDeviceControlSpy).toHaveBeenCalledWith(mockPolicy);
      });

      it('should not remove device control when both features are enabled', async () => {
        // Reset to enabled states
        // @ts-expect-error
        experimentalFeatures.trustedDevices = true;
        // @ts-expect-error
        productFeaturesService = createProductFeaturesServiceMock(ALL_PRODUCT_FEATURE_KEYS);

        const mockPolicy = policyFactory();
        if (!mockPolicy.windows.device_control) {
          mockPolicy.windows.device_control = { enabled: true, usb_storage: 'deny_all' };
        } else {
          mockPolicy.windows.device_control.enabled = true;
          mockPolicy.windows.device_control.usb_storage = 'deny_all';
        }

        const removeDeviceControlSpy = jest.spyOn(PolicyConfigHelpers, 'removeDeviceControl');

        const callback = getPackagePolicyUpdateCallback(
          endpointAppContextServiceMock,
          cloudService,
          productFeaturesService,
          experimentalFeatures
        );

        const policyConfig = generator.generatePolicyPackagePolicy();
        policyConfig.inputs[0]!.config!.policy.value = mockPolicy;

        await callback(
          policyConfig,
          soClient,
          esClient,
          requestContextMock.convertContext(ctx),
          req
        );

        expect(removeDeviceControlSpy).not.toHaveBeenCalled();
      });
    });

    describe('when `antivirus_registration.mode` is changed', () => {
      const soClient = savedObjectsClientMock.create();
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
      let callback: PutPackagePolicyUpdateCallback;
      let inputPolicyConfig: PolicyData;
      let inputWindowsConfig: PolicyConfig['windows'];

      const antivirusRegistrationIn = (config: UpdatePackagePolicy) =>
        config.inputs[0].config!.policy.value.windows.antivirus_registration.enabled;

      beforeEach(() => {
        licenseEmitter.next(Enterprise);

        callback = getPackagePolicyUpdateCallback(
          endpointAppContextServiceMock,
          cloudService,
          productFeaturesService,
          experimentalFeatures
        );

        inputPolicyConfig = generator.generatePolicyPackagePolicy();
        inputWindowsConfig = inputPolicyConfig.inputs[0].config!.policy.value.windows;
      });

      it('should enable antivirus registration if mode is enabled', async () => {
        inputWindowsConfig.antivirus_registration.mode = AntivirusRegistrationModes.enabled;
        inputWindowsConfig.antivirus_registration.enabled = false;

        const updatedPolicyConfig = await callback(
          inputPolicyConfig,
          soClient,
          esClient,
          requestContextMock.convertContext(ctx),
          req
        );

        expect(antivirusRegistrationIn(updatedPolicyConfig)).toBe(true);
      });

      it('should disable antivirus registration if mode is disabled', async () => {
        inputWindowsConfig.antivirus_registration.mode = AntivirusRegistrationModes.disabled;
        inputWindowsConfig.antivirus_registration.enabled = true;

        const updatedPolicyConfig = await callback(
          inputPolicyConfig,
          soClient,
          esClient,
          requestContextMock.convertContext(ctx),
          req
        );

        expect(antivirusRegistrationIn(updatedPolicyConfig)).toBe(false);
      });

      it('should enable antivirus registration if mode is sync and malware is prevent', async () => {
        inputWindowsConfig.antivirus_registration.mode = AntivirusRegistrationModes.sync;
        inputWindowsConfig.antivirus_registration.enabled = false;
        inputWindowsConfig.malware.mode = ProtectionModes.prevent;

        const updatedPolicyConfig = await callback(
          inputPolicyConfig,
          soClient,
          esClient,
          requestContextMock.convertContext(ctx),
          req
        );

        expect(antivirusRegistrationIn(updatedPolicyConfig)).toBe(true);
      });

      it('should disable antivirus registration if mode is sync and malware is detect', async () => {
        inputWindowsConfig.antivirus_registration.mode = AntivirusRegistrationModes.sync;
        inputWindowsConfig.antivirus_registration.enabled = true;
        inputWindowsConfig.malware.mode = ProtectionModes.detect;

        const updatedPolicyConfig = await callback(
          inputPolicyConfig,
          soClient,
          esClient,
          requestContextMock.convertContext(ctx),
          req
        );

        expect(antivirusRegistrationIn(updatedPolicyConfig)).toBe(false);
      });

      it('should disable antivirus registration if mode is an unexpected value', async () => {
        inputWindowsConfig.antivirus_registration.mode = 'cheese' as AntivirusRegistrationModes;
        inputWindowsConfig.antivirus_registration.enabled = true;

        const updatedPolicyConfig = await callback(
          inputPolicyConfig,
          soClient,
          esClient,
          requestContextMock.convertContext(ctx),
          req
        );

        expect(antivirusRegistrationIn(updatedPolicyConfig)).toBe(false);
      });
    });

    it('should throw an error if the policy is invalid', async () => {
      const soClient = savedObjectsClientMock.create();
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
      licenseEmitter.next(Enterprise);

      const callback = getPackagePolicyUpdateCallback(
        endpointAppContextServiceMock,
        cloudService,
        productFeaturesService,
        experimentalFeatures
      );
      const policyConfig = generator.generatePolicyPackagePolicy();

      // @ts-expect-error TS2790: The operand of a delete operator must be optional
      delete policyConfig.inputs[0]!.config!.policy;
      // @ts-expect-error TS2790: The operand of a delete operator must be optional
      delete policyConfig.inputs[0]!.config!.artifact_manifest;

      await expect(() =>
        callback(policyConfig, soClient, esClient, requestContextMock.convertContext(ctx), req)
      ).rejects.toThrow(
        "Invalid Elastic Defend security policy. 'inputs[0].config.policy.value' and 'inputs[0].config.artifact_manifest.value' are required."
      );
    });

    it('should correctly set meta.billable', async () => {
      const isBillablePolicySpy = jest.spyOn(PolicyConfigHelpers, 'isBillablePolicy');

      const soClient = savedObjectsClientMock.create();
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
      licenseEmitter.next(Enterprise);

      const callback = getPackagePolicyUpdateCallback(
        endpointAppContextServiceMock,
        cloudService,
        productFeaturesService,
        experimentalFeatures
      );
      const policyConfig = generator.generatePolicyPackagePolicy();

      isBillablePolicySpy.mockReturnValue(false);
      let updatedPolicyConfig = await callback(
        policyConfig,
        soClient,
        esClient,
        requestContextMock.convertContext(ctx),
        req
      );
      expect(isBillablePolicySpy).toHaveBeenCalled();
      expect(updatedPolicyConfig.inputs[0]!.config!.policy.value.meta.billable).toEqual(false);

      isBillablePolicySpy.mockReset();
      isBillablePolicySpy.mockReturnValue(true);
      updatedPolicyConfig = await callback(
        policyConfig,
        soClient,
        esClient,
        requestContextMock.convertContext(ctx),
        req
      );
      expect(isBillablePolicySpy).toHaveBeenCalled();
      expect(updatedPolicyConfig.inputs[0]!.config!.policy.value.meta.billable).toEqual(true);

      isBillablePolicySpy.mockRestore();
    });

    describe('device control notification validation', () => {
      const soClient = savedObjectsClientMock.create();
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

      beforeEach(() => {
        licenseEmitter.next(Enterprise);
      });

      it.each<['windows' | 'mac', 'audit' | 'read_only', string]>([
        ['windows', 'audit', 'Windows'],
        ['mac', 'read_only', 'Mac'],
      ])(
        'should throw error when %s notifications are enabled and access level is %s',
        async (os, accessLevel, osLabel) => {
          const callback = getPackagePolicyUpdateCallback(
            endpointAppContextServiceMock,
            cloudService,
            productFeaturesService,
            experimentalFeatures
          );
          const policyConfig = generator.generatePolicyPackagePolicy();
          policyConfig.inputs[0]!.config!.policy.value[os].device_control = {
            enabled: true,
            usb_storage: accessLevel,
          };
          policyConfig.inputs[0]!.config!.policy.value[os].popup.device_control = {
            enabled: true,
            message: 'Test message',
          };

          await expect(() =>
            callback(policyConfig, soClient, esClient, requestContextMock.convertContext(ctx), req)
          ).rejects.toThrow(
            new RegExp(
              `Device Control user notifications are only supported when USB storage access level is set to deny_all\\. Current ${osLabel} access level is "${accessLevel}"\\.`
            )
          );
        }
      );

      it('should NOT throw when notifications are enabled and access level is deny_all', async () => {
        const callback = getPackagePolicyUpdateCallback(
          endpointAppContextServiceMock,
          cloudService,
          productFeaturesService,
          experimentalFeatures
        );
        const policyConfig = generator.generatePolicyPackagePolicy();
        policyConfig.inputs[0]!.config!.policy.value.windows.device_control = {
          enabled: true,
          usb_storage: 'deny_all',
        };
        policyConfig.inputs[0]!.config!.policy.value.windows.popup.device_control = {
          enabled: true,
          message: 'Test message',
        };
        policyConfig.inputs[0]!.config!.policy.value.mac.device_control = {
          enabled: true,
          usb_storage: 'deny_all',
        };
        policyConfig.inputs[0]!.config!.policy.value.mac.popup.device_control = {
          enabled: true,
          message: 'Test message',
        };

        await expect(
          callback(policyConfig, soClient, esClient, requestContextMock.convertContext(ctx), req)
        ).resolves.not.toThrow();
      });

      it('should NOT throw when notifications are disabled regardless of access level', async () => {
        const callback = getPackagePolicyUpdateCallback(
          endpointAppContextServiceMock,
          cloudService,
          productFeaturesService,
          experimentalFeatures
        );
        const policyConfig = generator.generatePolicyPackagePolicy();
        policyConfig.inputs[0]!.config!.policy.value.windows.device_control = {
          enabled: true,
          usb_storage: 'audit',
        };
        policyConfig.inputs[0]!.config!.policy.value.windows.popup.device_control = {
          enabled: false,
          message: 'Test message',
        };

        await expect(
          callback(policyConfig, soClient, esClient, requestContextMock.convertContext(ctx), req)
        ).resolves.not.toThrow();
      });
    });
  });

  describe('package policy delete callback', () => {
    let endpointServicesMock: ReturnType<typeof createMockEndpointAppContextService>;
    let removedPolicies: PostDeletePackagePoliciesResponse;
    let policyId: string;
    let fakeArtifact: ExceptionListSchema;

    const invokeDeleteCallback = async (): Promise<void> => {
      const callback = getPackagePolicyDeleteCallback(endpointServicesMock);
      await callback(
        removedPolicies,
        endpointServicesMock.savedObjects.createInternalScopedSoClient(),
        endpointServicesMock.getInternalEsClient()
      );
    };

    beforeEach(() => {
      endpointServicesMock = createMockEndpointAppContextService();
      endpointServicesMock.getExceptionListsClient.mockReturnValue(exceptionListClient);
      removedPolicies = deletePackagePolicyMock();
      policyId = removedPolicies[0].id;
      fakeArtifact = {
        ...getExceptionListSchemaMock(),
        tags: [`policy:${policyId}`],
      };

      exceptionListClient.findExceptionListsItem = jest
        .fn()
        .mockResolvedValueOnce({ data: [fakeArtifact], total: 1 });
      exceptionListClient.updateExceptionListItem = jest
        .fn()
        .mockResolvedValueOnce({ ...fakeArtifact, tags: [] });
    });

    it('removes policy from artifact', async () => {
      const soClientMock = endpointServicesMock.savedObjects.createInternalScopedSoClient();

      (soClientMock.find as jest.Mock).mockResolvedValueOnce({
        total: 1,
        saved_objects: [
          {
            id: 'id',
            type: 'type',
            references: [
              {
                id: 'id_package_policy',
                name: 'package_policy',
                type: 'ingest-package-policies',
              },
            ],
            attributes: { note: 'note' },
            score: 1,
          },
        ],
        page: 1,
        per_page: 10,
      });

      await invokeDeleteCallback();

      expect(exceptionListClient.findExceptionListsItem).toHaveBeenCalledWith({
        listId: ALL_ENDPOINT_ARTIFACT_LIST_IDS,
        filter: ALL_ENDPOINT_ARTIFACT_LIST_IDS.map(
          () => `exception-list-agnostic.attributes.tags:"policy:${policyId}"`
        ),
        namespaceType: ALL_ENDPOINT_ARTIFACT_LIST_IDS.map(() => 'agnostic'),
        page: 1,
        perPage: 50,
        sortField: undefined,
        sortOrder: undefined,
      });

      expect(exceptionListClient.updateExceptionListItem).toHaveBeenCalledWith({
        ...fakeArtifact,
        namespaceType: fakeArtifact.namespace_type,
        osTypes: fakeArtifact.os_types,
        tags: [],
      });

      expect(
        endpointServicesMock.savedObjects.createInternalScopedSoClient().delete
      ).toBeCalledWith('policy-settings-protection-updates-note', 'id', { force: true });
    });

    describe('and with space awareness feature enabled', () => {
      beforeEach(() => {
        (
          endpointServicesMock.getInternalFleetServices().isEndpointPackageInstalled as jest.Mock
        ).mockResolvedValue(true);

        const packagePolicyGenerator = new FleetPackagePolicyGenerator('seed');
        const packageNames = Object.values(RESPONSE_ACTIONS_SUPPORTED_INTEGRATION_TYPES).flat();

        removedPolicies = packageNames
          .concat('some-other-package-name')
          .map((packageName, index) => {
            return {
              ...pick(
                packagePolicyGenerator.generate({
                  id: `policy-${index}`,
                  package: { name: packageName, title: packageName, version: '9.1.0' },
                }),
                ['id', 'name', 'package']
              ),
              success: true,
            };
          });
      });

      it('should check only policies whose package.name matches a package that supports response actions', async () => {
        await invokeDeleteCallback();

        expect(endpointServicesMock.getInternalEsClient().updateByQuery).toHaveBeenCalledWith(
          expect.objectContaining({
            query: {
              bool: {
                filter: {
                  terms: {
                    'agent.policy.integrationPolicyId': removedPolicies
                      .filter((policy) => policy.package!.name !== 'some-other-package-name')
                      .map((policy) => policy.id),
                  },
                },
              },
            },
          })
        );
      });

      it('should only process policies that were successfully deleted', async () => {
        let endpointPolicyId = '';
        removedPolicies.forEach((policy) => {
          if (policy.package?.name !== 'endpoint') {
            policy.success = false;
          } else {
            endpointPolicyId = policy.id;
          }
        });

        await invokeDeleteCallback();

        expect(endpointServicesMock.getInternalEsClient().updateByQuery).toHaveBeenCalledWith(
          expect.objectContaining({
            query: {
              bool: {
                filter: {
                  terms: {
                    'agent.policy.integrationPolicyId': [endpointPolicyId],
                  },
                },
              },
            },
          })
        );
      });

      it('should call updateByQuery() with expected arguments', async () => {
        await invokeDeleteCallback();

        expect(endpointServicesMock.getInternalEsClient().updateByQuery).toHaveBeenCalledWith({
          conflicts: 'proceed',
          ignore_unavailable: true,
          index: ENDPOINT_ACTIONS_INDEX,
          query: {
            bool: {
              filter: {
                terms: {
                  'agent.policy.integrationPolicyId': removedPolicies
                    .filter((policy) => policy.package!.name !== 'some-other-package-name')
                    .map((policy) => policy.id),
                },
              },
            },
          },
          refresh: false,
          script: {
            lang: 'painless',
            source: `
if (ctx._source.containsKey('tags')) {
  ctx._source.tags.add('INTEGRATION-POLICY-DELETED');
} else {
  ctx._source.tags = ['INTEGRATION-POLICY-DELETED'];
}
`,
          },
        });
      });
    });
  });
});
