/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { chunk, countBy, sortBy, uniq } from 'lodash';
import { syntheticsMonitorSOTypes } from '../../common/types/saved_objects';
import type { EncryptedSyntheticsMonitorAttributes } from '../../common/runtime_types';
import { SyntheticsPrivateLocation } from '../synthetics_service/private_location/synthetics_private_location';
import { bumpAgentPolicyRevision } from '../synthetics_service/private_location/package_policy_service';
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

const getAgentPolicyIds = ({
  policy_ids: policyIds,
  policy_id: policyId,
}: {
  policy_ids?: string[];
  policy_id?: string | null;
}): string[] => uniq([...(policyIds ?? []), ...(policyId ? [policyId] : [])]);

const getAgentPolicyIdsById = async (
  packagePolicyIds: string[],
  soClient: SavedObjectsClientContract,
  server: SyntheticsServerSetup
): Promise<Map<string, string[]>> => {
  const agentPolicyIdsById = new Map<string, string[]>();
  for (const ids of chunk(packagePolicyIds, PACKAGE_POLICY_SCAN_PAGE_SIZE)) {
    const policies = await server.pluginsStart.fleet.packagePolicyService.getByIDs(soClient, ids, {
      ignoreMissing: true,
      spaceIds: ['*'],
      fields: ['policy_ids', 'policy_id'],
    });
    policies.forEach((policy) => agentPolicyIdsById.set(policy.id, getAgentPolicyIds(policy)));
  }
  return agentPolicyIdsById;
};

/**
 * Deletes package policies across all spaces and bumps each affected agent
 * policy once, as soon as the last of its package policies is deleted.
 */
export const deletePackagePolicies = async (
  packagePolicyIds: string[],
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  server: SyntheticsServerSetup,
  signal?: AbortSignal
): Promise<void> => {
  if (packagePolicyIds.length === 0) {
    return;
  }
  const { logger } = server;
  const { fleet } = server.pluginsStart;

  const agentPolicyIdsById = await getAgentPolicyIdsById(packagePolicyIds, soClient, server);
  const agentPolicyIdsOf = (id: string) => agentPolicyIdsById.get(id) ?? [];
  // Contiguous per agent policy, so each one's deletes finish in as few batches as possible.
  const orderedIds = sortBy(packagePolicyIds, (id) => [...agentPolicyIdsOf(id)].sort().join());
  const pendingDeletes = countBy(orderedIds.flatMap(agentPolicyIdsOf));
  const owedBumps = new Set<string>();
  const totalBatches = Math.ceil(orderedIds.length / DUPLICATE_PACKAGE_POLICY_DELETE_BATCH_SIZE);

  try {
    for (let i = 0; i < orderedIds.length; i += DUPLICATE_PACKAGE_POLICY_DELETE_BATCH_SIZE) {
      if (signal?.aborted) {
        return;
      }
      const batch = orderedIds.slice(i, i + DUPLICATE_PACKAGE_POLICY_DELETE_BATCH_SIZE);
      logger.info(
        `[PrivateLocationCleanUpTask] Deleting batch ${
          i / DUPLICATE_PACKAGE_POLICY_DELETE_BATCH_SIZE + 1
        }/${totalBatches} of ${batch.length} package policies`
      );
      // Fleet's default bumps the agent policy for every deleted package policy,
      // recompiling and redeploying it each time (thousands of units on a Windows
      // private location).
      const results = await fleet.packagePolicyService
        .delete(soClient, esClient, batch, {
          force: true,
          spaceIds: ['*'],
          ignoreMissing: true,
          bumpRevision: false,
        })
        .catch((error) => {
          // part of the batch may already be gone
          batch.flatMap(agentPolicyIdsOf).forEach((policyId) => owedBumps.add(policyId));
          throw error;
        });
      for (const result of results ?? []) {
        if (result.success) {
          getAgentPolicyIds(result).forEach((policyId) => owedBumps.add(policyId));
        }
      }
      batch.flatMap(agentPolicyIdsOf).forEach((policyId) => (pendingDeletes[policyId] -= 1));

      const completed = [...owedBumps].filter((policyId) => !pendingDeletes[policyId]);
      completed.forEach((policyId) => owedBumps.delete(policyId));
      await bumpAgentPolicyRevisions(completed, server);
    }
  } finally {
    // Deletes that already landed must not be left undeployed by an abort or a failed batch.
    await bumpAgentPolicyRevisions([...owedBumps], server);
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
