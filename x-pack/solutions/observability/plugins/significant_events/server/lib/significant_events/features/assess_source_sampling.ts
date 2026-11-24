/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { timeoutSignal } from '@kbn/std';
import { StatusError } from '../../errors/status_error';
import { parseError } from '../../streams/parse_error';
import { hasAnyDocument, probeSampleColumns } from './probe_sample_columns';

// A probe that runs out of time rejects nothing, so this only bounds how long a caller waits.
const PROBE_TIMEOUT_MS = 15_000;

/** Epoch millis of the window feature identification samples. */
export interface SamplingTimeRange {
  start: number;
  end: number;
}

export type SourceSamplingAssessment =
  | { kind: 'supported' }
  /** The probe could not answer: the run decides. */
  | { kind: 'unknown'; error: string }
  | { kind: 'empty' }
  | { kind: 'unsupported'; reason: string };

/** Decides whether feature identification can sample a source and would find a document in `timeRange`. */
export const assessSourceSampling = async ({
  index,
  timeRange,
  esClient,
  logger,
}: {
  index: string;
  timeRange: SamplingTimeRange;
  esClient: ElasticsearchClient;
  logger: Logger;
}): Promise<SourceSamplingAssessment> => {
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
      return { kind: 'unsupported', reason: probe.problem };
    }
    if (probe.kind === 'empty') {
      return { kind: 'empty' };
    }
    if (probe.columns === undefined) {
      return { kind: 'unknown', error: 'Column probe could not determine the schema' };
    }
    // An empty run still marks the source up to date, so data arriving later waits an interval.
    const hasDocuments = await hasAnyDocument({ esClient, index, signal, timeRange });
    return { kind: hasDocuments ? 'supported' : 'empty' };
  } catch (error) {
    if (error instanceof StatusError) {
      return { kind: 'unsupported', reason: error.message };
    }
    const message = parseError(error).message;
    logger.debug(() => `Probe of [${index}] failed: ${message}`);
    return { kind: 'unknown', error: message };
  } finally {
    signal.dispose();
  }
};
