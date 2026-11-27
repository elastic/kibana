/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { JUDGE_CASE_SETTINGS } from './constants';
import type { ReadEvidenceResult, SkippedEvidence } from './evidence_types';
import { runEvidence } from './run_evidence';

export interface EvidenceReaderParams {
  /** The client that reads customer data: the space's detection service account. */
  esClient: ElasticsearchClient;
  /** Overrides the default cap; a value that is not a non-negative integer is ignored. */
  maxQueries?: number;
  /** Stops the queries when the run is out of time or cancelled. */
  abortSignal?: AbortSignal;
}

export interface EvidenceReaderStats {
  max_queries: number;
  /** Distinct queries sent to Elasticsearch. */
  started: number;
  /** Distinct queries answered `skipped` for the cap. */
  skipped: number;
}

export interface EvidenceReader {
  /** The result of the query, run at most once per run; never rejects. */
  read: (query: string) => Promise<ReadEvidenceResult>;
  stats: () => EvidenceReaderStats;
}

const QUERY_CAP_SKIP: SkippedEvidence = { result: 'skipped', reason: 'query_cap' };

/** The cap to use: 0 is valid and skips every query. */
const resolveMaxQueries = (maxQueries: number | undefined): number =>
  maxQueries !== undefined && Number.isInteger(maxQueries) && maxQueries >= 0
    ? maxQueries
    : JUDGE_CASE_SETTINGS.max_evidence_queries_per_run;

/**
 * Creates the reader of one run. It runs each distinct query text once and keeps every result, a
 * failure and a skip included, so a query is neither retried nor counted twice within the run.
 */
export const createEvidenceReader = ({
  esClient,
  maxQueries,
  abortSignal,
}: EvidenceReaderParams): EvidenceReader => {
  const maxStarted = resolveMaxQueries(maxQueries);
  const results = new Map<string, Promise<ReadEvidenceResult>>();
  let started = 0;
  let skipped = 0;

  const read = (query: string): Promise<ReadEvidenceResult> => {
    const known = results.get(query);
    if (known) {
      return known;
    }
    // The slot is taken before any await, so reads of one tick are numbered in call order.
    if (started >= maxStarted) {
      skipped += 1;
      const skip = Promise.resolve(QUERY_CAP_SKIP);
      results.set(query, skip);
      return skip;
    }
    started += 1;
    const result = runEvidence({ esClient, query, abortSignal });
    results.set(query, result);
    return result;
  };

  return {
    read,
    stats: () => ({ max_queries: maxStarted, started, skipped }),
  };
};
