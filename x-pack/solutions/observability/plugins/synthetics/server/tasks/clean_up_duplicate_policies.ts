/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { syntheticsMonitorSOTypes } from '../../common/types/saved_objects';
import type { EncryptedSyntheticsMonitorAttributes } from '../../common/runtime_types';
import { SyntheticsPrivateLocation } from '../synthetics_service/private_location/synthetics_private_location';
import { bumpAgentPolicyRevision } from '../synthetics_service/private_location/package_policy_service';
import { getFilterForTestNowRun } from './test_now_run_filter';
import {
  DEFAULT_MAX_CLEANUP_RETRIES,
  LEFTOVER_CLEANUP_SCAN_VERSION,
  type LeftoverCleanupTaskState,
} from './sync_private_locations_monitors_task';
import type { SyntheticsServerSetup } from '../types';

/** Fleet SO bulk-delete allows 10k; keep well under that and getByIDs payload size. */
export const DUPLICATE_PACKAGE_POLICY_DELETE_BATCH_SIZE = 500;

export interface DeleteDuplicatePackagePoliciesResult {
  deletedCount: number;
  failedAgentPolicyIds: string[];
  attemptedAgentPolicyIds: string[];
}

export interface CleanUpDuplicatedPackagePoliciesResult {
  performCleanupSync: boolean;
  failedAgentPolicyIds: string[];
  attemptedAgentPolicyIds: string[];
}

