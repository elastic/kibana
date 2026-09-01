/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pLimit from 'p-limit';
import { findSloDefinitionMap, getKey, type SLO } from './find_slo_definitions';
import { isAbortError, type Dependencies, type RunResult } from './types';

interface RunParams {
  from?: number;
  pageSize?: number;
  maxPages?: number;
  concurrency?: number;
}

type TransformCleanupRunResult = RunResult<{ from: number }>;

const DEFAULT_PAGE_SIZE = 100;
const DEFAULT_MAX_PAGES = 10;
const DEFAULT_CONCURRENCY = 5;

const SLO_TRANSFORM_PATTERN = 'slo-*';
const SLO_TRANSFORM_ID_REGEX = /^slo-(?:summary-)?(?<id>.+)-(?<revision>\d+)$/;

export function parseSloTransformId(transformId: string): SLO | null {
  const groups = SLO_TRANSFORM_ID_REGEX.exec(transformId)?.groups;
  if (!groups) {
    return null;
  }

  const revision = Number(groups.revision);
  if (revision < 1) {
    return null;
  }

  return { id: groups.id, revision };
}

export async function cleanupOrphanTransforms(
  params: RunParams,
  dependencies: Dependencies
): Promise<TransformCleanupRunResult> {
  const { esClient, logger, signal } = dependencies;
  const pageSize = params.pageSize ?? DEFAULT_PAGE_SIZE;
  const maxPages = params.maxPages ?? DEFAULT_MAX_PAGES;
  const concurrency = params.concurrency ?? DEFAULT_CONCURRENCY;
  const limiter = pLimit(concurrency);
  let from = params.from ?? 0;
  let currentPage = 0;

  try {
    while (true) {
      signal.throwIfAborted();
      currentPage++;

      const response = await esClient.transform.getTransformStats(
        {
          transform_id: SLO_TRANSFORM_PATTERN,
          from,
          size: pageSize,
          allow_no_match: true,
          // Only the id and state are read below; trimming the response server-side
          // avoids transferring/parsing the per-transform checkpointing, stats and
          // health blobs (multi-KB each at pageSize=100).
          filter_path: 'count,transforms.id,transforms.state',
        },
        { signal }
      );

      const transforms = response.transforms ?? [];
      if (transforms.length === 0) {
        break;
      }

      const sloTransforms: Array<{ transformId: string; slo: SLO; state: string }> = [];
      for (const transform of transforms) {
        const parsed = parseSloTransformId(transform.id);
        if (parsed) {
          sloTransforms.push({
            transformId: transform.id,
            slo: parsed,
            state: transform.state ?? '',
          });
        }
      }

      let deletedCount = 0;
      if (sloTransforms.length > 0) {
        signal.throwIfAborted();
        const uniqueSloIds = [...new Set(sloTransforms.map(({ slo }) => slo.id))];
        const definitionMap = await findSloDefinitionMap(uniqueSloIds, dependencies);

        const orphans = sloTransforms.filter(({ slo }) => !definitionMap.has(getKey(slo)));

        if (orphans.length > 0) {
          signal.throwIfAborted();
          logger.debug(`Deleting ${orphans.length} orphaned SLO transforms`);

          await Promise.all(
            orphans.map(({ transformId }) =>
              limiter(async () => {
                try {
                  await esClient.transform.deleteTransform(
                    { transform_id: transformId, force: true },
                    { ignore: [404], signal }
                  );
                  deletedCount++;
                } catch (err) {
                  if (isAbortError(err, signal)) throw err;
                  logger.warn(
                    `Failed to delete orphaned transform [${transformId}]: ${err.message}`
                  );
                }
              })
            )
          );
        }

        const disabledButRunning = sloTransforms.filter(({ slo, state }) => {
          const definition = definitionMap.get(getKey(slo));
          return definition && !definition.enabled && isTransformRunning(state);
        });

        if (disabledButRunning.length > 0) {
          signal.throwIfAborted();
          logger.debug(`Stopping ${disabledButRunning.length} transforms for disabled SLOs`);

          await Promise.all(
            disabledButRunning.map(({ transformId }) =>
              limiter(async () => {
                try {
                  await esClient.transform.stopTransform(
                    {
                      transform_id: transformId,
                      wait_for_completion: true,
                      force: true,
                      allow_no_match: true,
                    },
                    { ignore: [404], signal }
                  );
                } catch (err) {
                  if (isAbortError(err, signal)) throw err;
                  logger.warn(
                    `Failed to stop transform [${transformId}] for disabled SLO: ${err.message}`
                  );
                }
              })
            )
          );
        }
      }

      // Deleted transforms are removed from the live list, so subsequent pages
      // shift up by `deletedCount`. Advance the offset only over the items that
      // are still there to avoid skipping the entries that took their place.
      from += transforms.length - deletedCount;
      const reachedLastPage = transforms.length < pageSize;
      if (reachedLastPage) {
        break;
      }

      if (currentPage >= maxPages) {
        logger.debug(
          `Reached maximum number of pages (${maxPages}) for transforms cleanup, will resume on next run`
        );
        return { aborted: true, completed: false, nextState: { from } };
      }
    }
  } catch (error) {
    if (isAbortError(error, signal)) {
      logger.debug('Orphan transforms cleanup aborted');
      return { aborted: true, completed: false, nextState: { from } };
    }
    throw error;
  }

  logger.debug('Orphan transforms cleanup completed');
  return { aborted: false, completed: true };
}

function isTransformRunning(state: string): boolean {
  return state === 'started' || state === 'indexing';
}
