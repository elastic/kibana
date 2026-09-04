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
import { getFilterForTestNowRun } from '../synthetics_service/private_location/clean_up_task';
import {
  DEFAULT_MAX_CLEANUP_RETRIES,
  type SyncTaskState,
} from './sync_private_locations_monitors_task';
import type { SyntheticsServerSetup } from '../types';

export async function cleanUpDuplicatedPackagePolicies(
  serverSetup: SyntheticsServerSetup,
  soClient: SavedObjectsClientContract,
  taskState: SyncTaskState
) {
  let performCleanupSync = false;
  const { fleet } = serverSetup.pluginsStart;
  const { logger } = serverSetup;

  const debugLog = (msg: string) => {
    logger.debug(`[PrivateLocationCleanUpTask] ${msg}`);
  };

  if (taskState.hasAlreadyDoneCleanup) {
    debugLog('Skipping cleanup of duplicated package policies as it has already been done once');
    return { performCleanupSync };
  } else if (taskState.maxCleanUpRetries <= 0) {
    // `warn`, not `debug`: this is cleanup giving up, and the caller still gets a
    // success response. Leave the spent budget on the state so the exhaustion is
    // visible — `resetSyncPrivateCleanUpState` restores it when cleanup is
    // explicitly requested again.
    logger.warn(
      `[PrivateLocationCleanUpTask] Skipping cleanup of duplicated package policies as max retries have been reached. ` +
        `Request cleanup again to retry.`
    );
    taskState.hasAlreadyDoneCleanup = true;
    return { performCleanupSync };
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
      perPage: 100,
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

    // if we have any to delete or any expected that were not found we need to perform a sync
    performCleanupSync = packagePoliciesToDelete.length > 0 || expectedPackagePolicies.size > 0;

    debugLog(`Found ${packagePoliciesToDelete.length} duplicate package policies to delete.`);
    if (packagePoliciesToDelete.length > 0) {
      debugLog(`Policies to delete: [${packagePoliciesToDelete.join(', ')}]`);
    }
    debugLog(
      `Found ${expectedPackagePolicies.size} expected package policies that were not found.`
    );
    if (expectedPackagePolicies.size > 0) {
      debugLog(`Missing expected policies: [${[...expectedPackagePolicies].join(', ')}]`);
    }

    if (packagePoliciesToDelete.length > 0) {
      await deleteDuplicatePackagePolicies(
        packagePoliciesToDelete,
        soClient,
        esClient,
        serverSetup
      );
    }
    if (performCleanupSync) {
      // A follow-up sync is required (extras deleted, or expected policies are
      // missing). Leave hasAlreadyDoneCleanup unset so the next run re-checks
      // and re-attempts the recreate.
      //
      // Only charge the retry budget when this pass made no progress of its own,
      // i.e. it deleted nothing and is waiting on a recreate that has not landed.
      // That is the case the budget exists for — a permanently failing recreate
      // must stop instead of running cleanup every interval. A pass that deleted
      // policies did real work, and charging it drained the budget during ordinary
      // churn: three such passes (15 minutes) left the budget at 0, and the next
      // cleanup — including one explicitly requested through the API — was skipped
      // while still answering 200.
      const madeNoProgress = packagePoliciesToDelete.length === 0;
      if (madeNoProgress) {
        taskState.maxCleanUpRetries -= 1;
      }
    } else {
      taskState.hasAlreadyDoneCleanup = true;
      taskState.maxCleanUpRetries = DEFAULT_MAX_CLEANUP_RETRIES;
    }
    return { performCleanupSync };
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
    return { performCleanupSync };
  }
}

export async function deleteDuplicatePackagePolicies(
  packagePoliciesToDelete: string[],
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  serverSetup: SyntheticsServerSetup
) {
  const { logger } = serverSetup;
  const { fleet } = serverSetup.pluginsStart;

  logger.info(
    `[PrivateLocationCleanUpTask] Found ${packagePoliciesToDelete.length} duplicate package policies to delete.`
  );
  // Delete it in batches of 100 to avoid sending too large payloads at once.
  const BATCH_SIZE = 100;
  const total = packagePoliciesToDelete.length;
  const totalBatches = Math.ceil(total / BATCH_SIZE);
  for (let i = 0; i < total; i += BATCH_SIZE) {
    const batch = packagePoliciesToDelete.slice(i, i + BATCH_SIZE);
    const batchIndex = Math.floor(i / BATCH_SIZE) + 1;
    logger.info(
      `[PrivateLocationCleanUpTask] Deleting batch ${batchIndex}/${totalBatches} (size=${
        batch.length
      }), with ids [${batch.join(`, `)}]`
    );
    await fleet.packagePolicyService.delete(soClient, esClient, batch, {
      force: true,
      spaceIds: ['*'],
      ignoreMissing: true,
    });
  }
}