export async function cleanUpDuplicatedPackagePolicies(
  serverSetup: SyntheticsServerSetup,
  soClient: SavedObjectsClientContract,
  taskState: LeftoverCleanupTaskState
): Promise<CleanUpDuplicatedPackagePoliciesResult> {
  let performCleanupSync = false;
  let failedAgentPolicyIds: string[] = [];
  let attemptedAgentPolicyIds: string[] = [];
  const { fleet } = serverSetup.pluginsStart;
  const { logger } = serverSetup;

  const debugLog = (msg: string) => {
    logger.debug(`[PrivateLocationCleanUpTask] ${msg}`);
  };

  if ((taskState.cleanupScanVersion ?? 0) < LEFTOVER_CLEANUP_SCAN_VERSION) {
    if (taskState.hasAlreadyDoneCleanup) {
      taskState.hasAlreadyDoneCleanup = false;
      taskState.maxCleanUpRetries = DEFAULT_MAX_CLEANUP_RETRIES;
    }
    taskState.cleanupScanVersion = LEFTOVER_CLEANUP_SCAN_VERSION;
  }

  if (taskState.hasAlreadyDoneCleanup) {
    debugLog('Skipping cleanup of duplicated package policies as it has already been done once');
    return { performCleanupSync, failedAgentPolicyIds, attemptedAgentPolicyIds };
  }

  // The budget bounds recreate attempts only. Letting it stop the scan too would
  // hide leftovers behind a recreate that can never succeed — the 9.5.3 failure.
  const canRecreate = (taskState.maxCleanUpRetries ?? DEFAULT_MAX_CLEANUP_RETRIES) > 0;
  if (!canRecreate) {
    logger.warn(
      `[PrivateLocationCleanUpTask] Not recreating missing package policies as max retries have been reached. ` +
        `Leftover policies are still deleted. Request cleanup again to retry.`
    );
  }
  debugLog('Starting cleanup of duplicated package policies');

  try {
    const esClient = serverSetup.coreStart?.elasticsearch?.client.asInternalUser;

    const finder = soClient.createPointInTimeFinder<EncryptedSyntheticsMonitorAttributes>({
      type: syntheticsMonitorSOTypes,
      fields: ['id', 'name', 'locations', 'origin'],
      namespaces: ['*'],
    });

    const privateLocationAPI = new SyntheticsPrivateLocation(serverSetup);

    const expectedPackagePolicies = new Set<string>();
    for await (const result of finder.find()) {
      result.saved_objects.forEach((monitor) => {
        monitor.attributes.locations?.forEach((location) => {
          if (!location.isServiceManaged) {
            const policyId = privateLocationAPI.getPolicyId(
              {
                origin: monitor.attributes.origin,
                id: monitor.attributes.id,
              },
              location.id
            );
            expectedPackagePolicies.add(policyId);
          }
        });
      });
    }

    finder.close().catch(() => {});

    const packagePoliciesKuery = getFilterForTestNowRun(true);

    const policiesIterator = await fleet.packagePolicyService.fetchAllItemIds(soClient, {
      kuery: packagePoliciesKuery,
      spaceIds: ['*'],
      perPage: DUPLICATE_PACKAGE_POLICY_DELETE_BATCH_SIZE,
    });
    const packagePoliciesToDelete: string[] = [];

    for await (const packagePoliciesIds of policiesIterator) {
      for (const packagePolicyId of packagePoliciesIds) {
        if (!expectedPackagePolicies.has(packagePolicyId)) {
          packagePoliciesToDelete.push(packagePolicyId);
        }
        // remove it from the set to mark it as found
        expectedPackagePolicies.delete(packagePolicyId);
      }
    }

    const wasLatched = taskState.hasAlreadyDoneCleanup;
    const hasExtras = packagePoliciesToDelete.length > 0;
    const hasMissing = expectedPackagePolicies.size > 0;

    debugLog(`Found ${packagePoliciesToDelete.length} duplicate package policies to delete.`);
    if (hasExtras) {
      debugLog(`Policies to delete: [${packagePoliciesToDelete.join(', ')}]`);
    }
    debugLog(
      `Found ${expectedPackagePolicies.size} expected package policies that were not found.`
    );
    if (hasMissing) {
      debugLog(`Missing expected policies: [${[...expectedPackagePolicies].join(', ')}]`);
    }

    if (hasExtras) {
      const deleted = await deleteDuplicatePackagePolicies(
        packagePoliciesToDelete,
        soClient,
        esClient,
        serverSetup
      );
      failedAgentPolicyIds = deleted.failedAgentPolicyIds;
      attemptedAgentPolicyIds = deleted.attemptedAgentPolicyIds;
      const { deletedCount } = deleted;
      if (deletedCount > 0) {
        taskState.hasAlreadyDoneCleanup = false;
        taskState.maxCleanUpRetries = DEFAULT_MAX_CLEANUP_RETRIES;
      } else {
        taskState.maxCleanUpRetries -= 1;
        if (taskState.maxCleanUpRetries <= 0) {
          logger.warn(
            `[PrivateLocationCleanUpTask] Skipping cleanup of duplicated package policies as max retries have been reached. ` +
              `Request cleanup again to retry.`
          );
          taskState.hasAlreadyDoneCleanup = true;
        }
      }
    }

    if (hasMissing) {
      // Latch means we already gave up on recreate. Do not reopen that loop
      // when the only problem is still-missing expected policies.
      if (wasLatched && !hasExtras) {
        return { performCleanupSync, failedAgentPolicyIds, attemptedAgentPolicyIds };
      }
      // Deleted extras need no recreate of their own: a monitor left without its
      // expected policy shows up here as missing.
      if (canRecreate) {
        performCleanupSync = true;
        if (!hasExtras) {
          taskState.maxCleanUpRetries -= 1;
        }
      }
    } else if (!hasExtras) {
      taskState.hasAlreadyDoneCleanup = true;
      taskState.maxCleanUpRetries = DEFAULT_MAX_CLEANUP_RETRIES;
    }
    return { performCleanupSync, failedAgentPolicyIds, attemptedAgentPolicyIds };
  } catch (e) {
    taskState.maxCleanUpRetries -= 1;
    if (taskState.maxCleanUpRetries <= 0) {
      logger.warn(
        `[PrivateLocationCleanUpTask] Skipping cleanup of duplicated package policies as max retries have been reached. ` +
          `Request cleanup again to retry.`
      );
      taskState.hasAlreadyDoneCleanup = true;
    }
    logger.error(
      '[SyncPrivateLocationMonitorsTask] Error cleaning up duplicated package policies',
      { error: e }
    );
    return { performCleanupSync, failedAgentPolicyIds, attemptedAgentPolicyIds };
  }
}

