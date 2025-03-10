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
import type { KibanaRequest, Logger } from '@kbn/core/server';
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
import type { ILicense } from '@kbn/licensing-plugin/common/types';
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

  beforeEach(() => {
    endpointAppContextStartContract = createMockEndpointAppContextServiceStartContract();
    ctx = requestContextMock.createTools().context;
    req = httpServerMock.createKibanaRequest();
    licenseEmitter = new Subject();
    licenseService = new LicenseService();
    licenseService.start(licenseEmitter);
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

  describe('package policy init callback (atifacts manifest initialisation tests)', () => {
    const soClient = savedObjectsClientMock.create();
    const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

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

    const invokeCallback = async (manifestManager: ManifestManager): Promise<NewPackagePolicy> => {
      const callback = getPackagePolicyCreateCallback(
        logger,
        manifestManager,
        requestContextFactoryMock.create(),
        endpointAppContextStartContract.alerting,
        licenseService,
        exceptionListClient,
        cloudService,
        productFeaturesService,
        telemetryConfigProviderMock
      );

      return callback(
        createNewPackagePolicyMock(),
        soClient,
        esClient,
        requestContextMock.convertContext(ctx),
        req
      );
    };

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
      endpointAppContextServiceMock.getExceptionListsClient.mockReturnValue(exceptionListClient);
      callback = getPackagePolicyPostCreateCallback(endpointAppContextServiceMock);
      policyConfig = generator.generatePolicyPackagePolicy() as PackagePolicy;
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
    describe('when the license is below platinum', () => {
      const soClient = savedObjectsClientMock.create();
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

      beforeEach(() => {
        licenseEmitter.next(Gold); // set license level to gold
      });
      it('returns an error if paid features are turned on in the policy', async () => {
        const mockPolicy = policyFactory(); // defaults with paid features on
        const callback = getPackagePolicyUpdateCallback(
          logger,
          licenseService,
          endpointAppContextStartContract.featureUsageService,
          endpointMetadataService,
          cloudService,
          esClient,
          productFeaturesService
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
          logger,
          licenseService,
          endpointAppContextStartContract.featureUsageService,
          endpointMetadataService,
          cloudService,
          esClient,
          productFeaturesService
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
          logger,
          licenseService,
          endpointAppContextStartContract.featureUsageService,
          endpointMetadataService,
          cloudService,
          esClient,
          productFeaturesService
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
          logger,
          licenseService,
          endpointAppContextStartContract.featureUsageService,
          endpointMetadataService,
          cloudService,
          esClient,
          productFeaturesService
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
          date: '2020-10-31',
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
      ])(
        'should return bad request for invalid endpoint package policy global manifest values',
        async ({ date, message }) => {
          const mockPolicy = policyFactory(); // defaults with paid features on
          const callback = getPackagePolicyUpdateCallback(
            logger,
            licenseService,
            endpointAppContextStartContract.featureUsageService,
            endpointMetadataService,
            cloudService,
            esClient,
            productFeaturesService
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
          const mockPolicy = policyFactory(); // defaults with paid features on
          const callback = getPackagePolicyUpdateCallback(
            logger,
            licenseService,
            endpointAppContextStartContract.featureUsageService,
            endpointMetadataService,
            cloudService,
            esClient,
            productFeaturesService
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
        const mockPolicy = policyFactory();
        mockPolicy.windows.popup.malware.message = 'paid feature';
        const callback = getPackagePolicyUpdateCallback(
          logger,
          licenseService,
          endpointAppContextStartContract.featureUsageService,
          endpointMetadataService,
          cloudService,
          esClient,
          productFeaturesService
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
        productFeaturesService = createProductFeaturesServiceMock(
          ALL_PRODUCT_FEATURE_KEYS.filter((key) => key !== 'endpoint_policy_protections')
        );
        const callback = getPackagePolicyUpdateCallback(
          logger,
          licenseService,
          endpointAppContextStartContract.featureUsageService,
          endpointMetadataService,
          cloudService,
          esClient,
          productFeaturesService
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
        licenseEmitter.next(Platinum); // set license level to platinum
      });

      it('updates successfully when meta fields differ from services', async () => {
        const mockPolicy = policyFactory();
        mockPolicy.meta.cloud = true; // cloud mock will return true
        mockPolicy.meta.license = 'platinum'; // license is set to emit platinum
        mockPolicy.meta.cluster_name = 'updated-name';
        mockPolicy.meta.cluster_uuid = 'updated-uuid';
        mockPolicy.meta.license_uuid = 'updated-uid';
        mockPolicy.meta.serverless = false;
        mockPolicy.meta.billable = false;
        const callback = getPackagePolicyUpdateCallback(
          logger,
          licenseService,
          endpointAppContextStartContract.featureUsageService,
          endpointMetadataService,
          cloudService,
          esClient,
          productFeaturesService
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
        mockPolicy.meta.license = 'platinum'; // license is set to emit platinum
        mockPolicy.meta.cluster_name = 'updated-name';
        mockPolicy.meta.cluster_uuid = 'updated-uuid';
        mockPolicy.meta.license_uuid = 'updated-uid';
        mockPolicy.meta.serverless = false;
        mockPolicy.meta.billable = false;
        const callback = getPackagePolicyUpdateCallback(
          logger,
          licenseService,
          endpointAppContextStartContract.featureUsageService,
          endpointMetadataService,
          cloudService,
          esClient,
          productFeaturesService
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

    describe('when `antivirus_registration.mode` is changed', () => {
      const soClient = savedObjectsClientMock.create();
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
      let callback: PutPackagePolicyUpdateCallback;
      let inputPolicyConfig: PolicyData;
      let inputWindowsConfig: PolicyConfig['windows'];

      const antivirusRegistrationIn = (config: UpdatePackagePolicy) =>
        config.inputs[0].config!.policy.value.windows.antivirus_registration.enabled;

      beforeEach(() => {
        licenseEmitter.next(Platinum);

        callback = getPackagePolicyUpdateCallback(
          logger,
          licenseService,
          endpointAppContextStartContract.featureUsageService,
          endpointMetadataService,
          cloudService,
          esClient,
          productFeaturesService
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

    it('should correctly set meta.billable', async () => {
      const isBillablePolicySpy = jest.spyOn(PolicyConfigHelpers, 'isBillablePolicy');

      const soClient = savedObjectsClientMock.create();
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
      licenseEmitter.next(Enterprise);

      const callback = getPackagePolicyUpdateCallback(
        logger,
        licenseService,
        endpointAppContextStartContract.featureUsageService,
        endpointMetadataService,
        cloudService,
        esClient,
        productFeaturesService
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
  });

  describe('package policy delete callback', () => {
    const soClient = savedObjectsClientMock.create();
    const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

    const invokeDeleteCallback = async (): Promise<void> => {
      const callback = getPackagePolicyDeleteCallback(exceptionListClient, soClient);
      await callback(deletePackagePolicyMock(), soClient, esClient);
    };

    let removedPolicies: PostDeletePackagePoliciesResponse;
    let policyId: string;
    let fakeArtifact: ExceptionListSchema;

    beforeEach(() => {
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
      soClient.find.mockResolvedValueOnce({
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

      expect(soClient.delete).toBeCalledWith('policy-settings-protection-updates-note', 'id');
    });
  });
});
