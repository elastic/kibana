/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { getPrivateLocationsAndAgentPolicies } from './get_private_locations';
import { PackagePolicyService } from '../../../synthetics_service/private_location/package_policy_service';
import {
  hostFromCondition,
  isConditionShardedLocation,
} from '../../../synthetics_service/private_location/assign_by_condition';
import {
  getAgentHostInfo,
  STALE_CHECKIN_MS,
} from '../../../tasks/rebalance_private_location_shards_task';
import type { SyntheticsRestApiRouteFactory } from '../../types';
import { SYNTHETICS_API_URLS } from '../../../../common/constants';
import { ConfigKey } from '../../../../common/runtime_types';

export interface MonitorAgentAssignment {
  locationId: string;
  locationLabel: string;
  agentPolicyId: string;
  /** Agent policy display name, or the id when the policy can't be resolved. */
  agentPolicyName: string;
  /**
   * Assigned agent `host.name` (lowercased), read from the monitor's package-policy
   * `${host.name}` condition. Null when not yet pinned — the monitor carries the
   * never-match UNASSIGNED sentinel and runs on NO agent until the next rebalance
   * assigns it a host.
   */
  host: string | null;
  /** Assigned host is currently checking in within the stale window. */
  healthy: boolean;
}

/**
 * Per condition-sharded private location a monitor belongs to, which agent host
 * it is pinned to (via that monitor's package-policy `${host.name}` condition)
 * and whether that host is healthy — powering the "Assigned agent" section of
 * the monitor details page. Mirrors {@link getPrivateLocationAgentStats} but
 * scoped to a single monitor (looks up the one package policy per location by id
 * rather than scanning the whole location).
 */
export const getMonitorAgentAssignmentRoute: SyntheticsRestApiRouteFactory<
  MonitorAgentAssignment[]
> = () => ({
  method: 'GET',
  path: SYNTHETICS_API_URLS.MONITOR_AGENT_ASSIGNMENT,
  validate: {
    params: schema.object({
      monitorId: schema.string({ minLength: 1, maxLength: 1024 }),
    }),
  },
  handler: async ({
    server,
    request,
    savedObjectsClient,
    syntheticsMonitorClient,
    monitorConfigRepository,
    spaceId,
  }) => {
    const { monitorId } = request.params;

    const { locations, agentPolicies } = await getPrivateLocationsAndAgentPolicies(
      savedObjectsClient,
      syntheticsMonitorClient
    );
    const scalableLocations = locations.filter(isConditionShardedLocation);
    if (scalableLocations.length === 0) {
      return [];
    }

    // Package policies are keyed by the monitor's query id (`config.id`), which for
    // project monitors is the `custom_heartbeat_id`, not the config id the UI passes.
    // Resolve it so the by-id lookup below hits; fall back to the raw id (they match
    // for UI-created monitors) if the monitor can't be loaded.
    const queryId = await monitorConfigRepository
      .get(monitorId)
      .then((monitor) => monitor.attributes[ConfigKey.MONITOR_QUERY_ID])
      .catch(() => undefined);
    const idBases = [...new Set([queryId, monitorId].filter(Boolean) as string[])];

    const policyNameById = new Map(agentPolicies.map((policy) => [policy.id, policy.name]));
    const packagePolicyService = new PackagePolicyService(server);
    const now = Date.now();

    const results = await Promise.all(
      scalableLocations.map(async (location): Promise<MonitorAgentAssignment | null> => {
        // Space-agnostic id `${configId}-${locationId}`, with the legacy
        // space-suffixed id as a fallback for older monitors.
        const policyIds = idBases.flatMap((base) => [
          `${base}-${location.id}`,
          `${base}-${location.id}-${spaceId}`,
        ]);
        const packagePolicies = await packagePolicyService
          .getByIds({ spaceId, packagePolicyIds: policyIds })
          .catch(() => []);
        // No package policy → the monitor doesn't run at this location.
        if (packagePolicies.length === 0) {
          return null;
        }

        const host = hostFromCondition(packagePolicies[0].condition) ?? null;
        let healthy = false;
        if (host) {
          const hostInfo = await getAgentHostInfo(server, location.agentPolicyId).catch(
            () => new Map()
          );
          const lastCheckin = hostInfo.get(host)?.lastCheckin ?? null;
          healthy = lastCheckin !== null && now - lastCheckin <= STALE_CHECKIN_MS;
        }

        return {
          locationId: location.id,
          locationLabel: location.label,
          agentPolicyId: location.agentPolicyId,
          agentPolicyName: policyNameById.get(location.agentPolicyId) ?? location.agentPolicyId,
          host,
          healthy,
        };
      })
    );

    return results.filter((r): r is MonitorAgentAssignment => r !== null);
  },
});
