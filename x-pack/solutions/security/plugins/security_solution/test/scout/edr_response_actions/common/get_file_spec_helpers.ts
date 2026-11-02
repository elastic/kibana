/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsClient, ScoutTestConfig } from '@kbn/scout-security';
import type { ActionDetails } from '../../../../common/endpoint/types';
import type { SeededEndpointHosts } from './seed_endpoint_hosts';
import { deleteGetFileUploads, deleteSubmittedHostActions } from './complete_host_action';

/** One host seed waits up to 4 minutes for the current index and 4 for the united index. */
export const HOST_SEED_TIMEOUT_MS = 600_000;

/**
 * Seed budget for parallel UI workers: one host seed, after waiting for the other
 * worker's metadata-transform lock, which is held for up to one host seed.
 */
export const PARALLEL_HOST_SEED_TIMEOUT_MS = 2 * HOST_SEED_TIMEOUT_MS;

/** Returns the single host seeded in `beforeAll`, or fails the test if seeding did not finish. */
export const requireHost = (seeded: SeededEndpointHosts | undefined) => {
  const host = seeded?.hosts[0];
  if (!host) {
    throw new Error('Endpoint host was not seeded');
  }
  return host;
};

/**
 * `afterAll` cleanup for the get-file specs: deletes the uploaded file documents, the
 * submitted action requests and responses, then the seeded host. Every step runs even
 * when an earlier one fails; the failures are rethrown together at the end.
 */
export const cleanupGetFileSpec = async ({
  esClient,
  config,
  submittedActions,
  seeded,
}: {
  esClient: EsClient;
  config: ScoutTestConfig;
  submittedActions: readonly ActionDetails[];
  seeded: SeededEndpointHosts | undefined;
}): Promise<void> => {
  const failures: unknown[] = [];
  for (const cleanup of [
    () => deleteGetFileUploads({ esClient, config, actions: submittedActions }),
    () =>
      deleteSubmittedHostActions({
        esClient,
        config,
        actionIds: submittedActions.map((action) => action.id),
      }),
    () => seeded?.cleanup(),
  ]) {
    try {
      await cleanup();
    } catch (error) {
      failures.push(error);
    }
  }
  if (failures.length === 1) {
    throw failures[0];
  }
  if (failures.length > 1) {
    throw new AggregateError(failures, 'Failed to clean up the get-file host and its action');
  }
};