export async function deleteDuplicatePackagePolicies(
  packagePoliciesToDelete: string[],
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  serverSetup: SyntheticsServerSetup
): Promise<DeleteDuplicatePackagePoliciesResult> {
  const { logger } = serverSetup;
  const { fleet } = serverSetup.pluginsStart;

  logger.info(
    `[PrivateLocationCleanUpTask] Found ${packagePoliciesToDelete.length} duplicate package policies to delete.`
  );
  const total = packagePoliciesToDelete.length;
  const totalBatches = Math.ceil(total / DUPLICATE_PACKAGE_POLICY_DELETE_BATCH_SIZE);
  const agentPolicyIds = new Set<string>();
  let deletedCount = 0;
  try {
    for (let i = 0; i < total; i += DUPLICATE_PACKAGE_POLICY_DELETE_BATCH_SIZE) {
      const batch = packagePoliciesToDelete.slice(
        i,
        i + DUPLICATE_PACKAGE_POLICY_DELETE_BATCH_SIZE
      );
      const batchIndex = Math.floor(i / DUPLICATE_PACKAGE_POLICY_DELETE_BATCH_SIZE) + 1;
      logger.info(
        `[PrivateLocationCleanUpTask] Deleting batch ${batchIndex}/${totalBatches} (size=${
          batch.length
        }), with ids [${batch.join(`, `)}]`
      );
      // `bumpRevision: false`: one agent-policy bump after every leftover is
      // gone. Default bump-per-delete would redeploy the full policy once per
      // batch (thousands of units on a Windows private location).
      const results = await fleet.packagePolicyService.delete(soClient, esClient, batch, {
        force: true,
        spaceIds: ['*'],
        ignoreMissing: true,
        bumpRevision: false,
      });
      for (const result of results ?? []) {
        if (!result.success) {
          continue;
        }
        deletedCount += 1;
        for (const policyId of result.policy_ids ?? []) {
          agentPolicyIds.add(policyId);
        }
        if (result.policy_id) {
          agentPolicyIds.add(result.policy_id);
        }
      }
    }
  } catch (e) {
    // Earlier batches are already deleted with no revision bump, so their agents
    // still run the removed integrations. Bump what was collected before failing.
    await bumpAgentPolicyRevisions([...agentPolicyIds], serverSetup);
    throw e;
  }

  const attemptedAgentPolicyIds = [...agentPolicyIds];
  const failedAgentPolicyIds = await bumpAgentPolicyRevisions(attemptedAgentPolicyIds, serverSetup);
  return { deletedCount, failedAgentPolicyIds, attemptedAgentPolicyIds };
}

export const bumpAgentPolicyRevisions = async (
  agentPolicyIds: string[],
  serverSetup: SyntheticsServerSetup
): Promise<string[]> => {
  const uniqueIds = [...new Set(agentPolicyIds)];
  if (uniqueIds.length === 0) {
    return [];
  }

  const { logger } = serverSetup;
  logger.info(
    `[PrivateLocationCleanUpTask] Bumping agent policy revision for [${uniqueIds.join(', ')}]`
  );
  const failedAgentPolicyIds: string[] = [];
  for (const policyId of uniqueIds) {
    try {
      // Resolves the agent policy's own space: leftovers are deleted across all
      // spaces, but a bump through the default-space client 404s for any agent
      // policy that lives elsewhere.
      await bumpAgentPolicyRevision(serverSetup, policyId);
    } catch (error) {
      logger.error(
        `[PrivateLocationCleanUpTask] Failed to bump agent policy [${policyId}]; will retry on the next run`,
        { error }
      );
      failedAgentPolicyIds.push(policyId);
    }
  }
  return failedAgentPolicyIds;
};
