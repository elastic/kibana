/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject } from '@kbn/core/server';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { AgentPolicy, PackagePolicy } from '@kbn/fleet-plugin/common';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import {
  ConfigKey,
  PrivateLocationHealthStatusValue,
  type EncryptedSyntheticsMonitorAttributes,
  type PrivateLocationHealthStatus,
  type MonitorHealthError,
  type MonitorHealthStatus,
  type MonitorsHealthResponse,
} from '../../common/runtime_types';
import { SyntheticsPrivateLocation } from '../synthetics_service/private_location/synthetics_private_location';
import { PackagePolicyService } from '../synthetics_service/private_location/package_policy_service';
import { getPrivateLocationsForNamespaces } from '../synthetics_service/get_private_locations';
import type { PrivateLocationAttributes } from '../runtime_types/private_locations';
import type { SyntheticsServerSetup } from '../types';
import type { MonitorConfigRepository } from './monitor_config_repository';

const STATUS_REASONS: Record<
  Exclude<PrivateLocationHealthStatusValue, PrivateLocationHealthStatusValue.Healthy>,
  string
> = {
  [PrivateLocationHealthStatusValue.MissingPackagePolicy]:
    'The Fleet package policy for this monitor and private location pair does not exist.',
  [PrivateLocationHealthStatusValue.MissingAgentPolicy]:
    'The agent policy referenced by this private location no longer exists.',
  [PrivateLocationHealthStatusValue.MissingLocation]:
    'The monitor references a private location that no longer exists.',
  [PrivateLocationHealthStatusValue.MissingAgents]:
    'No Fleet agents are enrolled in the agent policy for this private location.',
  [PrivateLocationHealthStatusValue.UnhealthyAgent]:
    'All Fleet agents enrolled in the agent policy for this private location are unhealthy or offline.',
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

  /**
   * Returns the monitor id used to look up Fleet package policies for this monitor.
   * Prefers `MONITOR_QUERY_ID` when present; otherwise falls back to the saved object id.
   * Project monitors store a journey-based id in `MONITOR_QUERY_ID` (e.g. `journey-project-namespace`),
   * which differs from `so.id`.
   *
   * @param so Saved object for the synthetics monitor.
   */
  private static getMonitorPolicyId(so: SavedObject<EncryptedSyntheticsMonitorAttributes>): string {
    return so.attributes[ConfigKey.MONITOR_QUERY_ID] || so.id;
  }

  async getHealth(monitorIds: string[]): Promise<MonitorsHealthResponse> {
    const privateLocationAPI = new SyntheticsPrivateLocation(this.server);

    // Resolve the union of every space that may host a relevant monitor or
    // package policy. Computed up-front so monitor and package-policy lookups
    // can both look across spaces — see Kibana issue #270477.
    const allSpacesWithMonitors = await privateLocationAPI.getAllSpacesWithMonitors();
    const allSpaces = new Set([this.spaceId, ...allSpacesWithMonitors]);

    const { foundMonitors, errors } = await this.fetchMonitors(monitorIds, allSpaces);

    if (foundMonitors.length === 0) {
      return { monitors: [], errors };
    }

    const allPrivateLocations = await getPrivateLocationsForNamespaces(this.savedObjectsClient, [
      ...allSpaces,
    ]);
    const allPrivateLocationsMap = new Map<string, PrivateLocationAttributes>(
      allPrivateLocations.map((loc) => [loc.id, loc])
    );

    const referencedAgentPolicyIds = [
      ...new Set(allPrivateLocations.map((loc) => loc.agentPolicyId)),
    ];
    const [existingPackagePoliciesMap, existingAgentPoliciesMap, agentStatusMap] =
      await Promise.all([
        this.getExistingPackagePoliciesMap(
          this.getExpectedPackagePolicyIds(foundMonitors, privateLocationAPI, allSpaces),
          allSpaces
        ),
        this.getExistingAgentPoliciesMap(referencedAgentPolicyIds, allSpaces),
        this.getAgentStatusMap(referencedAgentPolicyIds),
      ]);

    const existingPoliciesArray = [...existingPackagePoliciesMap.values()];

    const monitors: MonitorHealthStatus[] = foundMonitors.map(({ so }) => {
      const locations = so.attributes[ConfigKey.LOCATIONS] ?? [];
      const privateLocations = locations.filter((loc) => !loc.isServiceManaged);
      const monitorPolicyId = MonitorIntegrationHealthApi.getMonitorPolicyId(so);
      const policyConfig = {
        origin: so.attributes[ConfigKey.MONITOR_SOURCE_TYPE],
        id: monitorPolicyId,
      };

      // Status checks are ordered by root-cause severity (most fundamental first).
      // Only the first matching status is returned per location — downstream issues
      // are moot when a more fundamental problem exists.
      //
      // Priority: missing_location > missing_agent_policy > missing_package_policy > missing_agents > unhealthy_agent > healthy
      const locationStatuses: PrivateLocationHealthStatus[] = privateLocations.map((loc) => {
        const existingPrivateLocation = allPrivateLocationsMap.get(loc.id);
        const newFormatPolicyId = privateLocationAPI.getPolicyId(policyConfig, loc.id);

        if (!existingPrivateLocation) {
          return MonitorIntegrationHealthApi.buildLocationStatus(
            loc.id,
            loc.label ?? loc.id,
            PrivateLocationHealthStatusValue.MissingLocation,
            newFormatPolicyId
          );
        }

        if (!existingAgentPoliciesMap.has(existingPrivateLocation.agentPolicyId)) {
          return MonitorIntegrationHealthApi.buildLocationStatus(
            loc.id,
            existingPrivateLocation.label,
            PrivateLocationHealthStatusValue.MissingAgentPolicy,
            newFormatPolicyId,
            existingPrivateLocation.agentPolicyId
          );
        }

        const { hasNewFormatPolicyId, hasAnyLegacyPolicyId, legacyPolicyIds } =
          privateLocationAPI.getPolicyIdFormatInfo(
            { id: monitorPolicyId },
            loc.id,
            existingPoliciesArray,
            allSpaces
          );

        if (!hasNewFormatPolicyId && !hasAnyLegacyPolicyId) {
          return MonitorIntegrationHealthApi.buildLocationStatus(
            loc.id,
            existingPrivateLocation.label,
            PrivateLocationHealthStatusValue.MissingPackagePolicy,
            newFormatPolicyId,
            existingPrivateLocation.agentPolicyId
          );
        }

        const resolvedPolicyId = hasNewFormatPolicyId ? newFormatPolicyId : legacyPolicyIds[0];
        const expectedAgentPolicyId = existingPrivateLocation.agentPolicyId;

        const agentStatus = agentStatusMap.get(expectedAgentPolicyId);
        if (agentStatus !== undefined) {
          if (agentStatus.total === 0) {
            return MonitorIntegrationHealthApi.buildLocationStatus(
              loc.id,
              existingPrivateLocation.label,
              PrivateLocationHealthStatusValue.MissingAgents,
              resolvedPolicyId,
              expectedAgentPolicyId
            );
          }
          if (agentStatus.online === 0) {
            return MonitorIntegrationHealthApi.buildLocationStatus(
              loc.id,
              existingPrivateLocation.label,
              PrivateLocationHealthStatusValue.UnhealthyAgent,
              resolvedPolicyId,
              expectedAgentPolicyId
            );
          }
        }

        return MonitorIntegrationHealthApi.buildLocationStatus(
          loc.id,
          existingPrivateLocation.label,
          PrivateLocationHealthStatusValue.Healthy,
          resolvedPolicyId,
          expectedAgentPolicyId
        );
      });

      return {
        configId: so.id,
        monitorName: so.attributes[ConfigKey.NAME],
        isHealthy: locationStatuses.every(
          (s) => s.status === PrivateLocationHealthStatusValue.Healthy
        ),
        privateLocations: locationStatuses,
      };
    });

    return { monitors, errors };
  }

  private async fetchMonitors(monitorIds: string[], allSpaces: Set<string>) {
    const errors: MonitorHealthError[] = [];
    const foundMonitors: FoundMonitor[] = [];

    // Use an internal saved-objects repository (un-scoped) so monitors created
    // in any space — not just the request's space — can be resolved.
    const internalSoRepository = this.server.coreStart.savedObjects.createInternalRepository();
    const namespaces = [...allSpaces];

    const settledResults = await Promise.allSettled(
      monitorIds.map((id) =>
        this.monitorConfigRepository.getAcrossSpaces(id, namespaces, internalSoRepository)
      )
    );

    for (let i = 0; i < monitorIds.length; i++) {
      const result = settledResults[i];
      if (result.status === 'fulfilled') {
        foundMonitors.push({ id: monitorIds[i], so: result.value });
      } else {
        const reason = result.reason;
        errors.push({
          configId: monitorIds[i],
          message: reason?.message ?? 'Failed to fetch monitor',
          statusCode: reason?.output?.statusCode ?? 500,
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
      const monitorPolicyId = MonitorIntegrationHealthApi.getMonitorPolicyId(so);
      const policyConfig = {
        origin: so.attributes[ConfigKey.MONITOR_SOURCE_TYPE],
        id: monitorPolicyId,
      };

      for (const loc of privateLocations) {
        ids.add(privateLocationAPI.getPolicyId(policyConfig, loc.id));
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

  private async getExistingPackagePoliciesMap(
    expectedPackagePolicyIds: string[],
    allSpaces: Set<string>
  ) {
    if (expectedPackagePolicyIds.length === 0) {
      return new Map<string, PackagePolicy>();
    }

    // The Synthetics wrapper builds a namespace-scoped saved-objects client
    // per space and de-duplicates the results, so package policies created
    // for monitors in any space are visible regardless of the caller's space.
    const packagePolicyService = new PackagePolicyService(this.server);
    const additionalSpaceIds = [...allSpaces].filter((space) => space !== this.spaceId);
    const existingPackagePolicies = await packagePolicyService.getByIds({
      spaceId: this.spaceId,
      packagePolicyIds: expectedPackagePolicyIds,
      additionalSpaceIds,
    });
    return new Map((existingPackagePolicies ?? []).map((policy) => [policy.id, policy]));
  }

  private async getExistingAgentPoliciesMap(agentPolicyIds: string[], allSpaces: Set<string>) {
    if (agentPolicyIds.length === 0) {
      return new Map<string, AgentPolicy>();
    }

    // Agent policies can be scoped to a non-default space via space_ids. A plain
    // createInternalRepository() defaults to the 'default' namespace and misses
    // those policies. Query every relevant space with a namespace-scoped internal
    // client (same pattern as PackagePolicyService.getByIds) — see issue #270477.
    const spaces = new Set<string>([this.spaceId, DEFAULT_SPACE_ID, ...allSpaces]);
    const unsafeClient = this.server.coreStart.savedObjects.getUnsafeInternalClient();
    const results = await Promise.all(
      [...spaces].map((space) =>
        this.server.fleet.agentPolicyService.getByIds(
          unsafeClient.asScopedToNamespace(space),
          agentPolicyIds,
          { ignoreMissing: true, withPackagePolicies: false }
        )
      )
    );
    return new Map(results.flat().map((policy) => [policy.id, policy]));
  }

  private async getAgentStatusMap(
    agentPolicyIds: string[]
  ): Promise<Map<string, { total: number; online: number }>> {
    if (agentPolicyIds.length === 0) {
      return new Map();
    }

    const entries = await Promise.all(
      agentPolicyIds.map(async (policyId) => {
        const status =
          await this.server.fleet.agentService.asInternalUser.getAgentStatusForAgentPolicy(
            policyId
          );
        return [policyId, { total: status.active, online: status.online }] as const;
      })
    );

    return new Map(entries);
  }

  private static buildLocationStatus(
    locationId: string,
    locationLabel: string,
    status: PrivateLocationHealthStatusValue,
    packagePolicyId: string,
    agentPolicyId?: string
  ): PrivateLocationHealthStatus {
    return {
      locationId,
      locationLabel,
      status,
      packagePolicyId,
      agentPolicyId,
      ...(status !== PrivateLocationHealthStatusValue.Healthy
        ? { reason: STATUS_REASONS[status] }
        : {}),
    };
  }
}
