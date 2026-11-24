/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { timeoutSignal } from '@kbn/std';
import { StatusError } from '../../../../lib/errors/status_error';
import { parseError } from '../../../../lib/streams/parse_error';
import { probeSampleColumns } from '../../../../lib/significant_events/features/probe_sample_columns';
import type { SourceCandidate } from './classify_sources';

const PROBE_TIMEOUT_MS = 15_000;
const MAX_CONCURRENT_PROBES = 5;

export interface UnsupportedSource {
  sourceId: string;
  sourceSlug: string;
  reason: string;
}

type CandidateAssessment =
  | { kind: 'supported'; candidate: SourceCandidate }
  | { kind: 'unknown'; candidate: SourceCandidate; error: string }
  | { kind: 'unsupported'; candidate: SourceCandidate; reason: string };

/**
 * Fills the available slots with the first candidates feature identification can sample, so a
 * source whose run is bound to fail takes neither a slot nor a daily extraction unit.
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
    const assessments = await Promise.all(
      batch.map((candidate) => {
        const index = viewNames.get(candidate.sourceId);
        if (index === undefined) {
          throw new Error(`Missing view name for source [${candidate.sourceId}]`);
        }
        return assessCandidate({ candidate, index, esClient, logger });
      })
    );

    for (const assessment of assessments) {
      if (assessment.kind !== 'unsupported') {
        toSchedule.push(assessment.candidate);
        continue;
      }
      const { candidate, reason } = assessment;
      const { sourceId, sourceSlug } = candidate;
      logger.debug(() => `Not scheduling onboarding of source ${sourceId}: ${reason}`);
      unsupported.push({ sourceId, sourceSlug, reason });
    }
  }

  return { toSchedule, skipped: candidates.slice(next), unsupported };
};

const assessCandidate = async ({
  candidate,
  index,
  esClient,
  logger,
}: {
  candidate: SourceCandidate;
  index: string;
  esClient: ElasticsearchClient;
  logger: Logger;
}): Promise<CandidateAssessment> => {
  const signal = timeoutSignal(PROBE_TIMEOUT_MS);
  try {
    const probe = await probeSampleColumns({
      esClient,
      index,
      logger,
      signal,
      samplingTimeoutMs: PROBE_TIMEOUT_MS,
    });
    if (probe.kind === 'unsupported') {
      return { kind: 'unsupported', candidate, reason: probe.problem };
    }
    if (probe.kind === 'supported' && probe.columns === undefined) {
      return { kind: 'unknown', candidate, error: 'Column probe could not determine the schema' };
    }
    return { kind: 'supported', candidate };
  } catch (error) {
    if (error instanceof StatusError) {
      return { kind: 'unsupported', candidate, reason: error.message };
    }
    // A probe that cannot answer rejects nothing: the run decides.
    const message = parseError(error).message;
    logger.debug(() => `Column probe of [${index}] failed: ${message}`);
    return { kind: 'unknown', candidate, error: message };
  } finally {
    signal.dispose();
  }
};
