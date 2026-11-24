/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import {
  assessSourceSampling,
  type SamplingTimeRange,
} from '../../../../lib/significant_events/features/assess_source_sampling';
import type { SourceCandidate } from './classify_sources';

const MAX_CONCURRENT_PROBES = 5;

export interface UnsupportedSource {
  sourceId: string;
  sourceSlug: string;
  reason: string;
}

/**
 * Fills the available slots with the first candidates feature identification can sample and that
 * hold a document in `timeRange`, so a run bound to fail or to find nothing takes neither a slot
 * nor a daily extraction unit.
 */
export const selectSupportedCandidates = async ({
  candidates,
  availableSlots,
  viewNames,
  timeRange,
  esClient,
  logger,
}: {
  candidates: SourceCandidate[];
  availableSlots: number;
  viewNames: ReadonlyMap<string, string>;
  timeRange: SamplingTimeRange;
  esClient: ElasticsearchClient;
  logger: Logger;
}): Promise<{
  toSchedule: SourceCandidate[];
  skipped: SourceCandidate[];
  unsupported: UnsupportedSource[];
  empty: SourceCandidate[];
}> => {
  if (!Number.isInteger(availableSlots) || availableSlots < 0) {
    throw new Error(`availableSlots must be a non-negative integer, received [${availableSlots}]`);
  }

  const toSchedule: SourceCandidate[] = [];
  const unsupported: UnsupportedSource[] = [];
  const empty: SourceCandidate[] = [];
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
      batch.map(async (candidate) => {
        const index = viewNames.get(candidate.sourceId);
        if (index === undefined) {
          throw new Error(`Missing view name for source [${candidate.sourceId}]`);
        }
        const assessment = await assessSourceSampling({ index, timeRange, esClient, logger });
        return { candidate, assessment };
      })
    );

    for (const { candidate, assessment } of assessments) {
      const { sourceId, sourceSlug } = candidate;
      switch (assessment.kind) {
        case 'unsupported': {
          const { reason } = assessment;
          logger.debug(() => `Not scheduling onboarding of source ${sourceId}: ${reason}`);
          unsupported.push({ sourceId, sourceSlug, reason });
          break;
        }
        case 'empty':
          logger.debug(
            () => `Not scheduling onboarding of source ${sourceId}: no document to sample`
          );
          empty.push(candidate);
          break;
        case 'supported':
        case 'unknown':
          toSchedule.push(candidate);
          break;
      }
    }
  }

  return { toSchedule, skipped: candidates.slice(next), unsupported, empty };
};
