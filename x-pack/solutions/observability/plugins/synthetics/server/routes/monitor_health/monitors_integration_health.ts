/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject } from '@kbn/core/server';
import type { PackagePolicy } from '@kbn/fleet-plugin/common';
import {
  ConfigKey,
  LocationHealthStatusValue,
  type EncryptedSyntheticsMonitorAttributes,
  type LocationHealthStatus,
  type MonitorHealthError,
  type MonitorHealthStatus,
  type MonitorsHealthResponse,
} from '../../../common/runtime_types';
import { SyntheticsPrivateLocation } from '../../synthetics_service/private_location/synthetics_private_location';
import { getPrivateLocations } from '../../synthetics_service/get_private_locations';
import type { PrivateLocationAttributes } from '../../runtime_types/private_locations';
import type { RouteContext } from '../types';
import { server } from 'typescript';
import { SyntheticsServerSetup } from '../../types';

export {
  LocationHealthStatusValue,
  type LocationHealthStatus,
  type MonitorHealthStatus,
  type MonitorHealthError,
  type MonitorsHealthResponse,
} from '../../../common/runtime_types';

const STATUS_REASONS: Record<
  Exclude<LocationHealthStatusValue, LocationHealthStatusValue.Healthy>,
  string
> = {
  [LocationHealthStatusValue.MissingPackagePolicy]:
    'The Fleet package policy for this monitor/location pair does not exist.',
  [LocationHealthStatusValue.MissingAgentPolicy]:
    'The agent policy referenced by this private location no longer exists.',
  [LocationHealthStatusValue.AgentPolicyMismatch]:
    'The package policy exists but is attached to a different agent policy than expected.',
  [LocationHealthStatusValue.MissingLocation]:
    'The monitor references a private location that no longer exists.',
  [LocationHealthStatusValue.PackageNotInstalled]:
    'The synthetics Fleet package is not installed.',
};

const fetchMonitors = async (monitorIds: string[], routeContext: RouteContext) => {
  const { monitorConfigRepository } = routeContext;
  const errors: MonitorHealthError[] = [];
  const foundMonitors: Array<{
    id: string;
    so: SavedObject<EncryptedSyntheticsMonitorAttributes>;
  }> = [];

  const settledResults = await Promise.allSettled(
    monitorIds.map((id) => monitorConfigRepository.get(id))
  );

  for (let i = 0; i < monitorIds.length; i++) {
    const result = settledResults[i];
    if (result.status === 'fulfilled') {
      foundMonitors.push({ id: monitorIds[i], so: result.value });
    } else {
      errors.push({
        configId: monitorIds[i],
        error: result.reason?.message ?? 'Failed to fetch monitor',
      });
    }
  }

  return { foundMonitors, errors };
}

const getExpectedPackagePolicies = (
  foundMonitors: Array<{
    id: string;
    so: SavedObject<EncryptedSyntheticsMonitorAttributes>;
  }>,
  privateLocationAPI: SyntheticsPrivateLocation,
  spaceId: string
) => {
  const expectedPolicies: Array<{
    monitorId: string;
    locationId: string;
    policyId: string;
  }> = [];

  foundMonitors.forEach(({ so }, mIdx) => {
    const locations = so.attributes[ConfigKey.LOCATIONS] ?? [];
    const privateLocations = locations.filter((loc) => !loc.isServiceManaged);

    for (const loc of privateLocations) {
      const policyId = privateLocationAPI.getPolicyId(
        {
          origin: so.attributes[ConfigKey.MONITOR_SOURCE_TYPE],
          id: so.id,
        },
        loc.id,
        spaceId
      );
      expectedPolicies.push({ monitorId: so.attributes[ConfigKey.CONFIG_ID], locationId: loc.id, policyId });
    }
  });

  return expectedPolicies;
}

