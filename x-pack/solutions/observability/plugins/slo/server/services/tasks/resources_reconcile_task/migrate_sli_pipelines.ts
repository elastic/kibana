/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  IngestPipeline,
  IngestPutPipelineRequest,
} from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { omit } from 'lodash';
import pLimit from 'p-limit';
import {
  getSLIIndexNamePrefix,
  getSLIRoutingPipelineName,
  SLI_ROUTED_VERSIONS,
  SLO_RESOURCES_VERSION,
} from '../../../../common/constants';
import { getSLIRoutingProcessor } from '../../../assets/ingest_templates/sli_routing_pipeline_template';
import { isAbortError } from '../orphan_summary_cleanup_task/types';
import type { TaskState } from './types';

const SLI_PIPELINE_PATTERN = '.slo-observability.sli.pipeline-*';
// Fields returned by GET that ES rejects on PUT.
const SYSTEM_MANAGED_FIELDS = [
  'created_date',
  'created_date_millis',
  'modified_date',
  'modified_date_millis',
] as const;
const FULL_SCAN_SKIP_MS = 24 * 60 * 60 * 1000;
const DEFAULT_PAGE_SIZE = 100;
const DEFAULT_MAX_PAGES = 10;
const DEFAULT_CONCURRENCY = 5;

export type MigrationSelection =
  | { type: 'candidate'; version: number; processorIndex: number }
  | { type: 'prefix_mismatch'; version: number; prefix: string | undefined }
  | { type: 'not_applicable' };

interface Dependencies {
  esClient: ElasticsearchClient;
  logger: Logger;
  signal: AbortSignal;
  now: Date;
}

interface RunParams {
  pageSize?: number;
  maxPages?: number;
  concurrency?: number;
}

/** Tells whether a per-SLO SLI pipeline still routes with its own date_index_name processor and can be migrated. */
export const selectMigrationCandidate = (pipeline: IngestPipeline): MigrationSelection => {
  const version = pipeline._meta?.version;
  if (typeof version !== 'number' || !SLI_ROUTED_VERSIONS.includes(version)) {
    return { type: 'not_applicable' };
  }

  const processors = pipeline.processors ?? [];
  const processorIndex = processors.findIndex(
    (processor) => processor?.date_index_name !== undefined
  );
  if (processorIndex === -1) {
    return { type: 'not_applicable' };
  }

  const prefix = processors[processorIndex]?.date_index_name?.index_name_prefix;
  if (prefix !== getSLIIndexNamePrefix(version)) {
    return { type: 'prefix_mismatch', version, prefix };
  }

  return { type: 'candidate', version, processorIndex };
};

/** Replaces the date_index_name processor of a per-SLO SLI pipeline with a call to the routing pipeline of its version. */
export const patchSliPipeline = (
  id: string,
  pipeline: IngestPipeline,
  { version, processorIndex }: { version: number; processorIndex: number }
): IngestPutPipelineRequest => ({
  ...omit(pipeline, SYSTEM_MANAGED_FIELDS),
  id,
  processors: (pipeline.processors ?? []).map((processor, index) =>
    index === processorIndex ? getSLIRoutingProcessor(version) : processor
  ),
});

