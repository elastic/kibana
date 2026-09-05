/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { getPrivateLocationsAndAgentPolicies } from './get_private_locations';
import { getEnrolledAgents } from './get_agent_stats';
import type { SyntheticsRestApiRouteFactory } from '../../types';
import { SYNTHETICS_API_URLS } from '../../../../common/constants';
import { ConfigKey } from '../../../../common/runtime_types';
import type { MonitorAssignedAgent, MonitorLocationAssignment } from '../../../../common/types';
import { getMonitorNotFoundResponse } from '../../synthetics_service/service_errors';
import {
  assignedAgentIdForMonitorLocation,
  isConditionShardedLocation,
} from '../../../synthetics_service/private_location/assign_by_condition';
import { PackagePolicyService } from '../../../synthetics_service/private_location/package_policy_service';

const toAssignedAgent = (meta: {
  agentId: string;
  host: string;
  agentStatus: string | null;
  agentVersion: string | null;
}): MonitorAssignedAgent => ({
  agentId: meta.agentId,
  host: meta.host,
  healthy: meta.agentStatus === 'online',
  agentVersion: meta.agentVersion,
  enrolled: true,
});

/** Stamped assignment whose agent is no longer in Fleet's enrolled list. */
const toMissingAssignedAgent = (agentId: string): MonitorAssignedAgent => ({
  agentId,
  host: '',
  healthy: false,
  agentVersion: null,
  enrolled: false,
});

export const getMonitorAgentAssignment: SyntheticsRestApiRouteFactory<
  MonitorLocationAssignment[]
> = () => ({
  method: 'GET',
  path: SYNTHETICS_API_URLS.MONITOR_AGENT_ASSIGNMENT,
  validate: {
    params: schema.object({
      monitorId: schema.string({ minLength: 1, maxLength: 1024 }),
    }),
  },
  handler: async ({
    request,
    response,
    spaceId,
    monitorConfigRepository,
    server,
    savedObjectsClient,
    syntheticsMonitorClient,
  }) => {
    const { monitorId } = request.params;

    try {
      const monitor = await monitorConfigRepository.get(monitorId);
      // Fleet package-policy ids use HeartbeatConfig.id (MONITOR_QUERY_ID /
      // custom_heartbeat_id), which differs from the saved-object config_id on
      // project monitors. Looking up by monitorId would miss the pin.
      const policyMonitorId = monitor.attributes[ConfigKey.MONITOR_QUERY_ID] || monitorId;
      const privateMonitorLocations = (monitor.attributes.locations ?? []).filter(
        (location) => !location.isServiceManaged
      );
      if (privateMonitorLocations.length === 0) {
        return [];
      }

      const { locations, agentPolicies } = await getPrivateLocationsAndAgentPolicies(
        savedObjectsClient,
        syntheticsMonitorClient
      );
      const locationById = new Map(locations.map((location) => [location.id, location]));
      const policyNameById = new Map(agentPolicies.map((policy) => [policy.id, policy.name]));

      const shardedMonitorLocations = privateMonitorLocations.filter((location) => {
        const privateLocation = locationById.get(location.id);
        return privateLocation != null && isConditionShardedLocation(privateLocation);
      });

      const packagePolicies =
        shardedMonitorLocations.length > 0
          ? await new PackagePolicyService(server).getByIds({
              spaceId,
              packagePolicyIds: shardedMonitorLocations.flatMap((location) => [
                `${policyMonitorId}-${location.id}`,
                `${policyMonitorId}-${location.id}-${spaceId}`,
              ]),
              fields: ['id', 'name', 'condition'],
            })
          : [];

      const enrolledByPolicyId = new Map<string, Awaited<ReturnType<typeof getEnrolledAgents>>>();
      const assignments: MonitorLocationAssignment[] = [];

      for (const monitorLocation of privateMonitorLocations) {
        const privateLocation = locationById.get(monitorLocation.id);
        if (!privateLocation) {
          continue;
        }

        let enrolled = enrolledByPolicyId.get(privateLocation.agentPolicyId);
        if (!enrolled) {
          enrolled = await getEnrolledAgents(server, privateLocation.agentPolicyId).catch(
            () => new Map()
          );
          enrolledByPolicyId.set(privateLocation.agentPolicyId, enrolled);
        }
        const isAgentSharding = isConditionShardedLocation(privateLocation);

        let agents: MonitorAssignedAgent[];
        if (isAgentSharding) {
          const assignedAgentId = assignedAgentIdForMonitorLocation(
            packagePolicies.filter(
              (policy): policy is { id: string; condition?: string | null } =>
                typeof policy.id === 'string'
            ),
            policyMonitorId,
            monitorLocation.id,
            spaceId
          );
          const assigned = assignedAgentId ? enrolled.get(assignedAgentId) : undefined;
          if (assigned) {
            agents = [toAssignedAgent(assigned)];
          } else if (assignedAgentId) {
            agents = [toMissingAssignedAgent(assignedAgentId)];
          } else {
            agents = [];
          }
        } else {
          agents = [...enrolled.values()].map(toAssignedAgent);
        }

        assignments.push({
          locationId: privateLocation.id,
          locationLabel: privateLocation.label,
          isAgentSharding,
          agentPolicyId: privateLocation.agentPolicyId,
          agentPolicyName:
            policyNameById.get(privateLocation.agentPolicyId) ?? privateLocation.agentPolicyId,
          agents,
        });
      }

      return assignments;
    } catch (error) {
      if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
        return getMonitorNotFoundResponse(response, monitorId);
      }
      throw error;
    }
  },
});
