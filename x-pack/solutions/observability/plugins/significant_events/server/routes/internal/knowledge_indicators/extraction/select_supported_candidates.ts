/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { timeoutSignal } from '@kbn/std';
import { probeSampleColumns } from '../../../../lib/significant_events/features/probe_sample_columns';
import { parseError } from '../../../../lib/streams/parse_error';
import type { SourceCandidate } from './classify_sources';

const MAX_CONCURRENT_PROBES = 5;
// A probe that runs out of time rejects nothing, so this only bounds how long the route waits.
const PROBE_TIMEOUT_MS = 15_000;

export interface UnsupportedSource {
  sourceId: string;
  sourceSlug: string;
  reason: string;
}

/** Answers why feature identification would refuse to sample the source, with its own guard. */
export const getSamplingProblem = async ({
  index,
  esClient,
  logger,
}: {
  index: string;
  esClient: ElasticsearchClient;
  logger: Logger;
}): Promise<string | undefined> => {
  const signal = timeoutSignal(PROBE_TIMEOUT_MS);
  try {
    const probe = await probeSampleColumns({ esClient, index, logger, signal });
    return probe.kind === 'unsupported' ? probe.problem : undefined;
  } catch (error) {
    // The probe could not answer: the run decides.
    logger.debug(() => `Probe of [${index}] failed: ${parseError(error).message}`);
    return undefined;
  } finally {
    signal.dispose();
  }
};

/**
 * Fills the available slots with the first candidates feature identification can sample, so a
 * run bound to fail takes neither a slot nor a daily extraction unit.
 */
export const selectSupportedCandidates = async ({
  candidates,
  availableSlots,
  viewNames,
  esClient,
  logger,
}: {
  candidates: SourceCandidate[];
  availableSlots: number;
  viewNames: ReadonlyMap<string, string>;
  esClient: ElasticsearchClient;
  logger: Logger;
}): Promise<{
  toSchedule: SourceCandidate[];
  skipped: SourceCandidate[];
  unsupported: UnsupportedSource[];
}> => {
  if (!Number.isInteger(availableSlots) || availableSlots < 0) {
    throw new Error(`availableSlots must be a non-negative integer, received [${availableSlots}]`);
  }

  const toSchedule: SourceCandidate[] = [];
  const unsupported: UnsupportedSource[] = [];
  let next = 0;

  // Probes only as many candidates as there are slots left: the sources past the last slot
  // wait for a later cycle either way. Fixed-size waves prevent a caller-controlled slot count
  // from becoming unbounded Elasticsearch concurrency.
  while (toSchedule.length < availableSlots && next < candidates.length) {
    const batchSize = Math.min(
      MAX_CONCURRENT_PROBES,
      availableSlots - toSchedule.length,
      candidates.length - next
    );
    const batch = candidates.slice(next, next + batchSize);
    next += batch.length;
    const problems = await Promise.all(
      batch.map(async ({ sourceId }) => {
        const index = viewNames.get(sourceId);
        if (index === undefined) {
          throw new Error(`Missing view name for source [${sourceId}]`);
        }
        return getSamplingProblem({ index, esClient, logger });
      })
    );

    batch.forEach((candidate, position) => {
      const reason = problems[position];
      if (reason === undefined) {
        toSchedule.push(candidate);
        return;
      }
      const { sourceId, sourceSlug } = candidate;
      logger.debug(() => `Not scheduling onboarding of source ${sourceId}: ${reason}`);
      unsupported.push({ sourceId, sourceSlug, reason });
    });
  }

  return { toSchedule, skipped: candidates.slice(next), unsupported };
};