const getExistingPackagePoliciesMap = async (
  expectedPackagePolicyIds: string[],
  server: SyntheticsServerSetup,
) => {

  if (expectedPackagePolicyIds.length === 0) {
    return new Map<string, PackagePolicy>();
  }

  const internalSoClient = server.coreStart.savedObjects.createInternalRepository();
  const existingPackagePolicies = await server.fleet.packagePolicyService.getByIDs(
    internalSoClient,
    expectedPackagePolicyIds,
    { ignoreMissing: true }
  );
  return new Map((existingPackagePolicies ?? []).map((policy) => [policy.id, policy]));
}


export const getMonitorsIntegrationHealth = async (
  monitorIds: string[],
  routeContext: RouteContext
): Promise<MonitorsHealthResponse> => {
  const { server, savedObjectsClient, spaceId } = routeContext;

  const { foundMonitors, errors } = await fetchMonitors(monitorIds, routeContext);

  if (foundMonitors.length === 0) {
    return { monitors: [], errors };
  }

  const allPrivateLocations = await getPrivateLocations(savedObjectsClient);
  const allPrivateLocationsMap = new Map<string, PrivateLocationAttributes>(
    allPrivateLocations.map((loc) => [loc.id, loc])
  );

  const privateLocationAPI = new SyntheticsPrivateLocation(server);

  const expectedPackagePolicyIds = getExpectedPackagePolicies(foundMonitors, privateLocationAPI, spaceId)
    .map(({ policyId }) => policyId);
  const existingPacakagePoliciesMap = await getExistingPackagePoliciesMap(expectedPackagePolicyIds, server);

  const monitorsHealthStatuses: MonitorHealthStatus[] = foundMonitors.map(({ so }) => {
    const locations = so.attributes[ConfigKey.LOCATIONS] ?? [];
    const privateLocations = locations.filter((loc) => !loc.isServiceManaged);

    const locationStatuses: LocationHealthStatus[] = privateLocations.map((loc) => {
      const existingPrivateLocation = allPrivateLocationsMap.get(loc.id);
      const expectedPackagePolicyId = privateLocationAPI.getPolicyId(
        {
          origin: so.attributes[ConfigKey.MONITOR_SOURCE_TYPE],
          id: so.id,
        },
        loc.id,
        spaceId
      );

      if (!existingPrivateLocation) {
        return buildLocationStatus(
          loc.id,
          loc.label ?? loc.id,
          LocationHealthStatusValue.MissingLocation,
          expectedPackagePolicyId
        );
      }

      const existingPackagePolicy = existingPacakagePoliciesMap.get(expectedPackagePolicyId);

      if (!existingPackagePolicy) {
        return buildLocationStatus(
          loc.id,
          existingPrivateLocation.label,
          LocationHealthStatusValue.MissingPackagePolicy,
          expectedPackagePolicyId
        );
      }

      const expectedAgentPolicyId = existingPrivateLocation.agentPolicyId;
      const attachedPolicyIds = existingPackagePolicy.policy_ids ?? [existingPackagePolicy.policy_id];
      if (!attachedPolicyIds.includes(expectedAgentPolicyId)) {
        return buildLocationStatus(
          loc.id,
          existingPrivateLocation.label,
          LocationHealthStatusValue.AgentPolicyMismatch,
          expectedPackagePolicyId
        );
      }

      return buildLocationStatus(
        loc.id,
        existingPrivateLocation.label,
        LocationHealthStatusValue.Healthy,
        expectedPackagePolicyId
      );
    });

    return {
      configId: so.id,
      monitorName: so.attributes[ConfigKey.NAME],
      isMissingIntegration: locationStatuses.some(
        (s) => s.status !== LocationHealthStatusValue.Healthy
      ),
      locations: locationStatuses,
    };
  });

  return { monitors: monitorsHealthStatuses, errors };
};

const buildLocationStatus = (
  locationId: string,
  locationLabel: string,
  status: LocationHealthStatusValue,
  policyId: string
): LocationHealthStatus => ({
  locationId,
  locationLabel,
  status,
  policyId,
  ...(status !== LocationHealthStatusValue.Healthy ? { reason: STATUS_REASONS[status] } : {}),
});
