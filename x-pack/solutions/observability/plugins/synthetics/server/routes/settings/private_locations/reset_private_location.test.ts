/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PrivateLocationHealthStatusValue } from '../../../../common/runtime_types';
import { PRIVATE_LOCATION_WRITE_API } from '../../../feature';
import { resetPrivateLocationRoute } from './reset_private_location';

jest.mock('../../../synthetics_service/get_private_locations', () => ({
  getPrivateLocations: jest.fn(),
}));

import { getPrivateLocations } from '../../../synthetics_service/get_private_locations';

const mockedGetPrivateLocations = getPrivateLocations as jest.MockedFunction<
  typeof getPrivateLocations
>;

const LOCATION = { id: 'loc-1', label: 'Location 1', agentPolicyId: 'policy-1' };

const healthFor = (configId: string, status: PrivateLocationHealthStatusValue) => ({
  configId,
  monitorName: configId,
  isHealthy: status === PrivateLocationHealthStatusValue.Healthy,
  privateLocations: [
    { locationId: 'loc-1', locationLabel: 'Location 1', status, packagePolicyId: '' },
  ],
});

const decrypted = (id: string, error?: { message: string }) => ({
  id,
  attributes: { name: id, locations: [{ id: 'loc-1', isServiceManaged: false }], secrets: '{}' },
  ...(error ? { error } : {}),
});

const buildContext = ({
  health = [],
  createResult = { created: [], failed: [] },
  decryptedMonitors = [decrypted('mon-missing')],
}: {
  health?: Array<ReturnType<typeof healthFor>>;
  createResult?: { created: unknown[]; failed: unknown[] };
  decryptedMonitors?: Array<ReturnType<typeof decrypted>>;
} = {}) => {
  const response = { notFound: jest.fn().mockReturnValue('not-found') };
  const monitorIntegrationHealthApi = {
    getHealthForLocations: jest.fn().mockResolvedValue({ monitors: health, errors: [] }),
  };
  const monitorConfigRepository = {
    findDecryptedMonitors: jest.fn().mockResolvedValue(decryptedMonitors),
  };
  const syntheticsMonitorClient = {
    addPrivateLocationPackagePolicies: jest.fn().mockResolvedValue(createResult),
  };
  const context = {
    request: { params: { id: 'loc-1' } },
    response,
    savedObjectsClient: {},
    spaceId: 'default',
    monitorIntegrationHealthApi,
    monitorConfigRepository,
    syntheticsMonitorClient,
  } as unknown as Parameters<ReturnType<typeof resetPrivateLocationRoute>['handler']>[0];

  return { context, response, monitorConfigRepository, syntheticsMonitorClient };
};

describe('resetPrivateLocationRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetPrivateLocations.mockResolvedValue([LOCATION] as any);
  });

  it('returns 404 when the location does not exist', async () => {
    mockedGetPrivateLocations.mockResolvedValue([]);
    const { context, response } = buildContext();

    expect(await resetPrivateLocationRoute().handler(context)).toBe('not-found');
    expect(response.notFound).toHaveBeenCalled();
  });

  it('does nothing when no package policy is missing', async () => {
    const { context, monitorConfigRepository, syntheticsMonitorClient } = buildContext({
      health: [healthFor('mon-healthy', PrivateLocationHealthStatusValue.Healthy)],
    });

    expect(await resetPrivateLocationRoute().handler(context)).toEqual({ created: 0, failed: [] });
    expect(monitorConfigRepository.findDecryptedMonitors).not.toHaveBeenCalled();
    expect(syntheticsMonitorClient.addPrivateLocationPackagePolicies).not.toHaveBeenCalled();
  });

  it('recreates only the missing package policies of the location', async () => {
    const { context, syntheticsMonitorClient } = buildContext({
      health: [
        healthFor('mon-missing', PrivateLocationHealthStatusValue.MissingPackagePolicy),
        healthFor('mon-healthy', PrivateLocationHealthStatusValue.Healthy),
      ],
      createResult: {
        created: [{ id: 'mon-missing-loc-1' }],
        failed: [{ packagePolicy: { id: 'other-loc-1' }, error: new Error('conflict') }],
      },
    });

    expect(await resetPrivateLocationRoute().handler(context)).toEqual({
      created: 1,
      failed: [{ id: 'other-loc-1', error: 'conflict' }],
    });

    const [[args]] = syntheticsMonitorClient.addPrivateLocationPackagePolicies.mock.calls;
    expect(args.locationId).toBe('loc-1');
    expect(args.spaceId).toBe('default');
    expect(args.monitors.map(({ id }: { id: string }) => id)).toEqual(['mon-missing']);
  });

  it('only decrypts the monitors with a missing package policy', async () => {
    const { context, monitorConfigRepository } = buildContext({
      health: [
        healthFor('mon-missing', PrivateLocationHealthStatusValue.MissingPackagePolicy),
        healthFor('mon-healthy', PrivateLocationHealthStatusValue.Healthy),
      ],
    });

    await resetPrivateLocationRoute().handler(context);

    const [[{ filter }]] = monitorConfigRepository.findDecryptedMonitors.mock.calls;
    expect(filter).toContain('mon-missing');
    expect(filter).not.toContain('mon-healthy');
  });

  it('does not recreate policies for monitors that failed to decrypt', async () => {
    const { context, syntheticsMonitorClient } = buildContext({
      health: [
        healthFor('mon-ok', PrivateLocationHealthStatusValue.MissingPackagePolicy),
        healthFor('mon-broken', PrivateLocationHealthStatusValue.MissingPackagePolicy),
      ],
      decryptedMonitors: [
        decrypted('mon-ok'),
        decrypted('mon-broken', { message: 'Unable to decrypt' }),
      ],
      createResult: { created: [{ id: 'mon-ok-loc-1' }], failed: [] },
    });

    expect(await resetPrivateLocationRoute().handler(context)).toEqual({
      created: 1,
      failed: [{ id: 'mon-broken', error: 'Unable to decrypt' }],
    });
    const [[args]] = syntheticsMonitorClient.addPrivateLocationPackagePolicies.mock.calls;
    expect(args.monitors.map(({ id }: { id: string }) => id)).toEqual(['mon-ok']);
  });

  it('skips Fleet entirely when every monitor failed to decrypt', async () => {
    const { context, syntheticsMonitorClient } = buildContext({
      health: [healthFor('mon-broken', PrivateLocationHealthStatusValue.MissingPackagePolicy)],
      decryptedMonitors: [decrypted('mon-broken', { message: 'Unable to decrypt' })],
    });

    expect(await resetPrivateLocationRoute().handler(context)).toEqual({
      created: 0,
      failed: [{ id: 'mon-broken', error: 'Unable to decrypt' }],
    });
    expect(syntheticsMonitorClient.addPrivateLocationPackagePolicies).not.toHaveBeenCalled();
  });

  it('requires the private location write privilege', () => {
    expect(resetPrivateLocationRoute().requiredPrivileges).toEqual([PRIVATE_LOCATION_WRITE_API]);
  });
});
