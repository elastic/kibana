/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type {
  QueryDslQueryContainer,
  TransformGetTransformStatsTransformStats,
} from '@elastic/elasticsearch/lib/api/types';

import { isEndpointPackageV2 } from './package_v2';
import { usageTracker } from '../data_loaders/usage_tracker';
import {
  metadataCurrentIndexPattern,
  metadataTransformPrefix,
  METADATA_CURRENT_TRANSFORM_V2,
  METADATA_TRANSFORMS_PATTERN,
  METADATA_TRANSFORMS_PATTERN_V2,
  METADATA_UNITED_INDEX,
  METADATA_UNITED_TRANSFORM,
  METADATA_UNITED_TRANSFORM_V2,
} from '../constants';

export const waitForMetadataTransformsReady = usageTracker.track(
  'waitForMetadataTransformsReady',
  async (
    esClient: Client,
    /** The version of the Endpoint Package */
    version: string
  ): Promise<void> => {
    await waitFor(() => areMetadataTransformsReady(esClient, version));
  }
);

export const stopMetadataTransforms = usageTracker.track(
  'stopMetadataTransforms',
  async (
    esClient: Client,
    /** The version of the Endpoint Package */
    version: string
  ): Promise<void> => {
    const transformIds = await getMetadataTransformIds(esClient, version);

    await Promise.all(
      transformIds.map((transformId) =>
        esClient.transform.stopTransform({
          transform_id: transformId,
          force: true,
          wait_for_completion: true,
          allow_no_match: true,
        })
      )
    );
  }
);

export const startMetadataTransforms = usageTracker.track(
  'startMetadataTransforms',
  async (
    esClient: Client,
    // agentIds to wait for
    agentIds: string[],
    /** The version of the Endpoint Package */
    version: string
  ): Promise<void> => {
    const isV2 = isEndpointPackageV2(version);
    const currentTransformPrefix = isV2 ? METADATA_CURRENT_TRANSFORM_V2 : metadataTransformPrefix;
    const unitedTransformPrefix = isV2 ? METADATA_UNITED_TRANSFORM_V2 : METADATA_UNITED_TRANSFORM;

    const { currentTransformId, unitedTransformId } = await waitForTransformsToBeCreated(
      esClient,
      version,
      currentTransformPrefix,
      unitedTransformPrefix
    );

    if (!currentTransformId || !unitedTransformId) {
      // eslint-disable-next-line no-console
      console.warn('metadata transforms not found after waiting, skipping transform start');
      return;
    }

    await startTransformWithRetry(esClient, currentTransformId);

    if (agentIds.length > 0) {
      await waitForMetadataDocs({
        esClient,
        index: metadataCurrentIndexPattern,
        agentIdField: 'agent.id',
        agentIds,
        transformId: currentTransformId,
        label: 'current endpoint metadata',
      });
    }

    await startTransformWithRetry(esClient, unitedTransformId);

    // Host APIs read the united index. The current index can be ready while this
    // transform is still catching up, or while a parallel test has stopped it.
    // METADATA_UNITED_INDEX is the v1 destination. isEndpointPackageV2() is still
    // a stub; when it starts returning true, this index must follow the same
    // versioning as unitedTransformId above.
    if (agentIds.length > 0) {
      await waitForMetadataDocs({
        esClient,
        index: METADATA_UNITED_INDEX,
        agentIdField: 'united.endpoint.agent.id',
        agentIds,
        transformId: unitedTransformId,
        label: 'united endpoint metadata',
        extraFilters: [{ term: { 'united.agent.active': { value: true } } }],
      });
    }
  }
);

async function waitForTransformsToBeCreated(
  esClient: Client,
  version: string,
  currentTransformPrefix: string,
  unitedTransformPrefix: string,
  maxAttempts = 10,
  interval = 3000
): Promise<{ currentTransformId: string | undefined; unitedTransformId: string | undefined }> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const transformIds = await getMetadataTransformIds(esClient, version);
    const currentTransformId = transformIds.find((id) => id.startsWith(currentTransformPrefix));
    const unitedTransformId = transformIds.find((id) => id.startsWith(unitedTransformPrefix));

    if (currentTransformId && unitedTransformId) {
      return { currentTransformId, unitedTransformId };
    }

    if (attempt < maxAttempts) {
      await new Promise((res) => setTimeout(res, interval));
    }
  }

  return { currentTransformId: undefined, unitedTransformId: undefined };
}

