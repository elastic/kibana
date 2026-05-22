/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject, SavedObjectsClientContract } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { PackagePolicy } from '@kbn/fleet-plugin/common';
import {
  ConfigKey,
  PrivateLocationHealthStatusValue,
  SourceType,
  type EncryptedSyntheticsMonitorAttributes,
} from '../../common/runtime_types';
import type { PrivateLocationAttributes } from '../runtime_types/private_locations';
import type { SyntheticsServerSetup } from '../types';
import type { MonitorConfigRepository } from './monitor_config_repository';
import { MonitorIntegrationHealthApi } from './monitor_integration_health_api';

jest.mock('../synthetics_service/get_private_locations');
jest.mock('../synthetics_service/private_location/synthetics_private_location');
jest.mock('../synthetics_service/private_location/package_policy_service');

import { getPrivateLocationsForNamespaces } from '../synthetics_service/get_private_locations';
import { SyntheticsPrivateLocation } from '../synthetics_service/private_location/synthetics_private_location';
import { PackagePolicyService } from '../synthetics_service/private_location/package_policy_service';

const mockedGetPrivateLocationsForNamespaces =
  getPrivateLocationsForNamespaces as jest.MockedFunction<typeof getPrivateLocationsForNamespaces>;
const MockedSyntheticsPrivateLocation = SyntheticsPrivateLocation as jest.MockedClass<
  typeof SyntheticsPrivateLocation
>;
const MockedPackagePolicyService = PackagePolicyService as jest.MockedClass<
  typeof PackagePolicyService
>;

const SPACE_ID = 'default';

const createMonitorSO = (
  id: string,
  opts: {
    name?: string;
    origin?: string;
    monitorQueryId?: string;
    locations?: Array<{ id: string; label?: string; isServiceManaged: boolean }>;
  } = {}
): SavedObject<EncryptedSyntheticsMonitorAttributes> =>
  ({
    id,
    attributes: {
      [ConfigKey.NAME]: opts.name ?? `Monitor ${id}`,
      [ConfigKey.MONITOR_SOURCE_TYPE]: opts.origin ?? SourceType.UI,
      [ConfigKey.MONITOR_QUERY_ID]: opts.monitorQueryId ?? id,
      [ConfigKey.LOCATIONS]: opts.locations ?? [],
    },
  } as unknown as SavedObject<EncryptedSyntheticsMonitorAttributes>);

const createPrivateLocation = (
  id: string,
  agentPolicyId: string,
  label?: string
): PrivateLocationAttributes => ({
  id,
  label: label ?? `Private Location ${id}`,
  agentPolicyId,
  isServiceManaged: false,
});

const createPackagePolicy = (policyId: string, agentPolicyIds: string[]): PackagePolicy =>
  ({
    id: policyId,
    policy_ids: agentPolicyIds,
  } as unknown as PackagePolicy);

interface BuildApiOverrides {
  monitorConfigRepository?: { getAcrossSpaces: jest.Mock };
  /**
   * Mocks the Synthetics PackagePolicyService wrapper that the health API
   * uses to fetch package policies across spaces.
   */
  packagePolicyServiceGetByIds?: jest.Mock;
  fleetAgentPolicyGetByIds?: jest.Mock;
  fleetGetInstallation?: jest.Mock;
  fleetGetAgentStatusForAgentPolicy?: jest.Mock;
  getUnsafeInternalClient?: jest.Mock;
  spaceId?: string;
}

const buildApi = (overrides: BuildApiOverrides = {}): MonitorIntegrationHealthApi => {
  const packagePolicyServiceGetByIds =
    overrides.packagePolicyServiceGetByIds ?? jest.fn().mockResolvedValue([]);

  MockedPackagePolicyService.mockImplementation(
    () =>
      ({
        getByIds: packagePolicyServiceGetByIds,
      } as any)
  );

  const fleetAgentPolicyGetByIds =
    overrides.fleetAgentPolicyGetByIds ??
    jest
      .fn()
      .mockImplementation(async (_soClient: any, ids: string[]) => ids.map((id) => ({ id })));

  const fleetGetInstallation =
    overrides.fleetGetInstallation ?? jest.fn().mockResolvedValue({ install_status: 'installed' });

  // Default: all agents healthy (active > 0, online > 0)
  const fleetGetAgentStatusForAgentPolicy =
    overrides.fleetGetAgentStatusForAgentPolicy ??
    jest.fn().mockResolvedValue({ all: 1, active: 1, online: 1 });

  const server = {
    coreStart: {
      savedObjects: {
        createInternalRepository: jest.fn().mockReturnValue({}),
        getUnsafeInternalClient:
          overrides.getUnsafeInternalClient ??
          jest.fn().mockReturnValue({ asScopedToNamespace: jest.fn().mockReturnValue({}) }),
      },
    },
    fleet: {
      agentPolicyService: { getByIds: fleetAgentPolicyGetByIds },
      packageService: {
        asInternalUser: { getInstallation: fleetGetInstallation },
      },
      agentService: {
        asInternalUser: {
          getAgentStatusForAgentPolicy: fleetGetAgentStatusForAgentPolicy,
        },
      },
    },
  } as unknown as SyntheticsServerSetup;

  const savedObjectsClient = {} as SavedObjectsClientContract;

  const monitorConfigRepository = (overrides.monitorConfigRepository ?? {
    getAcrossSpaces: jest.fn(),
  }) as unknown as MonitorConfigRepository;

  return new MonitorIntegrationHealthApi(
    server,
    savedObjectsClient,
    monitorConfigRepository,
    overrides.spaceId ?? SPACE_ID
  );
};

describe('MonitorIntegrationHealthApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    MockedSyntheticsPrivateLocation.mockImplementation(
      () =>
        ({
          getPolicyId: jest.fn(
            (config: { origin?: string; id: string }, locId: string) => `${config.id}-${locId}`
          ),
          getLegacyPolicyIdsForAllSpaces: jest.fn(
            (configId: string, locId: string, spaces: Set<string>) =>
              [...spaces].map((s) => `${configId}-${locId}-${s}`)
          ),
          getAllSpacesWithMonitors: jest.fn().mockResolvedValue([SPACE_ID]),
          getPolicyIdFormatInfo: jest.fn(
            (
              config: { id: string },
              locId: string,
              existingPolicies: Array<{ id: string }> | undefined,
              spaces: Set<string>
            ) => {
              const newId = `${config.id}-${locId}`;
              const hasNewFormatPolicyId = existingPolicies?.some((p) => p.id === newId) ?? false;
              const legacyPrefix = `${config.id}-${locId}-`;
              const legacyPolicyIds =
                existingPolicies
                  ?.filter(
                    (p) =>
                      p.id.startsWith(legacyPrefix) && spaces.has(p.id.slice(legacyPrefix.length))
                  )
                  .map((p) => p.id) ?? [];
              return {
                hasNewFormatPolicyId,
                hasAnyLegacyPolicyId: legacyPolicyIds.length > 0,
                legacyPolicyIds,
              };
            }
          ),
        } as any)
    );

    mockedGetPrivateLocationsForNamespaces.mockResolvedValue([]);
  });

  describe('monitor fetching and partial errors', () => {
    it('returns empty monitors and errors when all monitors fail to fetch', async () => {
      const notFoundError = SavedObjectsErrorHelpers.createGenericNotFoundError(
        'synthetics-monitor',
        'mon-1'
      );
      const api = buildApi({
        monitorConfigRepository: {
          getAcrossSpaces: jest.fn().mockRejectedValue(notFoundError),
        },
      });

      const result = await api.getHealth(['mon-1', 'mon-2']);

      expect(result.monitors).toHaveLength(0);
      expect(result.errors).toEqual([
        { configId: 'mon-1', message: notFoundError.message, statusCode: 404 },
        { configId: 'mon-2', message: notFoundError.message, statusCode: 404 },
      ]);
    });

    it('returns partial results when some monitors fail', async () => {
      const successSO = createMonitorSO('mon-1', { name: 'Good Monitor' });
      const notFoundError = SavedObjectsErrorHelpers.createGenericNotFoundError(
        'synthetics-monitor',
        'mon-2'
      );
      const getMock = jest
        .fn()
        .mockResolvedValueOnce(successSO)
        .mockRejectedValueOnce(notFoundError);

      const api = buildApi({ monitorConfigRepository: { getAcrossSpaces: getMock } });

      const result = await api.getHealth(['mon-1', 'mon-2']);

      expect(result.monitors).toHaveLength(1);
      expect(result.monitors[0].configId).toBe('mon-1');
      expect(result.errors).toEqual([
        { configId: 'mon-2', message: notFoundError.message, statusCode: 404 },
      ]);
    });

    it('provides a default error message when rejection has no message', async () => {
      const api = buildApi({
        monitorConfigRepository: {
          getAcrossSpaces: jest.fn().mockRejectedValue({}),
        },
      });

      const result = await api.getHealth(['mon-1']);

      expect(result.errors).toEqual([
        { configId: 'mon-1', message: 'Failed to fetch monitor', statusCode: 500 },
      ]);
    });

    it('includes statusCode for non-404 SavedObjects errors via output.statusCode', async () => {
      const forbiddenError = SavedObjectsErrorHelpers.decorateForbiddenError(
        new Error('Access denied')
      );
      const api = buildApi({
        monitorConfigRepository: {
          getAcrossSpaces: jest.fn().mockRejectedValue(forbiddenError),
        },
      });

      const result = await api.getHealth(['mon-1']);

      expect(result.errors).toEqual([
        { configId: 'mon-1', message: 'Access denied', statusCode: 403 },
      ]);
    });

    it('defaults statusCode to 500 for generic errors without output.statusCode', async () => {
      const api = buildApi({
        monitorConfigRepository: {
          getAcrossSpaces: jest.fn().mockRejectedValue(new Error('Something went wrong')),
        },
      });

      const result = await api.getHealth(['mon-1']);

      expect(result.errors).toEqual([
        { configId: 'mon-1', message: 'Something went wrong', statusCode: 500 },
      ]);
    });
  });

  describe('monitors with no private locations', () => {
    it('returns healthy status with empty locations for monitors using only managed locations', async () => {
      const so = createMonitorSO('mon-1', {
        locations: [{ id: 'us-east-1', label: 'US East', isServiceManaged: true }],
      });

      const api = buildApi({
        monitorConfigRepository: { getAcrossSpaces: jest.fn().mockResolvedValue(so) },
      });

      const result = await api.getHealth(['mon-1']);

      expect(result.monitors).toEqual([
        {
          configId: 'mon-1',
          monitorName: 'Monitor mon-1',
          isHealthy: true,
          privateLocations: [],
        },
      ]);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('healthy monitors', () => {
    it('returns healthy when package policy exists and agent policy matches', async () => {
      const privateLoc = createPrivateLocation('priv-loc-1', 'agent-policy-1');
      const so = createMonitorSO('mon-1', {
        locations: [{ id: 'priv-loc-1', label: 'Private Loc 1', isServiceManaged: false }],
      });

      mockedGetPrivateLocationsForNamespaces.mockResolvedValue([privateLoc]);

      const expectedPolicyId = 'mon-1-priv-loc-1';
      const packagePolicy = createPackagePolicy(expectedPolicyId, ['agent-policy-1']);
      const packagePolicyServiceGetByIds = jest.fn().mockResolvedValue([packagePolicy]);

      const api = buildApi({
        monitorConfigRepository: { getAcrossSpaces: jest.fn().mockResolvedValue(so) },
        packagePolicyServiceGetByIds,
      });

      const result = await api.getHealth(['mon-1']);

      expect(result.monitors).toEqual([
        {
          configId: 'mon-1',
          monitorName: 'Monitor mon-1',
          isHealthy: true,
          privateLocations: [
            {
              locationId: 'priv-loc-1',
              locationLabel: 'Private Location priv-loc-1',
              status: PrivateLocationHealthStatusValue.Healthy,
              packagePolicyId: expectedPolicyId,
              agentPolicyId: 'agent-policy-1',
            },
          ],
        },
      ]);
    });
  });

  describe('missing package policy', () => {
    it('returns MissingPackagePolicy when the fleet package policy does not exist', async () => {
      const privateLoc = createPrivateLocation('priv-loc-1', 'agent-policy-1');
      const so = createMonitorSO('mon-1', {
        locations: [{ id: 'priv-loc-1', label: 'Private Loc 1', isServiceManaged: false }],
      });

      mockedGetPrivateLocationsForNamespaces.mockResolvedValue([privateLoc]);

      const packagePolicyServiceGetByIds = jest.fn().mockResolvedValue([]);
      const api = buildApi({
        monitorConfigRepository: { getAcrossSpaces: jest.fn().mockResolvedValue(so) },
        packagePolicyServiceGetByIds,
      });

      const result = await api.getHealth(['mon-1']);

      const locStatus = result.monitors[0].privateLocations[0];
      expect(locStatus.status).toBe(PrivateLocationHealthStatusValue.MissingPackagePolicy);
      expect(locStatus.reason).toBeDefined();
      expect(result.monitors[0].isHealthy).toBe(false);
    });
  });

  describe('missing private location', () => {
    it('returns MissingLocation when monitor references a private location that no longer exists', async () => {
      const so = createMonitorSO('mon-1', {
        locations: [{ id: 'gone-loc', label: 'Gone Location', isServiceManaged: false }],
      });

      mockedGetPrivateLocationsForNamespaces.mockResolvedValue([]);

      const api = buildApi({
        monitorConfigRepository: { getAcrossSpaces: jest.fn().mockResolvedValue(so) },
      });

      const result = await api.getHealth(['mon-1']);

      const locStatus = result.monitors[0].privateLocations[0];
      expect(locStatus.status).toBe(PrivateLocationHealthStatusValue.MissingLocation);
      expect(locStatus.locationLabel).toBe('Gone Location');
      expect(locStatus.reason).toBeDefined();
      expect(result.monitors[0].isHealthy).toBe(false);
    });

    it('falls back to location id when label is missing', async () => {
      const so = createMonitorSO('mon-1', {
        locations: [{ id: 'gone-loc', isServiceManaged: false }],
      });

      mockedGetPrivateLocationsForNamespaces.mockResolvedValue([]);

      const api = buildApi({
        monitorConfigRepository: { getAcrossSpaces: jest.fn().mockResolvedValue(so) },
      });

      const result = await api.getHealth(['mon-1']);

      expect(result.monitors[0].privateLocations[0].locationLabel).toBe('gone-loc');
    });
  });

  describe('missing agent policy', () => {
    it('returns MissingAgentPolicy when the agent policy referenced by the private location no longer exists', async () => {
      const privateLoc = createPrivateLocation('priv-loc-1', 'deleted-agent-policy');
      const so = createMonitorSO('mon-1', {
        locations: [{ id: 'priv-loc-1', label: 'Private Loc 1', isServiceManaged: false }],
      });

      mockedGetPrivateLocationsForNamespaces.mockResolvedValue([privateLoc]);

      const fleetAgentPolicyGetByIds = jest.fn().mockResolvedValue([]);
      const api = buildApi({
        monitorConfigRepository: { getAcrossSpaces: jest.fn().mockResolvedValue(so) },
        fleetAgentPolicyGetByIds,
      });

      const result = await api.getHealth(['mon-1']);

      const locStatus = result.monitors[0].privateLocations[0];
      expect(locStatus.status).toBe(PrivateLocationHealthStatusValue.MissingAgentPolicy);
      expect(locStatus.reason).toBeDefined();
      expect(result.monitors[0].isHealthy).toBe(false);
    });

    it('correctly distinguishes between existing and missing agent policies across locations', async () => {
      const privateLoc1 = createPrivateLocation('loc-1', 'existing-agent', 'Location 1');
      const privateLoc2 = createPrivateLocation('loc-2', 'deleted-agent', 'Location 2');

      const so = createMonitorSO('mon-1', {
        locations: [
          { id: 'loc-1', label: 'Location 1', isServiceManaged: false },
          { id: 'loc-2', label: 'Location 2', isServiceManaged: false },
        ],
      });

      mockedGetPrivateLocationsForNamespaces.mockResolvedValue([privateLoc1, privateLoc2]);

      const expectedPolicyId1 = 'mon-1-loc-1';
      const packagePolicyServiceGetByIds = jest
        .fn()
        .mockResolvedValue([createPackagePolicy(expectedPolicyId1, ['existing-agent'])]);
      const fleetAgentPolicyGetByIds = jest.fn().mockResolvedValue([{ id: 'existing-agent' }]);

      const api = buildApi({
        monitorConfigRepository: { getAcrossSpaces: jest.fn().mockResolvedValue(so) },
        packagePolicyServiceGetByIds,
        fleetAgentPolicyGetByIds,
      });

      const result = await api.getHealth(['mon-1']);

      expect(result.monitors[0].privateLocations[0].status).toBe(
        PrivateLocationHealthStatusValue.Healthy
      );
      expect(result.monitors[0].privateLocations[1].status).toBe(
        PrivateLocationHealthStatusValue.MissingAgentPolicy
      );
    });
  });

  describe('project monitors use different policy ID format', () => {
    it('generates policy ID without spaceId for project-origin monitors', async () => {
      const privateLoc = createPrivateLocation('priv-loc-1', 'agent-policy-1');
      const so = createMonitorSO('mon-1', {
        origin: SourceType.PROJECT,
        locations: [{ id: 'priv-loc-1', label: 'Private Loc 1', isServiceManaged: false }],
      });

      mockedGetPrivateLocationsForNamespaces.mockResolvedValue([privateLoc]);

      const expectedPolicyId = 'mon-1-priv-loc-1';
      const packagePolicy = createPackagePolicy(expectedPolicyId, ['agent-policy-1']);
      const packagePolicyServiceGetByIds = jest.fn().mockResolvedValue([packagePolicy]);

      const api = buildApi({
        monitorConfigRepository: { getAcrossSpaces: jest.fn().mockResolvedValue(so) },
        packagePolicyServiceGetByIds,
      });

      const result = await api.getHealth(['mon-1']);

      expect(result.monitors[0].privateLocations[0].status).toBe(
        PrivateLocationHealthStatusValue.Healthy
      );
      expect(result.monitors[0].privateLocations[0].packagePolicyId).toBe(expectedPolicyId);
    });

    it('uses MONITOR_QUERY_ID when it differs from the saved object id', async () => {
      const privateLoc = createPrivateLocation('priv-loc-1', 'agent-policy-1');
      const monitorQueryId = 'journey-project-default';
      const so = createMonitorSO('so-uuid', {
        origin: SourceType.PROJECT,
        monitorQueryId,
        locations: [{ id: 'priv-loc-1', label: 'Private Loc 1', isServiceManaged: false }],
      });

      mockedGetPrivateLocationsForNamespaces.mockResolvedValue([privateLoc]);

      const expectedPolicyId = `${monitorQueryId}-priv-loc-1`;
      const wrongPolicyId = `so-uuid-priv-loc-1`;
      const packagePolicy = createPackagePolicy(expectedPolicyId, ['agent-policy-1']);
      const packagePolicyServiceGetByIds = jest.fn().mockResolvedValue([packagePolicy]);

      const api = buildApi({
        monitorConfigRepository: { getAcrossSpaces: jest.fn().mockResolvedValue(so) },
        packagePolicyServiceGetByIds,
      });

      const result = await api.getHealth(['so-uuid']);

      expect(packagePolicyServiceGetByIds).toHaveBeenCalledWith(
        expect.objectContaining({
          packagePolicyIds: expect.arrayContaining([expectedPolicyId]),
        })
      );
      expect(packagePolicyServiceGetByIds).not.toHaveBeenCalledWith(
        expect.objectContaining({
          packagePolicyIds: expect.arrayContaining([wrongPolicyId]),
        })
      );
      expect(result.monitors[0].privateLocations[0].status).toBe(
        PrivateLocationHealthStatusValue.Healthy
      );
      expect(result.monitors[0].privateLocations[0].packagePolicyId).toBe(expectedPolicyId);
    });
  });

  describe('multiple monitors and locations', () => {
    it('handles mixed statuses across monitors and locations', async () => {
      const privateLoc1 = createPrivateLocation('loc-1', 'agent-1', 'Location 1');
      const privateLoc2 = createPrivateLocation('loc-2', 'agent-2', 'Location 2');

      const so1 = createMonitorSO('mon-1', {
        name: 'Monitor A',
        locations: [
          { id: 'loc-1', label: 'Location 1', isServiceManaged: false },
          { id: 'loc-2', label: 'Location 2', isServiceManaged: false },
        ],
      });

      const so2 = createMonitorSO('mon-2', {
        name: 'Monitor B',
        locations: [
          { id: 'loc-1', label: 'Location 1', isServiceManaged: false },
          { id: 'vanished', label: 'Vanished', isServiceManaged: false },
        ],
      });

      mockedGetPrivateLocationsForNamespaces.mockResolvedValue([privateLoc1, privateLoc2]);

      const packagePolicyServiceGetByIds = jest
        .fn()
        .mockResolvedValue([
          createPackagePolicy('mon-1-loc-1', ['agent-1']),
          createPackagePolicy('mon-2-loc-1', ['agent-1']),
        ]);

      const getMock = jest.fn().mockResolvedValueOnce(so1).mockResolvedValueOnce(so2);

      const api = buildApi({
        monitorConfigRepository: { getAcrossSpaces: getMock },
        packagePolicyServiceGetByIds,
      });

      const result = await api.getHealth(['mon-1', 'mon-2']);

      expect(result.monitors).toHaveLength(2);

      const mon1 = result.monitors[0];
      expect(mon1.configId).toBe('mon-1');
      expect(mon1.privateLocations[0].status).toBe(PrivateLocationHealthStatusValue.Healthy);
      expect(mon1.privateLocations[1].status).toBe(
        PrivateLocationHealthStatusValue.MissingPackagePolicy
      );
      expect(mon1.isHealthy).toBe(false);

      const mon2 = result.monitors[1];
      expect(mon2.configId).toBe('mon-2');
      expect(mon2.privateLocations[0].status).toBe(PrivateLocationHealthStatusValue.Healthy);
      expect(mon2.privateLocations[1].status).toBe(
        PrivateLocationHealthStatusValue.MissingLocation
      );
      expect(mon2.isHealthy).toBe(false);
    });
  });

  describe('legacy policy ID format', () => {
    it('reports healthy when only a legacy-format policy exists', async () => {
      const privateLoc = createPrivateLocation('priv-loc-1', 'agent-policy-1');
      const so = createMonitorSO('mon-1', {
        locations: [{ id: 'priv-loc-1', label: 'Private Loc 1', isServiceManaged: false }],
      });

      mockedGetPrivateLocationsForNamespaces.mockResolvedValue([privateLoc]);

      const legacyPolicyId = `mon-1-priv-loc-1-${SPACE_ID}`;
      const packagePolicy = createPackagePolicy(legacyPolicyId, ['agent-policy-1']);
      const packagePolicyServiceGetByIds = jest.fn().mockResolvedValue([packagePolicy]);

      const api = buildApi({
        monitorConfigRepository: { getAcrossSpaces: jest.fn().mockResolvedValue(so) },
        packagePolicyServiceGetByIds,
      });

      const result = await api.getHealth(['mon-1']);

      expect(result.monitors[0].privateLocations[0].status).toBe(
        PrivateLocationHealthStatusValue.Healthy
      );
      expect(result.monitors[0].privateLocations[0].packagePolicyId).toBe(legacyPolicyId);
      expect(result.monitors[0].isHealthy).toBe(true);
    });

    it('prefers new-format policy ID when both formats exist', async () => {
      const privateLoc = createPrivateLocation('priv-loc-1', 'agent-policy-1');
      const so = createMonitorSO('mon-1', {
        locations: [{ id: 'priv-loc-1', label: 'Private Loc 1', isServiceManaged: false }],
      });

      mockedGetPrivateLocationsForNamespaces.mockResolvedValue([privateLoc]);

      const newPolicyId = 'mon-1-priv-loc-1';
      const legacyPolicyId = `mon-1-priv-loc-1-${SPACE_ID}`;
      const packagePolicyServiceGetByIds = jest
        .fn()
        .mockResolvedValue([
          createPackagePolicy(newPolicyId, ['agent-policy-1']),
          createPackagePolicy(legacyPolicyId, ['agent-policy-1']),
        ]);

      const api = buildApi({
        monitorConfigRepository: { getAcrossSpaces: jest.fn().mockResolvedValue(so) },
        packagePolicyServiceGetByIds,
      });

      const result = await api.getHealth(['mon-1']);

      expect(result.monitors[0].privateLocations[0].status).toBe(
        PrivateLocationHealthStatusValue.Healthy
      );
      expect(result.monitors[0].privateLocations[0].packagePolicyId).toBe(newPolicyId);
    });

    it('reports healthy for legacy policy even when attached to a different agent', async () => {
      const privateLoc = createPrivateLocation('priv-loc-1', 'expected-agent');
      const so = createMonitorSO('mon-1', {
        locations: [{ id: 'priv-loc-1', label: 'Private Loc 1', isServiceManaged: false }],
      });

      mockedGetPrivateLocationsForNamespaces.mockResolvedValue([privateLoc]);

      const legacyPolicyId = `mon-1-priv-loc-1-${SPACE_ID}`;
      const packagePolicy = createPackagePolicy(legacyPolicyId, ['wrong-agent']);
      const packagePolicyServiceGetByIds = jest.fn().mockResolvedValue([packagePolicy]);

      const api = buildApi({
        monitorConfigRepository: { getAcrossSpaces: jest.fn().mockResolvedValue(so) },
        packagePolicyServiceGetByIds,
      });

      const result = await api.getHealth(['mon-1']);

      expect(result.monitors[0].privateLocations[0].status).toBe(
        PrivateLocationHealthStatusValue.Healthy
      );
      expect(result.monitors[0].privateLocations[0].packagePolicyId).toBe(legacyPolicyId);
    });
  });

  describe('missing agents', () => {
    it('returns MissingAgents when no agents are enrolled in the agent policy', async () => {
      const privateLoc = createPrivateLocation('priv-loc-1', 'agent-policy-1');
      const so = createMonitorSO('mon-1', {
        locations: [{ id: 'priv-loc-1', label: 'Private Loc 1', isServiceManaged: false }],
      });

      mockedGetPrivateLocationsForNamespaces.mockResolvedValue([privateLoc]);

      const expectedPolicyId = 'mon-1-priv-loc-1';
      const packagePolicy = createPackagePolicy(expectedPolicyId, ['agent-policy-1']);
      const packagePolicyServiceGetByIds = jest.fn().mockResolvedValue([packagePolicy]);
      const fleetGetAgentStatusForAgentPolicy = jest
        .fn()
        .mockResolvedValue({ all: 0, active: 0, online: 0 });

      const api = buildApi({
        monitorConfigRepository: { getAcrossSpaces: jest.fn().mockResolvedValue(so) },
        packagePolicyServiceGetByIds,
        fleetGetAgentStatusForAgentPolicy,
      });

      const result = await api.getHealth(['mon-1']);

      const locStatus = result.monitors[0].privateLocations[0];
      expect(locStatus.status).toBe(PrivateLocationHealthStatusValue.MissingAgents);
      expect(locStatus.reason).toBeDefined();
      expect(result.monitors[0].isHealthy).toBe(false);
    });
  });

  describe('unhealthy agent', () => {
    it('returns UnhealthyAgent when agents are enrolled but none are online', async () => {
      const privateLoc = createPrivateLocation('priv-loc-1', 'agent-policy-1');
      const so = createMonitorSO('mon-1', {
        locations: [{ id: 'priv-loc-1', label: 'Private Loc 1', isServiceManaged: false }],
      });

      mockedGetPrivateLocationsForNamespaces.mockResolvedValue([privateLoc]);

      const expectedPolicyId = 'mon-1-priv-loc-1';
      const packagePolicy = createPackagePolicy(expectedPolicyId, ['agent-policy-1']);
      const packagePolicyServiceGetByIds = jest.fn().mockResolvedValue([packagePolicy]);
      const fleetGetAgentStatusForAgentPolicy = jest
        .fn()
        .mockResolvedValue({ all: 2, active: 2, online: 0 });

      const api = buildApi({
        monitorConfigRepository: { getAcrossSpaces: jest.fn().mockResolvedValue(so) },
        packagePolicyServiceGetByIds,
        fleetGetAgentStatusForAgentPolicy,
      });

      const result = await api.getHealth(['mon-1']);

      const locStatus = result.monitors[0].privateLocations[0];
      expect(locStatus.status).toBe(PrivateLocationHealthStatusValue.UnhealthyAgent);
      expect(locStatus.reason).toBeDefined();
      expect(result.monitors[0].isHealthy).toBe(false);
    });

    it('returns Healthy when at least one agent is online', async () => {
      const privateLoc = createPrivateLocation('priv-loc-1', 'agent-policy-1');
      const so = createMonitorSO('mon-1', {
        locations: [{ id: 'priv-loc-1', label: 'Private Loc 1', isServiceManaged: false }],
      });

      mockedGetPrivateLocationsForNamespaces.mockResolvedValue([privateLoc]);

      const expectedPolicyId = 'mon-1-priv-loc-1';
      const packagePolicy = createPackagePolicy(expectedPolicyId, ['agent-policy-1']);
      const packagePolicyServiceGetByIds = jest.fn().mockResolvedValue([packagePolicy]);
      const fleetGetAgentStatusForAgentPolicy = jest
        .fn()
        .mockResolvedValue({ all: 3, active: 3, online: 1 });

      const api = buildApi({
        monitorConfigRepository: { getAcrossSpaces: jest.fn().mockResolvedValue(so) },
        packagePolicyServiceGetByIds,
        fleetGetAgentStatusForAgentPolicy,
      });

      const result = await api.getHealth(['mon-1']);

      expect(result.monitors[0].privateLocations[0].status).toBe(
        PrivateLocationHealthStatusValue.Healthy
      );
      expect(result.monitors[0].isHealthy).toBe(true);
    });
  });

  describe('cross-space lookups (issue #270477)', () => {
    it('passes every space that has monitors to monitorConfigRepository.getAcrossSpaces', async () => {
      MockedSyntheticsPrivateLocation.mockImplementation(
        () =>
          ({
            getPolicyId: jest.fn(
              (config: { origin?: string; id: string }, locId: string) => `${config.id}-${locId}`
            ),
            getLegacyPolicyIdsForAllSpaces: jest.fn(() => []),
            getAllSpacesWithMonitors: jest.fn().mockResolvedValue(['space-two', 'space-three']),
            getPolicyIdFormatInfo: jest.fn(() => ({
              hasNewFormatPolicyId: false,
              hasAnyLegacyPolicyId: false,
              legacyPolicyIds: [],
            })),
          } as any)
      );

      const so = createMonitorSO('mon-1');
      const getAcrossSpaces = jest.fn().mockResolvedValue(so);

      const api = buildApi({
        monitorConfigRepository: { getAcrossSpaces },
        spaceId: 'default',
      });

      await api.getHealth(['mon-1']);

      expect(getAcrossSpaces).toHaveBeenCalledTimes(1);
      const [calledId, calledNamespaces] = getAcrossSpaces.mock.calls[0];
      expect(calledId).toBe('mon-1');
      expect(new Set(calledNamespaces)).toEqual(new Set(['default', 'space-two', 'space-three']));
    });

    it('passes additional spaces (excluding the request space) to PackagePolicyService.getByIds', async () => {
      MockedSyntheticsPrivateLocation.mockImplementation(
        () =>
          ({
            getPolicyId: jest.fn(
              (config: { origin?: string; id: string }, locId: string) => `${config.id}-${locId}`
            ),
            getLegacyPolicyIdsForAllSpaces: jest.fn(() => []),
            // Reproduces the bug scenario in #270477: caller is in `default`,
            // monitors live in `space-two`.
            getAllSpacesWithMonitors: jest.fn().mockResolvedValue(['space-two']),
            getPolicyIdFormatInfo: jest.fn(
              (
                config: { id: string },
                locId: string,
                existingPolicies: Array<{ id: string }> | undefined
              ) => {
                const newId = `${config.id}-${locId}`;
                const hasNewFormatPolicyId = existingPolicies?.some((p) => p.id === newId) ?? false;
                return {
                  hasNewFormatPolicyId,
                  hasAnyLegacyPolicyId: false,
                  legacyPolicyIds: [],
                };
              }
            ),
          } as any)
      );

      const privateLoc = createPrivateLocation('priv-loc-1', 'agent-policy-1');
      mockedGetPrivateLocationsForNamespaces.mockResolvedValue([privateLoc]);

      const so = createMonitorSO('mon-1', {
        locations: [{ id: 'priv-loc-1', label: 'Private Loc 1', isServiceManaged: false }],
      });

      const packagePolicyServiceGetByIds = jest
        .fn()
        .mockResolvedValue([createPackagePolicy('mon-1-priv-loc-1', ['agent-policy-1'])]);

      const api = buildApi({
        monitorConfigRepository: { getAcrossSpaces: jest.fn().mockResolvedValue(so) },
        packagePolicyServiceGetByIds,
        spaceId: 'default',
      });

      const result = await api.getHealth(['mon-1']);

      expect(packagePolicyServiceGetByIds).toHaveBeenCalledTimes(1);
      const [args] = packagePolicyServiceGetByIds.mock.calls[0];
      expect(args.spaceId).toBe('default');
      // The request's space must not be repeated under additionalSpaceIds.
      expect(args.additionalSpaceIds).not.toContain('default');
      // Any other space that has monitors must be included so cross-space
      // package policies are discoverable.
      expect(args.additionalSpaceIds).toEqual(expect.arrayContaining(['space-two']));

      // The monitor's package policy was created in a different space, but the
      // wrapper finds it — so the location is reported as healthy.
      expect(result.monitors[0].privateLocations[0].status).toBe(
        PrivateLocationHealthStatusValue.Healthy
      );
    });

    it('uses getUnsafeInternalClient with namespace-scoped clients for agent policy lookup', async () => {
      const privateLoc = createPrivateLocation('priv-loc-1', 'agent-policy-1');
      mockedGetPrivateLocationsForNamespaces.mockResolvedValue([privateLoc]);

      const so = createMonitorSO('mon-1', {
        locations: [{ id: 'priv-loc-1', label: 'Private Loc 1', isServiceManaged: false }],
      });

      const asScopedToNamespace = jest.fn().mockReturnValue({});
      const getUnsafeInternalClient = jest.fn().mockReturnValue({ asScopedToNamespace });

      const packagePolicy = createPackagePolicy('mon-1-priv-loc-1', ['agent-policy-1']);

      const api = buildApi({
        monitorConfigRepository: { getAcrossSpaces: jest.fn().mockResolvedValue(so) },
        packagePolicyServiceGetByIds: jest.fn().mockResolvedValue([packagePolicy]),
        getUnsafeInternalClient,
      });

      await api.getHealth(['mon-1']);

      expect(getUnsafeInternalClient).toHaveBeenCalled();
      expect(asScopedToNamespace).toHaveBeenCalledWith(SPACE_ID);
    });

    it('finds agent policies that only exist in a non-default space', async () => {
      // Reproduces the case in which an agent policy has space_ids: ['space-two'] so an internal
      // client scoped to 'default' cannot find it.
      const CUSTOM_SPACE = 'space-two';
      const privateLoc = createPrivateLocation('priv-loc-1', 'space-agent-policy');
      mockedGetPrivateLocationsForNamespaces.mockResolvedValue([privateLoc]);

      const so = createMonitorSO('mon-1', {
        locations: [{ id: 'priv-loc-1', label: 'Private Loc 1', isServiceManaged: false }],
      });

      // Override so getAllSpacesWithMonitors includes CUSTOM_SPACE, causing the health
      // API to build spaces = {'default', CUSTOM_SPACE} for agent policy queries.
      MockedSyntheticsPrivateLocation.mockImplementationOnce(
        () =>
          ({
            getPolicyId: jest.fn(
              (config: { origin?: string; id: string }, locId: string) => `${config.id}-${locId}`
            ),
            getLegacyPolicyIdsForAllSpaces: jest.fn(() => []),
            getAllSpacesWithMonitors: jest.fn().mockResolvedValue([CUSTOM_SPACE]),
            getPolicyIdFormatInfo: jest.fn(
              (
                config: { id: string },
                locId: string,
                existingPolicies: Array<{ id: string }> | undefined
              ) => ({
                hasNewFormatPolicyId:
                  existingPolicies?.some((p) => p.id === `${config.id}-${locId}`) ?? false,
                hasAnyLegacyPolicyId: false,
                legacyPolicyIds: [],
              })
            ),
          } as any)
      );

      // Simulate the policy being absent in 'default' but present in CUSTOM_SPACE.
      const fleetAgentPolicyGetByIds = jest
        .fn()
        .mockResolvedValueOnce([]) // default namespace → not found
        .mockResolvedValueOnce([{ id: 'space-agent-policy' }]); // CUSTOM_SPACE → found

      const packagePolicy = createPackagePolicy('mon-1-priv-loc-1', ['space-agent-policy']);

      const api = buildApi({
        monitorConfigRepository: { getAcrossSpaces: jest.fn().mockResolvedValue(so) },
        packagePolicyServiceGetByIds: jest.fn().mockResolvedValue([packagePolicy]),
        fleetAgentPolicyGetByIds,
      });

      const result = await api.getHealth(['mon-1']);

      // Both spaces were queried (default + CUSTOM_SPACE)
      expect(fleetAgentPolicyGetByIds).toHaveBeenCalledTimes(2);
      // Policy found in CUSTOM_SPACE → status must not be MissingAgentPolicy
      expect(result.monitors[0].privateLocations[0].status).not.toBe(
        PrivateLocationHealthStatusValue.MissingAgentPolicy
      );
    });

    it('fetches private locations across all spaces so monitors in non-default spaces are not reported as missing_location (Bug #4)', async () => {
      // Reproduces the case in which a private location is created in a custom space. When _health is
      // called from 'default', getPrivateLocations would be scoped to 'default' and could
      // not find the location → MissingLocation. For this reason, we use getPrivateLocationsForNamespaces
      // with allSpaces so every relevant namespace is searched.
      const CUSTOM_SPACE = 'space-two';
      const privateLoc = createPrivateLocation('priv-loc-1', 'agent-policy-1');

      // Override so getAllSpacesWithMonitors returns CUSTOM_SPACE, causing allSpaces
      // to include it. The health API then passes allSpaces to getPrivateLocationsForNamespaces.
      MockedSyntheticsPrivateLocation.mockImplementationOnce(
        () =>
          ({
            getPolicyId: jest.fn(
              (config: { origin?: string; id: string }, locId: string) => `${config.id}-${locId}`
            ),
            getLegacyPolicyIdsForAllSpaces: jest.fn(() => []),
            getAllSpacesWithMonitors: jest.fn().mockResolvedValue([CUSTOM_SPACE]),
            getPolicyIdFormatInfo: jest.fn(
              (
                config: { id: string },
                locId: string,
                existingPolicies: Array<{ id: string }> | undefined
              ) => ({
                hasNewFormatPolicyId:
                  existingPolicies?.some((p) => p.id === `${config.id}-${locId}`) ?? false,
                hasAnyLegacyPolicyId: false,
                legacyPolicyIds: [],
              })
            ),
          } as any)
      );

      mockedGetPrivateLocationsForNamespaces.mockResolvedValue([privateLoc]);

      const so = createMonitorSO('mon-1', {
        locations: [{ id: 'priv-loc-1', label: 'Private Loc 1', isServiceManaged: false }],
      });

      const packagePolicy = createPackagePolicy('mon-1-priv-loc-1', ['agent-policy-1']);

      const api = buildApi({
        monitorConfigRepository: { getAcrossSpaces: jest.fn().mockResolvedValue(so) },
        packagePolicyServiceGetByIds: jest.fn().mockResolvedValue([packagePolicy]),
      });

      const result = await api.getHealth(['mon-1']);

      // getPrivateLocationsForNamespaces must be called with allSpaces so cross-space
      // locations are discoverable — verify both the default and CUSTOM_SPACE are included.
      expect(mockedGetPrivateLocationsForNamespaces).toHaveBeenCalledWith(
        expect.anything(),
        expect.arrayContaining([SPACE_ID, CUSTOM_SPACE])
      );
      // Private location was found → status must not be MissingLocation
      expect(result.monitors[0].privateLocations[0].status).not.toBe(
        PrivateLocationHealthStatusValue.MissingLocation
      );
    });
  });

  describe('healthy status has no reason field', () => {
    it('omits reason for healthy locations', async () => {
      const privateLoc = createPrivateLocation('priv-loc-1', 'agent-policy-1');
      const so = createMonitorSO('mon-1', {
        locations: [{ id: 'priv-loc-1', label: 'Private Loc 1', isServiceManaged: false }],
      });

      mockedGetPrivateLocationsForNamespaces.mockResolvedValue([privateLoc]);

      const expectedPolicyId = 'mon-1-priv-loc-1';
      const packagePolicy = createPackagePolicy(expectedPolicyId, ['agent-policy-1']);
      const packagePolicyServiceGetByIds = jest.fn().mockResolvedValue([packagePolicy]);

      const api = buildApi({
        monitorConfigRepository: { getAcrossSpaces: jest.fn().mockResolvedValue(so) },
        packagePolicyServiceGetByIds,
      });

      const result = await api.getHealth(['mon-1']);

      expect(result.monitors[0].privateLocations[0]).not.toHaveProperty('reason');
    });
  });
});
