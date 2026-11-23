/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ILicense } from '@kbn/licensing-types';
import { EndpointAppContextService } from '../../../../endpoint/endpoint_app_context_services';
import { EndpointAppContentServicesNotStartedError } from '../../../../endpoint/errors';
import {
  createMockEndpointAppContextServiceSetupContract,
  createMockEndpointAppContextServiceStartContract,
} from '../../../../endpoint/mocks';
import { PolicyBaselineUnavailableError } from './policy_errors';
import { resolveDefaultPolicyEnvironment } from './resolve_default_policy_environment';

const availableLicense = {
  isAvailable: true,
  type: 'platinum',
  uid: 'license-uid',
} as unknown as ILicense;

describe('resolveDefaultPolicyEnvironment', () => {
  const createStartedService = ({
    license = availableLicense as ILicense | null,
    licenseType = 'platinum',
    isCloudEnabled = true,
    isOptedIn = true as boolean | 'unresolved',
  } = {}) => {
    const service = new EndpointAppContextService();
    const setupContract = createMockEndpointAppContextServiceSetupContract();
    setupContract.cloud = { ...setupContract.cloud, isCloudEnabled };
    const startContract = createMockEndpointAppContextServiceStartContract();
    startContract.licenseService.getLicenseInformation = jest.fn().mockReturnValue(license);
    startContract.licenseService.getLicenseType = jest.fn().mockReturnValue(licenseType);
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

  it('reports the license, cloud, and telemetry inputs the baseline computation uses', () => {
    const { service } = createStartedService({ isCloudEnabled: false });

    expect(resolveDefaultPolicyEnvironment(service)).toEqual({
      license: 'platinum',
      cloud: false,
      telemetryOptedIn: true,
    });
  });

  it('reports telemetry as unresolved when the provider has no resolved opt-in value', () => {
    const { service } = createStartedService({ isOptedIn: 'unresolved' });

    expect(resolveDefaultPolicyEnvironment(service).telemetryOptedIn).toBe('unresolved');
  });

  it('refuses a missing license with PolicyBaselineUnavailableError', () => {
    const { service } = createStartedService({ license: null });

    expect(() => resolveDefaultPolicyEnvironment(service)).toThrow(PolicyBaselineUnavailableError);
  });

  it('refuses an unavailable license with PolicyBaselineUnavailableError', () => {
    const unavailable = { ...availableLicense, isAvailable: false } as unknown as ILicense;
    const { service } = createStartedService({ license: unavailable });

    expect(() => resolveDefaultPolicyEnvironment(service)).toThrow(PolicyBaselineUnavailableError);
  });

  it('refuses an empty license type with PolicyBaselineUnavailableError', () => {
    const { service } = createStartedService({ licenseType: '' });

    expect(() => resolveDefaultPolicyEnvironment(service)).toThrow(PolicyBaselineUnavailableError);
  });

  it('does not report a baseline-unavailable refusal when the service was never started', () => {
    const service = new EndpointAppContextService();

    expect(() => resolveDefaultPolicyEnvironment(service)).toThrow(
      EndpointAppContentServicesNotStartedError
    );
  });
});
