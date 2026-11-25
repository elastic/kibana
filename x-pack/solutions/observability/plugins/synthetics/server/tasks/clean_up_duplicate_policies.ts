/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { ALL_SPACES_ID } from '@kbn/spaces-plugin/common/constants';
import { syntheticsMonitorSOTypes } from '../../common/types/saved_objects';
import type { EncryptedSyntheticsMonitorAttributes } from '../../common/runtime_types';
import { SyntheticsPrivateLocation } from '../synthetics_service/private_location/synthetics_private_location';
import { bumpAgentPolicyRevision } from '../synthetics_service/private_location/package_policy_service';
import { getPrivateLocations } from '../synthetics_service/get_private_locations';
import { getFilterForTestNowRun } from './test_now_run_filter';
import type { SyntheticsServerSetup } from '../types';

/**
 * Fleet's delete reads every policy of a batch in full, so this bounds memory
 * rather than an ES limit. Past 1000, larger batches barely shorten the run.
 */
export const DUPLICATE_PACKAGE_POLICY_DELETE_BATCH_SIZE = 1000;

/** Scans read ids and a few small fields only; ES caps a page at 10k hits. */
export const PACKAGE_POLICY_SCAN_PAGE_SIZE = 5000;

export interface LeftoverPackagePolicies {
  /** Private-location policies that no monitor expects, including old-format ids. */
  leftoverIds: string[];
  /** Private locations where a monitor's expected policy does not exist. */
  missingLocationIds: string[];
}

/**
 * Compares existing private-location package policies with the
 * `{configId}-{locationId}` ids that monitors expect.
 */
export const findLeftoverPackagePolicies = async (
  server: SyntheticsServerSetup,
  soClient: SavedObjectsClientContract
): Promise<LeftoverPackagePolicies> => {
  const { fleet } = server.pluginsStart;

  // Policies first: one created after this listing is never seen, so it cannot be
  // mistaken for a leftover of a monitor the scan below has not caught up with.
  const existingIds = new Set<string>();
  const policyIdPages = await fleet.packagePolicyService.fetchAllItemIds(soClient, {
    kuery: getFilterForTestNowRun(true),
    spaceIds: ['*'],
    perPage: PACKAGE_POLICY_SCAN_PAGE_SIZE,
  });
  for await (const ids of policyIdPages) {
    ids.forEach((id) => existingIds.add(id));
  }

  const privateLocationAPI = new SyntheticsPrivateLocation(server);
  const expectedLocationById = new Map<string, string>();
  const finder = soClient.createPointInTimeFinder<EncryptedSyntheticsMonitorAttributes>({
    type: syntheticsMonitorSOTypes,
    fields: ['id', 'locations', 'origin'],
    namespaces: ['*'],
    perPage: PACKAGE_POLICY_SCAN_PAGE_SIZE,
  });
  try {
    for await (const { saved_objects: monitors } of finder.find()) {
      for (const { attributes } of monitors) {
        for (const location of attributes.locations ?? []) {
          if (!location.isServiceManaged) {
            const policyId = privateLocationAPI.getPolicyId(
              { origin: attributes.origin, id: attributes.id },
              location.id
            );
            expectedLocationById.set(policyId, location.id);
          }
        }
      }
    }
  } finally {
    finder.close().catch(() => {});
  }

  const leftoverIds = [...existingIds].filter((id) => !expectedLocationById.has(id));
  const missingLocationIds = [
    ...new Set(
      [...expectedLocationById]
        .filter(([policyId]) => !existingIds.has(policyId))
        .map(([, locationId]) => locationId)
    ),
  ];
  return { leftoverIds, missingLocationIds };
};

/**
 * Deletes package policies across all spaces, then bumps each affected agent
 * policy once rather than once per batch.
 */
export const deletePackagePolicies = async (
  packagePolicyIds: string[],
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  server: SyntheticsServerSetup,
  signal?: AbortSignal
): Promise<void> => {
  const { logger } = server;
  const { fleet } = server.pluginsStart;
  const totalBatches = Math.ceil(
    packagePolicyIds.length / DUPLICATE_PACKAGE_POLICY_DELETE_BATCH_SIZE
  );
  const agentPolicyIds = new Set<string>();

  try {
    for (let i = 0; i < packagePolicyIds.length; i += DUPLICATE_PACKAGE_POLICY_DELETE_BATCH_SIZE) {
      if (signal?.aborted) {
        return;
      }
      const batch = packagePolicyIds.slice(i, i + DUPLICATE_PACKAGE_POLICY_DELETE_BATCH_SIZE);
      logger.info(
        `[PrivateLocationCleanUpTask] Deleting batch ${
          i / DUPLICATE_PACKAGE_POLICY_DELETE_BATCH_SIZE + 1
        }/${totalBatches} of ${batch.length} package policies`
      );
      // Fleet's default bumps the agent policy for every deleted package policy,
      // recompiling and redeploying it each time (thousands of units on a Windows
      // private location).
      let results: Awaited<ReturnType<typeof fleet.packagePolicyService.delete>>;
      try {
        results = await fleet.packagePolicyService.delete(soClient, esClient, batch, {
          force: true,
          spaceIds: ['*'],
          ignoreMissing: true,
          bumpRevision: false,
        });
      } catch (error) {
        // Fleet's delete is not atomic: it can reject after part of the batch is gone, and
        // which agent policies those sat on is lost with the response.
        const fallbackIds = await getAllPrivateLocationAgentPolicyIds(soClient, server);
        fallbackIds.forEach((policyId) => agentPolicyIds.add(policyId));
        throw error;
      }
      for (const result of results ?? []) {
        if (result.success) {
          result.policy_ids?.forEach((policyId) => agentPolicyIds.add(policyId));
          if (result.policy_id) {
            agentPolicyIds.add(result.policy_id);
          }
        }
      }
    }
  } finally {
    // Deletes that already landed must not be left undeployed by an abort or a failed batch.
    await bumpAgentPolicyRevisions([...agentPolicyIds], server);
  }
};

/** Every synthetics package policy sits on one of these. */
const getAllPrivateLocationAgentPolicyIds = async (
  soClient: SavedObjectsClientContract,
  server: SyntheticsServerSetup
): Promise<string[]> => {
  try {
    const privateLocations = await getPrivateLocations(soClient, ALL_SPACES_ID);
    return privateLocations.map(({ agentPolicyId }) => agentPolicyId);
  } catch (error) {
    server.logger.error(
      '[PrivateLocationCleanUpTask] Failed to read private locations to bump their agent policies after a failed delete',
      { error }
    );
    return [];
  }
};

export const bumpAgentPolicyRevisions = async (
  agentPolicyIds: string[],
  server: SyntheticsServerSetup
): Promise<void> => {
  for (const policyId of new Set(agentPolicyIds)) {
    try {
      // Resolves the agent policy's own space: a bump through the default-space
      // client 404s for any agent policy that lives elsewhere.
      await bumpAgentPolicyRevision(server, policyId);
    } catch (error) {
      server.logger.error(
        `[PrivateLocationCleanUpTask] Failed to bump agent policy [${policyId}] after deleting its package policies`,
        { error }
      );
    }
  }
};
