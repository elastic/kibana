/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TaskManagerSetupContract } from '@kbn/task-manager-plugin/server/plugin';
import { ALL_SPACES_ID } from '@kbn/spaces-plugin/common/constants';
import { getPrivateLocations } from '../synthetics_service/get_private_locations';
import { getEffectiveAgentPolicyIds } from '../routes/settings/private_locations/helpers';
import type { PrivateLocationAttributes } from '../runtime_types/private_locations';
import type { SyntheticsServerSetup } from '../types';

const TASK_TYPE = 'Synthetics:Policy-Sharding-Distribution';
export const POLICY_SHARDING_TASK_ID = `${TASK_TYPE}-single-instance`;
const TASK_SCHEDULE = '5m';

interface MonitorPolicyAssignment {
  monitorId: string;
  packagePolicyId: string;
  currentAgentPolicyId: string;
  targetAgentPolicyId: string;
}

export class PolicyShardingDistributionTask {
  constructor(private readonly server: SyntheticsServerSetup) {}

  registerTaskDefinition(taskManager: TaskManagerSetupContract) {
    taskManager.registerTaskDefinitions({
      [TASK_TYPE]: {
        title: 'Synthetics Policy Sharding Distribution Task',
        description:
          'Distributes monitors across multiple agent policies for Private Locations with policy sharding enabled',
        timeout: '5m',
        maxAttempts: 1,
        createTaskRunner: () => ({
          run: async () => this.runTask(),
        }),
      },
    });
  }

  async start() {
    const { pluginsStart } = this.server;
    this.debugLog('Scheduling policy sharding distribution task');
    await pluginsStart.taskManager.ensureScheduled({
      id: POLICY_SHARDING_TASK_ID,
      state: {},
      schedule: { interval: TASK_SCHEDULE },
      taskType: TASK_TYPE,
      params: {},
    });
    this.debugLog('Policy sharding distribution task scheduled');
  }

  private async runTask() {
    this.debugLog('Starting policy sharding distribution run');

    try {
      const soClient = this.server.coreStart.savedObjects.createInternalRepository();
      const allPrivateLocations = await getPrivateLocations(soClient, ALL_SPACES_ID);

      const shardedLocations = allPrivateLocations.filter(
        (loc) => loc.agentPolicyIds && loc.agentPolicyIds.length > 1
      );

      if (shardedLocations.length === 0) {
        this.debugLog('No private locations with multiple agent policies found, skipping');
        return { state: {}, schedule: { interval: TASK_SCHEDULE } };
      }

      this.debugLog(
        `Found ${shardedLocations.length} sharded private location(s): ${shardedLocations
          .map((l) => l.label)
          .join(', ')}`
      );

      await this.server.fleet.runWithCache(async () => {
        for (const location of shardedLocations) {
          await this.distributeMonitorsForLocation(location, soClient);
        }
      });

      this.debugLog('Policy sharding distribution completed');
    } catch (error) {
      this.server.logger.error(`Policy sharding distribution failed: ${error.message}`, { error });
    }

    return { state: {}, schedule: { interval: TASK_SCHEDULE } };
  }

  private async distributeMonitorsForLocation(
    location: PrivateLocationAttributes,
    soClient: ReturnType<typeof this.server.coreStart.savedObjects.createInternalRepository>
  ) {
    const agentPolicyIds = getEffectiveAgentPolicyIds(location);
    if (agentPolicyIds.length <= 1) {
      return;
    }

    this.debugLog(
      `Distributing monitors for location "${location.label}" across ${agentPolicyIds.length} policies`
    );

    const packagePolicies = await this.getPackagePoliciesForLocation(location, soClient);

    if (packagePolicies.length === 0) {
      this.debugLog(`No package policies found for location "${location.label}"`);
      return;
    }

    this.debugLog(
      `Found ${packagePolicies.length} package policies for location "${location.label}"`
    );

    const assignments = this.computeRoundRobinAssignments(packagePolicies, agentPolicyIds);

    const reassignments = assignments.filter(
      (a) => a.currentAgentPolicyId !== a.targetAgentPolicyId
    );

    if (reassignments.length === 0) {
      this.debugLog(`No reassignments needed for location "${location.label}"`);
      return;
    }

    this.debugLog(
      `Reassigning ${reassignments.length} of ${packagePolicies.length} package policies for location "${location.label}"`
    );

    await this.applyReassignments(reassignments, soClient);
  }

