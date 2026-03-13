/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type SavedObject, SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { AgentPolicy, PackagePolicy } from '@kbn/fleet-plugin/common';
import {
  ConfigKey,
  LocationHealthStatusValue,
  type EncryptedSyntheticsMonitorAttributes,
  type LocationHealthStatus,
  type MonitorHealthError,
  type MonitorHealthStatus,
  type MonitorsHealthResponse,
} from '../../common/runtime_types';
import { SyntheticsPrivateLocation } from '../synthetics_service/private_location/synthetics_private_location';
import { getPrivateLocations } from '../synthetics_service/get_private_locations';
import type { PrivateLocationAttributes } from '../runtime_types/private_locations';
import type { SyntheticsServerSetup } from '../types';
import type { MonitorConfigRepository } from './monitor_config_repository';

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
  [LocationHealthStatusValue.PackageNotInstalled]: 'The synthetics Fleet package is not installed.',
};

interface FoundMonitor {
  id: string;
  so: SavedObject<EncryptedSyntheticsMonitorAttributes>;
}

export class MonitorIntegrationHealthApi {
  constructor(
    private readonly server: SyntheticsServerSetup,
    private readonly savedObjectsClient: SavedObjectsClientContract,
    private readonly monitorConfigRepository: MonitorConfigRepository,
    private readonly spaceId: string
  ) {}

  async getHealth(monitorIds: string[]): Promise<MonitorsHealthResponse> {
    const { foundMonitors, errors } = await this.fetchMonitors(monitorIds);

    if (foundMonitors.length === 0) {
      return { monitors: [], errors };
    }

    const allPrivateLocations = await getPrivateLocations(this.savedObjectsClient);
    const allPrivateLocationsMap = new Map<string, PrivateLocationAttributes>(
      allPrivateLocations.map((loc) => [loc.id, loc])
    );

    const privateLocationAPI = new SyntheticsPrivateLocation(this.server);

    const syntheticsInstallation =
      await this.server.fleet.packageService.asInternalUser.getInstallation('synthetics');

    if (!syntheticsInstallation) {
      return {
        monitors: this.buildAllLocationsWithStatus(
          foundMonitors,
          LocationHealthStatusValue.PackageNotInstalled,
          allPrivateLocationsMap,
          privateLocationAPI
        ),
        errors,
      };
    }

    const allSpacesWithMonitors = await privateLocationAPI.getAllSpacesWithMonitors();
    const allSpaces = new Set([this.spaceId, ...allSpacesWithMonitors]);

    const referencedAgentPolicyIds = [
      ...new Set(allPrivateLocations.map((loc) => loc.agentPolicyId)),
    ];
    const [existingPackagePoliciesMap, existingAgentPoliciesMap] = await Promise.all([
      this.getExistingPackagePoliciesMap(
        this.getExpectedPackagePolicyIds(foundMonitors, privateLocationAPI, allSpaces)
      ),
      this.getExistingAgentPoliciesMap(referencedAgentPolicyIds),
    ]);

    const existingPoliciesArray = [...existingPackagePoliciesMap.values()];

    const monitors: MonitorHealthStatus[] = foundMonitors.map(({ so }) => {
      const locations = so.attributes[ConfigKey.LOCATIONS] ?? [];
      const privateLocations = locations.filter((loc) => !loc.isServiceManaged);

      // Status checks are ordered by root-cause severity (most fundamental first).
      // Only the first matching status is returned per location — downstream issues
      // (e.g. agent_policy_mismatch) are moot when a more fundamental problem exists
      // (e.g. the agent policy itself is missing).
      //
      // Priority: missing_location > missing_agent_policy > missing_package_policy
      //           > agent_policy_mismatch > healthy
      const locationStatuses: LocationHealthStatus[] = privateLocations.map((loc) => {
        const existingPrivateLocation = allPrivateLocationsMap.get(loc.id);
        const newFormatPolicyId = privateLocationAPI.getPolicyId(
          { origin: so.attributes[ConfigKey.MONITOR_SOURCE_TYPE], id: so.id },
          loc.id
        );

        if (!existingPrivateLocation) {
          return MonitorIntegrationHealthApi.buildLocationStatus(
            loc.id,
            loc.label ?? loc.id,
            LocationHealthStatusValue.MissingLocation,
            newFormatPolicyId
          );
        }

        if (!existingAgentPoliciesMap.has(existingPrivateLocation.agentPolicyId)) {
          return MonitorIntegrationHealthApi.buildLocationStatus(
            loc.id,
            existingPrivateLocation.label,
            LocationHealthStatusValue.MissingAgentPolicy,
            newFormatPolicyId
          );
        }

        const { hasNewFormatPolicyId, hasAnyLegacyPolicyId, legacyPolicyIds } =
          privateLocationAPI.getPolicyIdFormatInfo(
            { id: so.id },
            loc.id,
            existingPoliciesArray,
            allSpaces
          );

        if (!hasNewFormatPolicyId && !hasAnyLegacyPolicyId) {
          return MonitorIntegrationHealthApi.buildLocationStatus(
            loc.id,
            existingPrivateLocation.label,
            LocationHealthStatusValue.MissingPackagePolicy,
            newFormatPolicyId
          );
        }

        const resolvedPolicyId = hasNewFormatPolicyId ? newFormatPolicyId : legacyPolicyIds[0];
        const existingPackagePolicy = existingPackagePoliciesMap.get(resolvedPolicyId);

        const expectedAgentPolicyId = existingPrivateLocation.agentPolicyId;
        const attachedPolicyIds = existingPackagePolicy?.policy_ids ?? [
          existingPackagePolicy?.policy_id,
        ];
        if (!attachedPolicyIds.includes(expectedAgentPolicyId)) {
          return MonitorIntegrationHealthApi.buildLocationStatus(
            loc.id,
            existingPrivateLocation.label,
            LocationHealthStatusValue.AgentPolicyMismatch,
            resolvedPolicyId
          );
        }

        return MonitorIntegrationHealthApi.buildLocationStatus(
          loc.id,
          existingPrivateLocation.label,
          LocationHealthStatusValue.Healthy,
          resolvedPolicyId
        );
      });

      return {
        configId: so.id,
        monitorName: so.attributes[ConfigKey.NAME],
        isUnhealthy: locationStatuses.some((s) => s.status !== LocationHealthStatusValue.Healthy),
        locations: locationStatuses,
      };
    });

    return { monitors, errors };
  }

