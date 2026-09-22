/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pLimit from 'p-limit';
import { getWildcardPipelineId } from '../../../../common/constants';
import { findSloDefinitionMap, getKey, type SLO, type SLOKey } from './find_slo_definitions';
import { isAbortError, type Dependencies, type RunResult } from './types';

interface RunParams {
  after?: string;
  pageSize?: number;
  maxPages?: number;
  concurrency?: number;
}

type PipelineCleanupRunResult = RunResult<{ after: string | undefined }>;

const DEFAULT_PAGE_SIZE = 100;
const DEFAULT_MAX_PAGES = 10;
const DEFAULT_CONCURRENCY = 5;

const SLO_PIPELINE_PATTERN = '.slo-observability.*.pipeline-*';
// Matches:
//   .slo-observability.sli.pipeline-{sloId}-{rev}
//   .slo-observability.summary.pipeline-{sloId}-{rev}
// The middle segment is restricted to `sli|summary` so unrelated pipelines that
// happen to match the wildcard fetch pattern are skipped rather than parsed
// into a bogus (id, revision).
const SLO_PIPELINE_ID_REGEX =
  /^\.slo-observability\.(?:sli|summary)\.pipeline-(?<id>.+)-(?<revision>\d+)$/;

export function parseSloPipelineId(pipelineId: string): SLO | null {
  const groups = SLO_PIPELINE_ID_REGEX.exec(pipelineId)?.groups;
  if (!groups) {
    return null;
  }

  const revision = Number(groups.revision);
  if (revision < 1) {
    return null;
  }

  return { id: groups.id, revision };
}

export async function cleanupOrphanPipelines(
  params: RunParams,
  dependencies: Dependencies
): Promise<PipelineCleanupRunResult> {
  const { esClient, logger, signal } = dependencies;
  const pageSize = params.pageSize ?? DEFAULT_PAGE_SIZE;
  const maxPages = params.maxPages ?? DEFAULT_MAX_PAGES;
  const concurrency = params.concurrency ?? DEFAULT_CONCURRENCY;
  const limiter = pLimit(concurrency);
  let cursor: string | undefined = params.after;
  let currentPage = 0;

  try {
    signal.throwIfAborted();

    // `ingest.getPipeline` does not paginate; the response is a flat object
    // keyed by pipeline id. We list once, sort deterministically, and then
    // walk through the list in `pageSize` chunks so the task can stop at
    // `maxPages` and resume from the same cursor on the next run.
    const response = await esClient.ingest.getPipeline(
      { id: SLO_PIPELINE_PATTERN, summary: true },
      { ignore: [404], signal }
    );

    const pipelineIds = Object.keys(response).sort();
    if (pipelineIds.length === 0) {
      logger.debug('No SLO ingest pipelines found, nothing to clean up');
      return { aborted: false, completed: true };
    }

    let startIndex = 0;
    if (cursor) {
      startIndex = lowerBound(pipelineIds, cursor);
    }

    while (startIndex < pipelineIds.length) {
      signal.throwIfAborted();
      currentPage++;

      const endIndex = Math.min(startIndex + pageSize, pipelineIds.length);
      const batch = pipelineIds.slice(startIndex, endIndex);

      const sloPipelines: Array<{ pipelineId: string; slo: SLO }> = [];
      for (const pipelineId of batch) {
        const parsed = parseSloPipelineId(pipelineId);
        if (parsed) {
          sloPipelines.push({ pipelineId, slo: parsed });
        }
      }

      if (sloPipelines.length > 0) {
        signal.throwIfAborted();
        const uniqueSloIds = [...new Set(sloPipelines.map(({ slo }) => slo.id))];
        const definitionMap = await findSloDefinitionMap(uniqueSloIds, dependencies);

        // Group orphans by (id, revision) so we issue one wildcard DELETE per
        // SLO revision rather than two (sli + summary). The wildcard delete is
        // also tolerant of "single-sided" orphans where only one of the two
        // pipelines is present.
        const orphanRevisions = new Map<SLOKey, SLO>();
        for (const { slo } of sloPipelines) {
          if (!definitionMap.has(getKey(slo))) {
            orphanRevisions.set(getKey(slo), slo);
          }
        }

        if (orphanRevisions.size > 0) {
          signal.throwIfAborted();
          logger.debug(
            `Deleting orphan SLO ingest pipelines for ${orphanRevisions.size} (sloId, revision) pairs`
          );

          await Promise.all(
            Array.from(orphanRevisions.values()).map((slo) =>
              limiter(async () => {
                const wildcardId = getWildcardPipelineId(slo.id, slo.revision);
                try {
                  await esClient.ingest.deletePipeline(
                    { id: wildcardId },
                    { ignore: [404], signal }
                  );
                } catch (err) {
                  if (isAbortError(err, signal)) throw err;
                  logger.warn(
                    `Failed to delete orphan SLO pipeline [${wildcardId}]: ${err.message}`
                  );
                }
              })
            )
          );
        }
      }

      cursor = batch[batch.length - 1];
      startIndex = endIndex;

      if (startIndex >= pipelineIds.length) {
        break;
      }

      if (currentPage >= maxPages) {
        logger.debug(
          `Reached maximum number of pages (${maxPages}) for pipelines cleanup, will resume on next run`
        );
        return { aborted: true, completed: false, nextState: { after: cursor } };
      }
    }
  } catch (error) {
    if (isAbortError(error, signal)) {
      logger.debug('Orphan pipelines cleanup aborted');
      return { aborted: true, completed: false, nextState: { after: cursor } };
    }
    throw error;
  }

  logger.debug('Orphan pipelines cleanup completed');
  return { aborted: false, completed: true };
}

/**
 * Returns the smallest index `i` such that `items[i] > cursor`. Used to
 * resume processing after a previously persisted cursor without re-processing
 * the pipeline at that exact id. `items` must be sorted ascending.
 */
function lowerBound(items: string[], cursor: string): number {
  let lo = 0;
  let hi = items.length;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (items[mid] <= cursor) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  return lo;
}