  private async getPackagePoliciesForLocation(
    location: PrivateLocationAttributes,
    soClient: ReturnType<typeof this.server.coreStart.savedObjects.createInternalRepository>
  ) {
    const agentPolicyIds = getEffectiveAgentPolicyIds(location);

    const allPackagePolicies = [];
    for (const agentPolicyId of agentPolicyIds) {
      const { items } = await this.server.fleet.packagePolicyService.list(soClient, {
        kuery: `ingest-package-policies.policy_ids:"${agentPolicyId}" AND ingest-package-policies.package.name:synthetics`,
        perPage: 10000,
        page: 1,
      });
      allPackagePolicies.push(...items);
    }

    const seen = new Set<string>();
    return allPackagePolicies.filter((pp) => {
      if (seen.has(pp.id)) {
        return false;
      }
      seen.add(pp.id);
      return true;
    });
  }

  private computeRoundRobinAssignments(
    packagePolicies: Array<{ id: string; policy_id?: string | null; policy_ids?: string[] }>,
    agentPolicyIds: string[]
  ): MonitorPolicyAssignment[] {
    const sorted = [...packagePolicies].sort((a, b) => a.id.localeCompare(b.id));

    return sorted.map((pp, index) => ({
      monitorId: pp.id,
      packagePolicyId: pp.id,
      currentAgentPolicyId: pp.policy_id ?? '',
      targetAgentPolicyId: agentPolicyIds[index % agentPolicyIds.length],
    }));
  }

  private async applyReassignments(
    reassignments: MonitorPolicyAssignment[],
    soClient: ReturnType<typeof this.server.coreStart.savedObjects.createInternalRepository>
  ) {
    const esClient = this.server.coreStart.elasticsearch.client.asInternalUser;

    const existingPolicies = await this.server.fleet.packagePolicyService.getByIDs(
      soClient,
      reassignments.map((r) => r.packagePolicyId),
      { ignoreMissing: true }
    );

    if (!existingPolicies || existingPolicies.length === 0) {
      this.debugLog('No existing package policies found for reassignment');
      return;
    }

    const policiesToUpdate = existingPolicies
      .map((existing) => {
        const assignment = reassignments.find((r) => r.packagePolicyId === existing.id);
        if (!assignment) {
          return null;
        }
        return {
          ...existing,
          policy_id: assignment.targetAgentPolicyId,
          policy_ids: [assignment.targetAgentPolicyId],
        };
      })
      .filter((p): p is NonNullable<typeof p> => p !== null);

    if (policiesToUpdate.length === 0) {
      return;
    }

    this.debugLog(`Updating ${policiesToUpdate.length} package policies`);

    const { failedPolicies } = await this.server.fleet.packagePolicyService.bulkUpdate(
      soClient,
      esClient,
      policiesToUpdate,
      { force: true, asyncDeploy: true }
    );

    if (failedPolicies && failedPolicies.length > 0) {
      this.server.logger.warn(
        `Policy sharding: ${failedPolicies.length} package policy updates failed`
      );
      for (const { packagePolicy, error } of failedPolicies) {
        this.server.logger.warn(
          `Failed to reassign package policy ${packagePolicy.id}: ${
            error?.message ?? 'unknown error'
          }`
        );
      }
    } else {
      this.debugLog(`Successfully reassigned ${policiesToUpdate.length} package policies`);
    }
  }

  private debugLog(message: string) {
    this.server.logger.debug(`[PolicyShardingDistribution] ${message}`);
  }
}