const isTransformAlreadyStartedError = (err: unknown): boolean => {
  if (typeof err !== 'object' || err === null) {
    return false;
  }

  const error = err as {
    statusCode?: number;
    body?: { error?: { type?: string } };
    meta?: { body?: { error?: { type?: string } } };
  };
  const errorType = error.body?.error?.type ?? error.meta?.body?.error?.type;

  return error.statusCode === 409 || errorType === 'resource_already_exists_exception';
};

async function startTransformWithRetry(
  esClient: Client,
  transformId: string,
  maxAttempts = 3
): Promise<void> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await esClient.transform.startTransform({ transform_id: transformId });
      return;
    } catch (err) {
      // 409: transform already started.
      // resource_already_exists_exception: a parallel caller created this transform's
      // task in the same moment. The task id is the transform id, so it is starting.
      if (isTransformAlreadyStartedError(err)) {
        return;
      }

      const isRetryable = err.statusCode === 404 || err.name === 'TimeoutError';
      if (!isRetryable) {
        throw err;
      }

      lastError = err;
      if (attempt < maxAttempts) {
        await new Promise((res) => setTimeout(res, 5000));
      }
    }
  }

  // Retries exhausted for 404/timeout — swallow since the transform may have been
  // started by a prior timed-out attempt or will be started by Fleet reconciliation
  if (lastError) {
    // eslint-disable-next-line no-console
    console.warn(
      `startTransformWithRetry: failed to start transform [${transformId}] after ${maxAttempts} attempts: ${lastError.message}`
    );
  }
}

async function getMetadataTransformStats(
  esClient: Client,
  /** The version of the Endpoint Package */
  version: string
): Promise<TransformGetTransformStatsTransformStats[]> {
  const transformId = isEndpointPackageV2(version)
    ? METADATA_TRANSFORMS_PATTERN_V2
    : METADATA_TRANSFORMS_PATTERN;
  return (
    await esClient.transform.getTransformStats({
      transform_id: transformId,
      allow_no_match: true,
    })
  ).transforms;
}

async function getMetadataTransformIds(
  esClient: Client,
  /** The version of the Endpoint Package */
  version: string
): Promise<string[]> {
  return (await getMetadataTransformStats(esClient, version)).map((transform) => transform.id);
}

async function areMetadataTransformsReady(esClient: Client, version: string): Promise<boolean> {
  const transforms = await getMetadataTransformStats(esClient, version);
  return (
    transforms.length > 0 &&
    !transforms.some(
      // TODO TransformGetTransformStatsTransformStats type needs to be updated to include health
      (transform: TransformGetTransformStatsTransformStats & { health?: { status: string } }) =>
        transform?.health?.status !== 'green'
    )
  );
}

async function waitForMetadataDocs({
  esClient,
  index,
  agentIdField,
  agentIds,
  transformId,
  label,
  extraFilters = [],
}: {
  esClient: Client;
  index: string;
  agentIdField: string;
  agentIds: string[];
  transformId: string;
  label: string;
  extraFilters?: QueryDslQueryContainer[];
}): Promise<void> {
  const size = agentIds.length;
  let lastDistinctAgents = 0;
  const areDocsReady = async (): Promise<boolean> => {
    // Count distinct agents, not documents. A restarted transform can write a
    // second doc for the same agent, and an exact document count then never matches.
    const response = await esClient.search({
      index,
      query: {
        bool: {
          filter: [{ terms: { [agentIdField]: agentIds } }, ...extraFilters],
        },
      },
      size: 0,
      aggs: {
        agents: {
          cardinality: { field: agentIdField },
        },
      },
      ignore_unavailable: true,
      allow_no_indices: true,
    });
    lastDistinctAgents =
      (response.aggregations as { agents?: { value?: number } } | undefined)?.agents?.value ?? 0;

    if (lastDistinctAgents >= size) {
      return true;
    }

    // Parallel suites share these transforms and stop them while indexing.
    await startTransformWithRetry(esClient, transformId);
    return false;
  };

  // Poll every 5s for 4 minutes. Another worker can stop the shared transform
  // near the end of a shorter window, and the sync delay then needs another cycle.
  const isReady = await waitFor(areDocsReady, 5_000, 49);
  if (!isReady) {
    throw new Error(
      `Timed out waiting for ${size} ${label} docs for agent ids [${agentIds.join(
        ', '
      )}] (last distinct agent count: ${lastDistinctAgents})`
    );
  }
}

async function waitFor(
  cb: () => Promise<boolean>,
  interval: number = 20000,
  maxAttempts = 6
): Promise<boolean> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (await cb()) {
      return true;
    }

    if (attempt < maxAttempts - 1) {
      await new Promise((res) => setTimeout(res, interval));
    }
  }

  return false;
}
