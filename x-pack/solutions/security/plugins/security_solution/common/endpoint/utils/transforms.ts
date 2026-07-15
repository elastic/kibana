/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { TransformGetTransformStatsTransformStats } from '@elastic/elasticsearch/lib/api/types';

import { isEndpointPackageV2 } from './package_v2';
import { usageTracker } from '../data_loaders/usage_tracker';
import {
  metadataCurrentIndexPattern,
  metadataTransformPrefix,
  METADATA_CURRENT_TRANSFORM_V2,
  METADATA_TRANSFORMS_PATTERN,
  METADATA_TRANSFORMS_PATTERN_V2,
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
      await waitForCurrentMetdataDocs(esClient, agentIds);
    }

    await startTransformWithRetry(esClient, unitedTransformId);
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
      // 409: transform already started — not an error
      if (err.statusCode === 409) {
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
  return !transforms.some(
    // TODO TransformGetTransformStatsTransformStats type needs to be updated to include health
    (transform: TransformGetTransformStatsTransformStats & { health?: { status: string } }) =>
      transform?.health?.status !== 'green'
  );
}

async function waitForCurrentMetdataDocs(esClient: Client, agentIds: string[]) {
  const query = agentIds.length
    ? {
        bool: {
          filter: [
            {
              terms: {
                'agent.id': agentIds,
              },
            },
          ],
        },
      }
    : {
        match_all: {},
      };
  const size = agentIds.length ?? 1;
  await waitFor(
    async () =>
      (
        await esClient.search({
          index: metadataCurrentIndexPattern,
          query,
          size,
          rest_total_hits_as_int: true,
        })
      ).hits.total === size
  );
}

async function waitFor(
  cb: () => Promise<boolean>,
  interval: number = 20000,
  maxAttempts = 6
): Promise<void> {
  let attempts = 0;
  let isReady = false;

  while (!isReady) {
    await new Promise((res) => setTimeout(() => res(''), interval));
    isReady = await cb();
    attempts++;

    if (attempts > maxAttempts) {
      return;
    }
  }
}
