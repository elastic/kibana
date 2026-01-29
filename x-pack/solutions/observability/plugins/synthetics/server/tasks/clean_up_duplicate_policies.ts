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
import type { SyncTaskState } from './sync_private_locations_monitors_task';
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
    debugLog('Skipping cleanup of duplicated package policies as max retries have been reached');
    taskState.hasAlreadyDoneCleanup = true;
    taskState.maxCleanUpRetries = 3;
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

    // Track expected new format policy IDs: {monitorId}-{locationId}
    const expectedNewFormatIds = new Set<string>();

    for await (const result of finder.find()) {
      result.saved_objects.forEach((monitor) => {
        monitor.attributes.locations?.forEach((location) => {
          if (!location.isServiceManaged) {
            const newFormatId = privateLocationAPI.getPolicyId(
              {
                origin: monitor.attributes.origin,
                id: monitor.attributes.id,
              },
              location.id
            );
            expectedNewFormatIds.add(newFormatId);
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

    // Collect all existing policy IDs
    const allExistingPolicyIds: string[] = [];
    for await (const packagePoliciesIds of policiesIterator) {
      allExistingPolicyIds.push(...packagePoliciesIds);
    }

    // Determine which policies to keep and which to delete
    const { policiesToKeep, policiesToDelete } = determinePoliciesToCleanup(
      allExistingPolicyIds,
      expectedNewFormatIds,
      debugLog
    );

    // Check if there are expected policies that don't exist (need sync)
    const missingPolicies = new Set(expectedNewFormatIds);
    for (const policyId of policiesToKeep) {
      missingPolicies.delete(policyId);
      // Also remove if a legacy exists for this new format
      for (const newFormatId of expectedNewFormatIds) {
        if (policyId.startsWith(newFormatId + '-')) {
          missingPolicies.delete(newFormatId);
        }
      }
    }

    performCleanupSync = policiesToDelete.length > 0 || missingPolicies.size > 0;

    debugLog(`Found ${policiesToDelete.length} duplicate/legacy package policies to delete.`);
    debugLog(`Found ${missingPolicies.size} expected package policies that were not found.`);

    if (policiesToDelete.length > 0) {
      await deleteDuplicatePackagePolicies(policiesToDelete, soClient, esClient, serverSetup);
    }
    taskState.hasAlreadyDoneCleanup = true;
    taskState.maxCleanUpRetries = 3;
    return { performCleanupSync };
  } catch (e) {
    taskState.maxCleanUpRetries -= 1;
    if (taskState.maxCleanUpRetries <= 0) {
      debugLog('Skipping cleanup of duplicated package policies as max retries have been reached');
      taskState.hasAlreadyDoneCleanup = true;
      taskState.maxCleanUpRetries = 3;
    }
    logger.error(
      '[SyncPrivateLocationMonitorsTask] Error cleaning up duplicated package policies',
      { error: e }
    );
    return { performCleanupSync };
  }
}

/**
 * Determines which policies to keep and which to delete:
 * 1. New format policy exists → keep it, delete all legacy variants
 * 2. Only legacy exists → keep ONE (first found), delete others
 * 3. Unknown policies (not matching any monitor) → delete
 */
export function determinePoliciesToCleanup(
  existingPolicyIds: string[],
  expectedNewFormatIds: Set<string>,
  debugLog: (msg: string) => void
): { policiesToKeep: string[]; policiesToDelete: string[] } {
  const policiesToKeep: string[] = [];
  const policiesToDelete: string[] = [];

  // Track which new format IDs have their policy found
  const foundNewFormat = new Set<string>();
  // Track legacy policies grouped by their base (new format) ID
  const legacyPoliciesByNewId = new Map<string, string[]>();

  for (const policyId of existingPolicyIds) {
    // Check if this is a new format policy
    if (expectedNewFormatIds.has(policyId)) {
      foundNewFormat.add(policyId);
      policiesToKeep.push(policyId);
      continue;
    }

    // Check if this is a legacy policy for a known monitor
    let matchedNewFormatId: string | null = null;
    for (const newFormatId of expectedNewFormatIds) {
      if (policyId.startsWith(newFormatId + '-')) {
        matchedNewFormatId = newFormatId;
        break;
      }
    }

    if (matchedNewFormatId) {
      // This is a legacy policy for a known monitor
      if (!legacyPoliciesByNewId.has(matchedNewFormatId)) {
        legacyPoliciesByNewId.set(matchedNewFormatId, []);
      }
      legacyPoliciesByNewId.get(matchedNewFormatId)!.push(policyId);
    } else {
      // Unknown policy - not matching any expected monitor, delete it
      policiesToDelete.push(policyId);
      debugLog(`Marking unknown policy for deletion: ${policyId}`);
    }
  }

  // Process legacy policies: keep one if new format doesn't exist, delete all others
  for (const [newFormatId, legacyIds] of legacyPoliciesByNewId) {
    if (foundNewFormat.has(newFormatId)) {
      // New format exists - all legacy variants are duplicates, delete them
      policiesToDelete.push(...legacyIds);
      debugLog(
        `New format policy exists for ${newFormatId}, marking ${legacyIds.length} legacy policies for deletion`
      );
    } else {
      // New format doesn't exist - keep first legacy, delete the rest
      const [firstLegacy, ...restLegacy] = legacyIds;
      policiesToKeep.push(firstLegacy);
      debugLog(`Keeping legacy policy: ${firstLegacy}`);
      if (restLegacy.length > 0) {
        policiesToDelete.push(...restLegacy);
        debugLog(`Marking ${restLegacy.length} duplicate legacy policies for deletion`);
      }
    }
  }

  return { policiesToKeep, policiesToDelete };
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
    });
  }
}