  private async fetchMonitors(monitorIds: string[]) {
    const errors: MonitorHealthError[] = [];
    const foundMonitors: FoundMonitor[] = [];

    const settledResults = await Promise.allSettled(
      monitorIds.map((id) => this.monitorConfigRepository.get(id))
    );

    for (let i = 0; i < monitorIds.length; i++) {
      const result = settledResults[i];
      if (result.status === 'fulfilled') {
        foundMonitors.push({ id: monitorIds[i], so: result.value });
      } else {
        const reason = result.reason;
        errors.push({
          configId: monitorIds[i],
          error: reason?.message ?? 'Failed to fetch monitor',
          ...(SavedObjectsErrorHelpers.isNotFoundError(reason) ? { statusCode: 404 } : {}),
        });
      }
    }

    return { foundMonitors, errors };
  }

  private getExpectedPackagePolicyIds(
    foundMonitors: FoundMonitor[],
    privateLocationAPI: SyntheticsPrivateLocation,
    allSpaces: Set<string>
  ): string[] {
    const ids = new Set<string>();

    for (const { so } of foundMonitors) {
      const locations = so.attributes[ConfigKey.LOCATIONS] ?? [];
      const privateLocations = locations.filter((loc) => !loc.isServiceManaged);

      for (const loc of privateLocations) {
        ids.add(
          privateLocationAPI.getPolicyId(
            { origin: so.attributes[ConfigKey.MONITOR_SOURCE_TYPE], id: so.id },
            loc.id
          )
        );
        for (const legacyId of privateLocationAPI.getLegacyPolicyIdsForAllSpaces(
          so.id,
          loc.id,
          allSpaces
        )) {
          ids.add(legacyId);
        }
      }
    }

    return [...ids];
  }

  private async getExistingPackagePoliciesMap(expectedPackagePolicyIds: string[]) {
    if (expectedPackagePolicyIds.length === 0) {
      return new Map<string, PackagePolicy>();
    }

    const internalSoClient = this.server.coreStart.savedObjects.createInternalRepository();
    const existingPackagePolicies = await this.server.fleet.packagePolicyService.getByIDs(
      internalSoClient,
      expectedPackagePolicyIds,
      { ignoreMissing: true }
    );
    return new Map((existingPackagePolicies ?? []).map((policy) => [policy.id, policy]));
  }

  private async getExistingAgentPoliciesMap(agentPolicyIds: string[]) {
    if (agentPolicyIds.length === 0) {
      return new Map<string, AgentPolicy>();
    }

    const internalSoClient = this.server.coreStart.savedObjects.createInternalRepository();
    const existingAgentPolicies = await this.server.fleet.agentPolicyService.getByIds(
      internalSoClient,
      agentPolicyIds,
      { ignoreMissing: true, withPackagePolicies: false }
    );
    return new Map((existingAgentPolicies ?? []).map((policy) => [policy.id, policy]));
  }

  private buildAllLocationsWithStatus(
    foundMonitors: FoundMonitor[],
    status: LocationHealthStatusValue,
    allPrivateLocationsMap: Map<string, PrivateLocationAttributes>,
    privateLocationAPI: SyntheticsPrivateLocation
  ): MonitorHealthStatus[] {
    return foundMonitors.map(({ so }) => {
      const locations = so.attributes[ConfigKey.LOCATIONS] ?? [];
      const privateLocations = locations.filter((loc) => !loc.isServiceManaged);

      const locationStatuses: LocationHealthStatus[] = privateLocations.map((loc) => {
        const existingPrivateLocation = allPrivateLocationsMap.get(loc.id);
        const expectedPolicyId = privateLocationAPI.getPolicyId(
          { origin: so.attributes[ConfigKey.MONITOR_SOURCE_TYPE], id: so.id },
          loc.id
        );

        return MonitorIntegrationHealthApi.buildLocationStatus(
          loc.id,
          existingPrivateLocation?.label ?? loc.label ?? loc.id,
          status,
          expectedPolicyId
        );
      });

      return {
        configId: so.id,
        monitorName: so.attributes[ConfigKey.NAME],
        isUnhealthy: true,
        locations: locationStatuses,
      };
    });
  }

  private static buildLocationStatus(
    locationId: string,
    locationLabel: string,
    status: LocationHealthStatusValue,
    policyId: string
  ): LocationHealthStatus {
    return {
      locationId,
      locationLabel,
      status,
      policyId,
      ...(status !== LocationHealthStatusValue.Healthy ? { reason: STATUS_REASONS[status] } : {}),
    };
  }
}
