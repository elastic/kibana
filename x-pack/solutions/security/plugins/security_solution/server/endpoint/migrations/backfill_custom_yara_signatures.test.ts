/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import {
  ALL_PRODUCT_FEATURE_KEYS,
  ProductFeatureSecurityKey,
} from '@kbn/security-solution-features/keys';
import { licenseMock } from '@kbn/licensing-plugin/common/licensing.mock';
import { of } from 'rxjs';
import { createMockEndpointAppContextServiceStartContract } from '../mocks';
import type { EndpointInternalFleetServicesInterface } from '../services/fleet';
import { backfillCustomYaraSignatures } from './backfill_custom_yara_signatures';
import { FleetPackagePolicyGenerator } from '../../../common/endpoint/data_generators/fleet_package_policy_generator';
import { type PolicyData, ProtectionModes } from '../../../common/endpoint/types';
import type { ProductFeaturesService } from '../../lib/product_features_service/product_features_service';
import { createProductFeaturesServiceMock } from '../../lib/product_features_service/mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { createEndpointFleetServicesFactoryMock } from '../services/fleet/endpoint_fleet_services_factory.mocks';
import { LicenseService } from '../../../common/license/license';
import {
  allowedExperimentalValues,
  type ExperimentalFeatures,
} from '../../../common/experimental_features';

