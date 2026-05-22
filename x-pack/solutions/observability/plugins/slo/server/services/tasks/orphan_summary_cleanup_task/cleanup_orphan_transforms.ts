/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type { ElasticsearchClient, Logger, SavedObjectsClient } from '@kbn/core/server';
import pLimit from 'p-limit';
import { findSloDefinitionMap, getKey, type SLO } from './find_slo_definitions';

interface Dependencies {
  esClient: ElasticsearchClient;
  soClient: SavedObjectsClient;
  logger: Logger;
  abortController: AbortController;
}

interface RunParams {
  from?: number;
  pageSize?: number;
  maxPages?: number;
  concurrency?: number;
}

interface AbortedRunResult {
  aborted: true;
  completed: false;
  nextState: {
    from: number;
  };
}

interface CompletedRunResult {
  aborted: false;
  completed: true;
}

type RunResult = AbortedRunResult | CompletedRunResult;

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
): Promise<RunResult> {
  const { esClient, logger, abortController } = dependencies;
  const pageSize = params.pageSize ?? DEFAULT_PAGE_SIZE;
  const maxPages = params.maxPages ?? DEFAULT_MAX_PAGES;
  const concurrency = params.concurrency ?? DEFAULT_CONCURRENCY;
  const limiter = pLimit(concurrency);
  let from = params.from ?? 0;
  let currentPage = 0;

  try {
    while (true) {
      abortController.signal.throwIfAborted();
      currentPage++;

      const response = await esClient.transform.getTransformStats(
        {
          transform_id: SLO_TRANSFORM_PATTERN,
          from,
          size: pageSize,
          allow_no_match: true,
        },
        { signal: abortController.signal }
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

      if (sloTransforms.length > 0) {
        abortController.signal.throwIfAborted();
        const uniqueSloIds = [...new Set(sloTransforms.map(({ slo }) => slo.id))];
        const definitionMap = await findSloDefinitionMap(uniqueSloIds, dependencies);

        const orphans = sloTransforms.filter(({ slo }) => !definitionMap.has(getKey(slo)));

        if (orphans.length > 0) {
          abortController.signal.throwIfAborted();
          logger.debug(`Deleting ${orphans.length} orphaned SLO transforms`);

          await Promise.all(
            orphans.map(({ transformId }) =>
              limiter(async () => {
                try {
                  await esClient.transform.deleteTransform(
                    { transform_id: transformId, force: true },
                    { ignore: [404], signal: abortController.signal }
                  );
                } catch (err) {
                  if (isAbortError(err, abortController)) throw err;
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
          abortController.signal.throwIfAborted();
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
                    { ignore: [404], signal: abortController.signal }
                  );
                } catch (err) {
                  if (isAbortError(err, abortController)) throw err;
                  logger.warn(
                    `Failed to stop transform [${transformId}] for disabled SLO: ${err.message}`
                  );
                }
              })
            )
          );
        }
      }

      from += transforms.length;
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
    if (isAbortError(error, abortController)) {
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

function isAbortError(error: unknown, abortController: AbortController): boolean {
  if (error instanceof errors.RequestAbortedError) return true;
  if (abortController.signal.aborted) return true;
  if (error instanceof DOMException && error.name === 'AbortError') return true;
  return false;
}