/** Migrates per-SLO SLI pipelines to the shared routing pipelines, resuming from the cursor of the previous run. */
export const migrateSliPipelines = async (
  state: TaskState,
  { esClient, logger, signal, now }: Dependencies,
  params: RunParams = {}
): Promise<TaskState> => {
  const pageSize = params.pageSize ?? DEFAULT_PAGE_SIZE;
  const maxPages = params.maxPages ?? DEFAULT_MAX_PAGES;
  const limiter = pLimit(params.concurrency ?? DEFAULT_CONCURRENCY);

  if (
    state.cursor === undefined &&
    state.lastScanCandidates === 0 &&
    state.lastFullScanAt !== undefined &&
    now.getTime() - state.lastFullScanAt < FULL_SCAN_SKIP_MS
  ) {
    logger.debug('No SLI pipeline to migrate during the last full scan, skipping');
    return state;
  }

  let cursor = state.cursor;
  let migrated = 0;
  let remaining = 0;

  try {
    signal.throwIfAborted();
    const response = await esClient.ingest.getPipeline(
      { id: SLI_PIPELINE_PATTERN },
      { ignore: [404], signal }
    );

    const candidateIds: string[] = [];
    const pipelines = response ?? {};
    for (const id of Object.keys(pipelines).sort()) {
      const pipeline = pipelines[id];
      const selection = pipeline ? selectMigrationCandidate(pipeline) : undefined;
      if (selection?.type === 'candidate') {
        candidateIds.push(id);
      } else if (selection?.type === 'prefix_mismatch') {
        logger.warn(
          `Skipping SLI pipeline [${id}] migration: index prefix [${selection.prefix}] does not match its version [${selection.version}]`
        );
      }
    }
    remaining = candidateIds.length;

    const isRoutingPipelineReady = createRoutingPipelineCheck({ esClient, logger, signal });
    let startIndex = cursor ? lowerBound(candidateIds, cursor) : 0;
    let page = 0;

    while (startIndex < candidateIds.length) {
      signal.throwIfAborted();
      if (page >= maxPages) {
        logger.debug(`Migrated ${migrated} SLI pipelines, will resume on next run`);
        return { ...state, cursor };
      }
      page++;

      const batch = candidateIds.slice(startIndex, startIndex + pageSize);
      const results = await Promise.all(
        batch.map((id) =>
          limiter(() => migratePipeline(id, { esClient, logger, signal, isRoutingPipelineReady }))
        )
      );
      const migratedInBatch = results.filter(Boolean).length;
      migrated += migratedInBatch;
      remaining -= migratedInBatch;

      cursor = batch[batch.length - 1];
      startIndex += batch.length;
    }
  } catch (error) {
    if (isAbortError(error, signal)) {
      logger.debug('SLI pipelines migration aborted');
      return { ...state, cursor };
    }
    throw error;
  }

  if (migrated > 0) {
    logger.info(`Migrated ${migrated} SLI pipelines to the shared routing pipelines`);
  }

  return { lastFullScanAt: now.getTime(), lastScanCandidates: remaining };
};

// Returns true when the pipeline was migrated, or no longer needs to be.
const migratePipeline = async (
  id: string,
  {
    esClient,
    logger,
    signal,
    isRoutingPipelineReady,
  }: Omit<Dependencies, 'now'> & { isRoutingPipelineReady: (version: number) => Promise<boolean> }
): Promise<boolean> => {
  try {
    // Re-read right before writing to keep concurrent edits.
    const response = await esClient.ingest.getPipeline({ id }, { ignore: [404], signal });
    const pipeline = response?.[id];
    if (!pipeline) {
      return true;
    }

    const selection = selectMigrationCandidate(pipeline);
    if (selection.type !== 'candidate') {
      return true;
    }

    if (!(await isRoutingPipelineReady(selection.version))) {
      return false;
    }

    await esClient.ingest.putPipeline(patchSliPipeline(id, pipeline, selection), { signal });
    return true;
  } catch (error) {
    if (isAbortError(error, signal)) {
      throw error;
    }
    logger.warn(`Failed to migrate SLI pipeline [${id}]: ${error.message}`);
    return false;
  }
};

// Checks once per run and version that the routing pipeline exists and is current.
const createRoutingPipelineCheck = ({
  esClient,
  logger,
  signal,
}: Omit<Dependencies, 'now'>): ((version: number) => Promise<boolean>) => {
  const checks = new Map<number, Promise<boolean>>();

  const check = async (version: number): Promise<boolean> => {
    const name = getSLIRoutingPipelineName(version);
    try {
      const response = await esClient.ingest.getPipeline({ id: name }, { ignore: [404], signal });
      const meta = response?.[name]?._meta;
      const ready = meta?.version === version && meta?.template_version === SLO_RESOURCES_VERSION;
      if (!ready) {
        logger.warn(
          `Skipping migration of v${version} SLI pipelines: routing pipeline [${name}] is missing or outdated`
        );
      }
      return ready;
    } catch (error) {
      if (isAbortError(error, signal)) {
        throw error;
      }
      logger.warn(`Skipping migration of v${version} SLI pipelines: ${error.message}`);
      return false;
    }
  };

  return (version: number) => {
    if (!checks.has(version)) {
      checks.set(version, check(version));
    }
    return checks.get(version) ?? Promise.resolve(false);
  };
};

// Returns the smallest index `i` such that `items[i] > cursor`; `items` must be sorted ascending.
const lowerBound = (items: string[], cursor: string): number => {
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
};
