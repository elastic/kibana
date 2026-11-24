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

export interface UnsupportedSource {
  sourceId: string;
  sourceSlug: string;
  reason: string;
}

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
  const toSchedule: SourceCandidate[] = [];
  const unsupported: UnsupportedSource[] = [];
  let next = 0;

  // Probes only as many candidates as there are slots left: the sources past the last slot
  // wait for a later cycle either way.
  while (toSchedule.length < availableSlots && next < candidates.length) {
    const batch = candidates.slice(next, next + availableSlots - toSchedule.length);
    next += batch.length;
    const reasons = await Promise.all(
      batch.map(({ sourceId }) =>
        getUnsupportedReason({ index: viewNames.get(sourceId), esClient, logger })
      )
    );
    batch.forEach((candidate, position) => {
      const reason = reasons[position];
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

const getUnsupportedReason = async ({
  index,
  esClient,
  logger,
}: {
  index: string | undefined;
  esClient: ElasticsearchClient;
  logger: Logger;
}): Promise<string | undefined> => {
  if (index === undefined) {
    return undefined;
  }
  const signal = timeoutSignal(PROBE_TIMEOUT_MS);
  try {
    const probe = await probeSampleColumns({
      esClient,
      index,
      logger,
      signal,
      samplingTimeoutMs: PROBE_TIMEOUT_MS,
    });
    return probe.kind === 'unsupported' ? probe.problem : undefined;
  } catch (error) {
    if (error instanceof StatusError) {
      return error.message;
    }
    // A probe that cannot answer rejects nothing: the run decides.
    logger.debug(() => `Column probe of [${index}] failed: ${parseError(error).message}`);
    return undefined;
  } finally {
    signal.dispose();
  }
};