describe('Backfill Custom YARA Signatures Migration', () => {
  let esClient: ElasticsearchClient;
  let fleetServices: EndpointInternalFleetServicesInterface;
  let productFeatureService: ProductFeaturesService;
  let licenseService: LicenseService;
  let experimentalFeatures: ExperimentalFeatures;
  let logger: Logger;

  const enterpriseLicense = licenseMock.createLicense({
    license: { type: 'enterprise', uid: 'test-uid' },
  });
  const platinumLicense = licenseMock.createLicense({
    license: { type: 'platinum', mode: 'platinum', uid: 'test-uid' },
  });

  const callBackfill = () =>
    backfillCustomYaraSignatures(
      esClient,
      fleetServices,
      productFeatureService,
      licenseService,
      experimentalFeatures,
      logger
    );

  const mockPolicyListResponse = (
    { total, items, page }: { total?: number; items?: PolicyData[]; page?: number } = {
      total: 1,
      page: 2,
      items: [],
    }
  ) => {
    const packagePolicyListSrv = fleetServices.packagePolicy.list as jest.Mock;
    return packagePolicyListSrv.mockResolvedValueOnce({
      total,
      page,
      perPage: 1500,
      items,
    });
  };

  const generatePolicyMock = (): PolicyData =>
    new FleetPackagePolicyGenerator('seed').generateEndpointPackagePolicy();

  const policyConfigOf = (policy: PolicyData) => policy.inputs[0].config.policy.value;

  const unsetCustomYaraSignatures = (
    policy: PolicyData,
    osList: Array<'windows' | 'mac' | 'linux'> = ['windows', 'mac', 'linux']
  ) => {
    for (const os of osList) {
      const memoryProtection = policyConfigOf(policy)[os].memory_protection as {
        custom_yara_signatures?: boolean;
      };
      delete memoryProtection.custom_yara_signatures;
    }
  };

  const cysOf = (
    updatedPolicy: { inputs: PolicyData['inputs'] },
    os: 'windows' | 'mac' | 'linux'
  ) => updatedPolicy.inputs[0].config.policy.value[os].memory_protection.custom_yara_signatures;

  beforeEach(() => {
    const endpointContextStartContract = createMockEndpointAppContextServiceStartContract();

    logger = loggingSystemMock.createLogger();
    ({ esClient } = endpointContextStartContract);
    productFeatureService = createProductFeaturesServiceMock();
    experimentalFeatures = {
      ...allowedExperimentalValues,
      customYaraSignaturesEnabled: true,
    };
    licenseService = new LicenseService();
    licenseService.start(of(enterpriseLicense));
    fleetServices = createEndpointFleetServicesFactoryMock().service.asInternalUser();
    fleetServices.packagePolicy.bulkUpdate = jest.fn().mockResolvedValue({
      updatedPolicies: [],
      failedPolicies: [],
    });
  });

  afterEach(() => {
    licenseService.stop();
  });

  it('fills absent values from the per-OS memory protection mode (mixed prevent/off/detect in one policy)', async () => {
    const policy = generatePolicyMock();
    const policyConfig = policyConfigOf(policy);
    policyConfig.windows.memory_protection.mode = ProtectionModes.prevent;
    policyConfig.mac.memory_protection.mode = ProtectionModes.off;
    policyConfig.linux.memory_protection.mode = ProtectionModes.detect;
    unsetCustomYaraSignatures(policy);

    mockPolicyListResponse({ items: [policy] });

    await callBackfill();

    expect(fleetServices.packagePolicy.bulkUpdate).toHaveBeenCalledTimes(1);
    const updatedPolicies = (fleetServices.packagePolicy.bulkUpdate as jest.Mock).mock.calls[0][2];
    expect(updatedPolicies).toHaveLength(1);
    expect(cysOf(updatedPolicies[0], 'windows')).toBe(true);
    expect(cysOf(updatedPolicies[0], 'mac')).toBe(false);
    expect(cysOf(updatedPolicies[0], 'linux')).toBe(true);
  });

  it('leaves explicit true and false untouched', async () => {
    const policy = generatePolicyMock();
    const policyConfig = policyConfigOf(policy);
    policyConfig.windows.memory_protection.mode = ProtectionModes.off;
    policyConfig.windows.memory_protection.custom_yara_signatures = true;
    policyConfig.mac.memory_protection.mode = ProtectionModes.prevent;
    policyConfig.mac.memory_protection.custom_yara_signatures = false;
    policyConfig.linux.memory_protection.mode = ProtectionModes.detect;
    unsetCustomYaraSignatures(policy, ['linux']);

    mockPolicyListResponse({ items: [policy] });

    await callBackfill();

    expect(fleetServices.packagePolicy.bulkUpdate).toHaveBeenCalledTimes(1);
    const updatedPolicies = (fleetServices.packagePolicy.bulkUpdate as jest.Mock).mock.calls[0][2];
    expect(cysOf(updatedPolicies[0], 'windows')).toBe(true);
    expect(cysOf(updatedPolicies[0], 'mac')).toBe(false);
    expect(cysOf(updatedPolicies[0], 'linux')).toBe(true);
  });

  it('performs no update at all when nothing is missing', async () => {
    const policy = generatePolicyMock();
    const policyConfig = policyConfigOf(policy);
    policyConfig.windows.memory_protection.custom_yara_signatures = true;
    policyConfig.mac.memory_protection.custom_yara_signatures = false;
    policyConfig.linux.memory_protection.custom_yara_signatures = true;

    mockPolicyListResponse({ items: [policy] });

    await callBackfill();

    expect(fleetServices.packagePolicy.bulkUpdate).not.toHaveBeenCalled();
  });

  it('skips entirely when the experimental flag is off', async () => {
    experimentalFeatures = {
      ...experimentalFeatures,
      customYaraSignaturesEnabled: false,
    };
    const policy = generatePolicyMock();
    unsetCustomYaraSignatures(policy);
    mockPolicyListResponse({ items: [policy] });

    await callBackfill();

    expect(fleetServices.packagePolicy.list).not.toHaveBeenCalled();
    expect(fleetServices.packagePolicy.bulkUpdate).not.toHaveBeenCalled();
  });

  it('skips entirely when the product feature is off', async () => {
    productFeatureService = createProductFeaturesServiceMock(
      ALL_PRODUCT_FEATURE_KEYS.filter(
        (key) => key !== ProductFeatureSecurityKey.endpointCustomYaraSignatures
      )
    );
    const policy = generatePolicyMock();
    unsetCustomYaraSignatures(policy);
    mockPolicyListResponse({ items: [policy] });

    await callBackfill();

    expect(fleetServices.packagePolicy.list).not.toHaveBeenCalled();
    expect(fleetServices.packagePolicy.bulkUpdate).not.toHaveBeenCalled();
  });

  it('skips entirely when the license is below Enterprise', async () => {
    licenseService.stop();
    licenseService = new LicenseService();
    licenseService.start(of(platinumLicense));
    const policy = generatePolicyMock();
    unsetCustomYaraSignatures(policy);
    mockPolicyListResponse({ items: [policy] });

    await callBackfill();

    expect(fleetServices.packagePolicy.list).not.toHaveBeenCalled();
    expect(fleetServices.packagePolicy.bulkUpdate).not.toHaveBeenCalled();
  });

  it('paginates over more than one page', async () => {
    const firstPagePolicy = generatePolicyMock();
    const secondPagePolicy = generatePolicyMock();
    unsetCustomYaraSignatures(firstPagePolicy);
    unsetCustomYaraSignatures(secondPagePolicy);

    mockPolicyListResponse({ total: 1500, items: [firstPagePolicy] });
    mockPolicyListResponse({ total: 1500, items: [secondPagePolicy] });

    await callBackfill();

    expect(fleetServices.packagePolicy.list).toHaveBeenCalledTimes(2);
    expect(fleetServices.packagePolicy.bulkUpdate).toHaveBeenCalledTimes(1);
    const updatedPolicies = (fleetServices.packagePolicy.bulkUpdate as jest.Mock).mock.calls[0][2];
    expect(updatedPolicies).toHaveLength(2);
    expect(updatedPolicies[0].id).toBe(firstPagePolicy.id);
    expect(updatedPolicies[1].id).toBe(secondPagePolicy.id);
  });
});
