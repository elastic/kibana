/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { ALL_SPACES_ID } from '@kbn/spaces-plugin/common/constants';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { TaskCost, TaskStatus, throwRetryableError } from '@kbn/task-manager-plugin/server';
import type { SyntheticsServerSetup } from '../../types';

export const AGENT_POLICY_REVISION_BUMP_TASK_TYPE = 'Synthetics:Bump-Agent-Policy-Revision';

/**
 * How long a scheduled bump waits for more writes to the same agent policy.
 * Fleet redeploys an agent policy at most once per window, however many of its
 * monitors change in it.
 */
export const AGENT_POLICY_REVISION_BUMP_DELAY_MS = 5_000;

const CONFLICT_RETRY_DELAY_MS = 1_000;
const MAX_SCHEDULE_ATTEMPTS = 3;

export const getAgentPolicyRevisionBumpTaskId = (policyId: string) =>
  `${AGENT_POLICY_REVISION_BUMP_TASK_TYPE}:${policyId}`;

/**
 * Bumps one agent policy's revision, scoping the write to a space the agent
 * policy actually lives in.
 *
 * A bump covers writes for the same agent policy across spaces, so no
 * requesting client is the right one to bump with. That client is not
 * guaranteed to resolve the agent policy — `PackagePolicyService.bulkUpdateInSpace`
 * scopes to each package policy's own recorded space, which can diverge from
 * its agent policy's spaces. So resolve the space from the agent policy itself:
 * `spaceId: ALL_SPACES_ID` on an unscoped client finds it wherever it lives
 * (agent policies are `namespaceType: 'multiple'`, so the write itself still
 * needs a single concrete namespace).
 *
 * Uses `createInternalRepository()`, not `getUnsafeInternalClient()`: the
 * latter always attaches a spaces extension backed by a synthetic, headerless
 * request (there is no real request here — this runs in a task), and resolving
 * the `*` namespace made that extension issue an ES `_has_privileges` check
 * with no credentials, failing the write outright.
 *
 * A missing agent policy has no agents to redeploy, so it is skipped.
 */
export const bumpAgentPolicyRevision = async (
  server: SyntheticsServerSetup,
  policyId: string
): Promise<void> => {
  const unscopedSoClient = server.coreStart.savedObjects.createInternalRepository();
  const [agentPolicy] = await server.fleet.agentPolicyService.getByIds(
    unscopedSoClient,
    [{ id: policyId, spaceId: ALL_SPACES_ID }],
    { ignoreMissing: true, fields: ['name'] }
  );
  if (!agentPolicy) {
    server.logger.debug(`Skipping revision bump of missing agent policy [${policyId}]`);
    return;
  }

  const spaceIds = agentPolicy.space_ids ?? [];
  // Prefer the default space when the policy is there (or is all-spaces): it
  // matches the create/edit routing fallback, and an all-spaces policy cannot
  // be written through a literal `*` namespace.
  const bumpSpaceId =
    spaceIds.length === 0 || spaceIds.includes(DEFAULT_SPACE_ID) || spaceIds.includes(ALL_SPACES_ID)
      ? DEFAULT_SPACE_ID
      : spaceIds[0];

  await server.fleet.agentPolicyService.bumpRevision(
    server.coreStart.savedObjects.getUnsafeInternalClient().asScopedToNamespace(bumpSpaceId),
    server.coreStart.elasticsearch.client.asInternalUser,
    policyId,
    { asyncDeploy: true }
  );
};

export const registerAgentPolicyRevisionBumpTask = (
  server: SyntheticsServerSetup,
  taskManager: TaskManagerSetupContract
) => {
  taskManager.registerTaskDefinitions({
    [AGENT_POLICY_REVISION_BUMP_TASK_TYPE]: {
      title: 'Synthetics Bump Agent Policy Revision',
      description:
        'Bumps a private location agent policy revision once for all monitor writes made to it within a short window, so Fleet redeploys it once.',
      timeout: '1m',
      maxAttempts: 3,
      cost: TaskCost.Tiny,
      paramsSchema: schema.object({ policyId: schema.string({ maxLength: 1024 }) }),
      createTaskRunner: ({ taskInstance, signal }) => ({
        run: async () => {
          const { policyId } = taskInstance.params as { policyId: string };
          // Returning would delete the task and drop the bump, so retry instead.
          if (signal.aborted) {
            throwRetryableError(new Error('Agent policy revision bump aborted'), true);
          }

          try {
            await bumpAgentPolicyRevision(server, policyId);
          } catch (error) {
            // A concurrent Fleet write to the same agent policy wins a version
            // conflict; that clears quickly, unlike other failures.
            throwRetryableError(
              error,
              SavedObjectsErrorHelpers.isConflictError(error)
                ? new Date(Date.now() + CONFLICT_RETRY_DELAY_MS)
                : true
            );
          }
          return { state: {} };
        },
      }),
    },
  });
};

/**
 * Schedules a revision bump for each agent policy, sharing one task per agent
 * policy across all writes and Kibana nodes. Package policies written with
 * `bumpRevision: false` must call this, or Fleet never redeploys them.
 *
 * The task is durable, so a pending bump survives a Kibana restart. Pass
 * `immediate` when an agent is waiting on the write (Test Now) to skip the
 * batching window.
 */
export const scheduleAgentPolicyRevisionBumps = async (
  server: SyntheticsServerSetup,
  policyIds: readonly string[],
  { immediate = false }: { immediate?: boolean } = {}
): Promise<void> => {
  const { taskManager } = server.pluginsStart;

  await Promise.all(
    [...new Set(policyIds)].map(async (policyId) => {
      try {
        if (await handOffRevisionBump(taskManager, policyId, immediate)) {
          return;
        }
      } catch (error) {
        server.logger.warn(
          `Failed to schedule a revision bump for agent policy [${policyId}], bumping it now: ${error.message}`
        );
      }
      await bumpAgentPolicyRevision(server, policyId);
    })
  );
};

/**
 * Returns whether a task bump is guaranteed to run after this write. When it
 * returns false, the caller must bump the agent policy itself.
 */
const handOffRevisionBump = async (
  taskManager: TaskManagerStartContract,
  policyId: string,
  immediate: boolean
): Promise<boolean> => {
  const id = getAgentPolicyRevisionBumpTaskId(policyId);

  for (let attempt = 0; attempt < MAX_SCHEDULE_ATTEMPTS; attempt += 1) {
    try {
      await taskManager.schedule({
        id,
        taskType: AGENT_POLICY_REVISION_BUMP_TASK_TYPE,
        params: { policyId },
        state: {},
        runAt: new Date(Date.now() + (immediate ? 0 : AGENT_POLICY_REVISION_BUMP_DELAY_MS)),
      });
      return true;
    } catch (error) {
      if (!SavedObjectsErrorHelpers.isConflictError(error)) {
        throw error;
      }
    }

    const pending = await getTask(taskManager, id);
    // Completed between the schedule and the read: schedule a fresh bump.
    if (!pending) {
      continue;
    }
    // A claimed bump has not read the agent policy yet, so it covers this write.
    if (pending.status === TaskStatus.Claiming) {
      return true;
    }
    if (pending.status === TaskStatus.Idle) {
      if (!immediate) {
        return true;
      }
      try {
        await taskManager.runSoon(id);
        return true;
      } catch {
        return false;
      }
    }
    // A running bump may already be past the read that would cover this write.
    return false;
  }

  return false;
};

const getTask = async (taskManager: TaskManagerStartContract, id: string) => {
  try {
    return await taskManager.get(id);
  } catch (error) {
    if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
      return undefined;
    }
    throw error;
  }
};
