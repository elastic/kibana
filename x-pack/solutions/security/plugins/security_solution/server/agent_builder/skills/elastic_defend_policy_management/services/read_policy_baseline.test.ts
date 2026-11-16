/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ILicense } from '@kbn/licensing-types';
import { EndpointAppContextService } from '../../../../endpoint/endpoint_app_context_services';
import {
  createMockEndpointAppContextServiceSetupContract,
  createMockEndpointAppContextServiceStartContract,
} from '../../../../endpoint/mocks';
import { PolicyBaselineUnavailableError } from './policy_errors';
import { readPolicyBaseline } from './read_policy_baseline';

const availableLicense = {
  isAvailable: true,
  type: 'platinum',
  uid: 'license-uid',
} as unknown as ILicense;

describe('readPolicyBaseline', () => {
  const createStartedService = ({ isOptedIn = true as boolean | 'unresolved' } = {}) => {
    const service = new EndpointAppContextService();
    const setupContract = createMockEndpointAppContextServiceSetupContract();
    const startContract = createMockEndpointAppContextServiceStartContract();
    startContract.licenseService.getLicenseInformation = jest
      .fn()
      .mockReturnValue(availableLicense);
    startContract.licenseService.getLicenseType = jest.fn().mockReturnValue('platinum');
    startContract.licenseService.getLicenseUID = jest.fn().mockReturnValue('license-uid');
    startContract.telemetryConfigProvider.getIsOptedIn.mockReturnValue(
      isOptedIn === 'unresolved' ? undefined : isOptedIn
    );
    service.setup(setupContract);
    service.start(startContract);
    return { service, startContract };
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns the baseline identity and environment for a named preset', () => {
    const { service } = createStartedService();

    const baseline = readPolicyBaseline(service, { preset: 'EDRComplete' });

    expect(baseline.kind).toBe('baseline');
    expect(baseline.preset).toBe('EDRComplete');
    expect(baseline.environment).toEqual({
      license: 'platinum',
      cloud: true,
      telemetryOptedIn: true,
    });
  });

  it('performs no policy-data or ES info I/O', () => {
    const { service, startContract } = createStartedService();

    readPolicyBaseline(service, { preset: 'NGAV' });

    expect(startContract.esClient.info).not.toHaveBeenCalled();
    expect(startContract.fleetStartServices.packagePolicyService.list).not.toHaveBeenCalled();
    expect(startContract.fleetStartServices.packagePolicyService.get).not.toHaveBeenCalled();
  });

  it('keeps the reported telemetry environment consistent with the computed config fallback', () => {
    const unresolved = createStartedService({ isOptedIn: 'unresolved' });
    const unresolvedBaseline = readPolicyBaseline(unresolved.service, { preset: 'NGAV' });

    expect(unresolvedBaseline.environment.telemetryOptedIn).toBe('unresolved');
    expect(unresolvedBaseline.normalizedConfig.global_telemetry_enabled).toBe(false);

    const resolved = createStartedService({ isOptedIn: false });
    const resolvedBaseline = readPolicyBaseline(resolved.service, { preset: 'NGAV' });

    expect(resolvedBaseline.environment.telemetryOptedIn).toBe(false);
    expect(resolvedBaseline.normalizedConfig.global_telemetry_enabled).toBe(false);

    const resolvedTrue = createStartedService({ isOptedIn: true });
    const resolvedTrueBaseline = readPolicyBaseline(resolvedTrue.service, { preset: 'NGAV' });

    expect(resolvedTrueBaseline.environment.telemetryOptedIn).toBe(true);
    expect(resolvedTrueBaseline.normalizedConfig.global_telemetry_enabled).toBe(true);
  });

  it('forwards the named preset to the default policy factory', () => {
    const { service } = createStartedService();

    const edrComplete = readPolicyBaseline(service, { preset: 'EDRComplete' });
    const dataCollection = readPolicyBaseline(service, { preset: 'DataCollection' });

    expect(dataCollection.summary.windowsProtectionModes.malware).not.toBe(
      edrComplete.summary.windowsProtectionModes.malware
    );
  });

  it('refuses to compute a baseline when the license is unavailable', () => {
    const { service } = createStartedService();
    service.getLicenseService().getLicenseInformation = jest.fn().mockReturnValue(null);

    expect(() => readPolicyBaseline(service, { preset: 'EDRComplete' })).toThrow(
      PolicyBaselineUnavailableError
    );
  });
});
