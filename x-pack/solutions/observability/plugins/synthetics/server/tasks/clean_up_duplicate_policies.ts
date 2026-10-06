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
import type { SyntheticsServerSetup } from '../types';

/** Fleet SO bulk-delete allows 10k; keep well under that and getByIDs payload size. */
export const DUPLICATE_PACKAGE_POLICY_DELETE_BATCH_SIZE = 500;

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
    perPage: DUPLICATE_PACKAGE_POLICY_DELETE_BATCH_SIZE,
  });
  for await (const ids of policyIdPages) {
    ids.forEach((id) => existingIds.add(id));
  }

  const privateLocationAPI = new SyntheticsPrivateLocation(server);
  const expectedLocationById = new Map<string, string>();
  const finder = soClient.createPointInTimeFinder<EncryptedSyntheticsMonitorAttributes>({
    type: syntheticsMonitorSOTypes,
    fields: ['id', 'name', 'locations', 'origin'],
    namespaces: ['*'],
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
 * Deletes package policies across all spaces, bumping the affected agent
 * policies once per batch rather than once per deleted policy.
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
    const results = await fleet.packagePolicyService.delete(soClient, esClient, batch, {
      force: true,
      spaceIds: ['*'],
      ignoreMissing: true,
      bumpRevision: false,
    });
    const agentPolicyIds = new Set<string>();
    for (const result of results ?? []) {
      if (result.success) {
        result.policy_ids?.forEach((policyId) => agentPolicyIds.add(policyId));
        if (result.policy_id) {
          agentPolicyIds.add(result.policy_id);
        }
      }
    }
    // Bump before the next batch: these deletes are already durable, and nothing
    // later could tell that this agent policy still owes a revision.
    await bumpAgentPolicyRevisions([...agentPolicyIds], server);
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
