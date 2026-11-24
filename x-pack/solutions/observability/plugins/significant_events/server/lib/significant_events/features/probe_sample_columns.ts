/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { errors } from '@elastic/elasticsearch';
import { esql } from '@elastic/esql';
import { esqlTimeRange, getEsqlColumnSchema, type EsqlColumnSchema } from '@kbn/ai-tools';
import { SOURCE_TIMESTAMP_FIELD, getTimestampColumnProblem } from '@kbn/nightshift-shared';
import { parseError } from '../../streams/parse_error';
import { isIndexNotFoundError } from '../latest_source_query';
import { StatusError } from '../../errors/status_error';

type SamplingQuery = 'Column probe' | 'Random sampling query';

const missingIndexError = (index: string): StatusError =>
  new StatusError(
    `There are no documents to sample: an index behind [${index}] does not exist yet.`,
    400
  );

const describeSamplingFailure = (
  error: unknown,
  { samplingTimeoutMs, query }: { samplingTimeoutMs: number; query: SamplingQuery }
): string =>
  `${query} failed (samplingTimeoutMs=${samplingTimeoutMs}ms): ${parseError(error).message}`;

const getVerificationProblem = (error: unknown): string | undefined => {
  if (
    !(error instanceof errors.ResponseError) ||
    error.body?.error?.type !== 'verification_exception'
  ) {
    return undefined;
  }
  const reason: unknown = error.body.error.reason;
  return `Elasticsearch rejects the source query: ${
    typeof reason === 'string' ? reason : error.message
  }`;
};

/** Reports a failure of the column probe or the random arm, which hard-fail sampling, with its sampling context. */
export const withSamplingErrorContext = async <T>(
  promise: Promise<T>,
  {
    index,
    samplingTimeoutMs,
    query,
  }: { index: string; samplingTimeoutMs: number; query: SamplingQuery }
): Promise<T> => {
  try {
    return await promise;
  } catch (err) {
    // Missing data is the caller's input, not a sampling failure.
    if (isIndexNotFoundError(err)) {
      throw missingIndexError(index);
    }
    throw new Error(describeSamplingFailure(err, { samplingTimeoutMs, query }));
  }
};

export type SampleColumnsProbe =
  /** `columns` is absent when the probe could not answer: sampling runs without it. */
  | { kind: 'supported'; columns: EsqlColumnSchema[] | undefined }
  | { kind: 'empty' }
  | { kind: 'unsupported'; problem: string };

/** Decides from a source's columns whether it can be sampled; throws a 400 when an index behind it does not exist. */
export const probeSampleColumns = async ({
  esClient,
  index,
  fields = [],
  logger,
  signal,
  samplingTimeoutMs,
}: {
  esClient: ElasticsearchClient;
  index: string;
  /** Columns to report besides `@timestamp`. */
  fields?: string[];
  logger: Logger;
  signal: AbortSignal;
  samplingTimeoutMs: number;
}): Promise<SampleColumnsProbe> => {
  // Only the columns the caller reads: the full schema of a wide source can time out. No time
  // range here: a request-level range narrows the lookup to indices with data in the window,
  // while the sampling query's WHERE does not, so the two could disagree on a column's type.
  let columns: EsqlColumnSchema[] | undefined;
  try {
    columns = await getEsqlColumnSchema({
      esClient,
      index,
      fields: [SOURCE_TIMESTAMP_FIELD, ...new Set(fields)],
      signal,
    });
  } catch (error) {
    if (isIndexNotFoundError(error)) {
      throw missingIndexError(index);
    }
    // Every arm fails the same way, so the source is at fault. NULLIFY cannot cause it: it only
    // covers the columns this probe keeps.
    const problem = getVerificationProblem(error);
    if (problem) {
      return { kind: 'unsupported', problem };
    }
    // A probe that cannot answer must not take sampling down with it: the arms run as they did
    // before the probe existed, the entity arm without its filters.
    logger.warn(
      `Column probe failed, sampling without it: ${describeSamplingFailure(error, {
        samplingTimeoutMs,
        query: 'Column probe',
      })}`
    );
  }

  // Every arm filters on @timestamp. A narrowed probe drops unmapped columns, so a missing one
  // looks the same for a source with data but no @timestamp (saved before the source API
  // required it) and for a wildcard with no index yet. Only the first is the source's fault.
  if (!columns || !getTimestampColumnProblem(columns)) {
    return { kind: 'supported', columns };
  }

  const isTimestampUnmapped = !columns.some(({ name }) => name === SOURCE_TIMESTAMP_FIELD);
  // The full schema is the one thing that tells them apart: nothing resolves behind a
  // wildcard with no index, while an index without @timestamp still reports its columns,
  // whatever the source's WHERE matches. It is wide, but only runs on a source that is
  // already wrong.
  const fullColumns = isTimestampUnmapped
    ? await withSamplingErrorContext(getEsqlColumnSchema({ esClient, index, signal }), {
        index,
        samplingTimeoutMs,
        query: 'Column probe',
      })
    : columns;
  if (
    isTimestampUnmapped &&
    fullColumns.length === 0 &&
    !(await withSamplingErrorContext(hasAnyDocument({ esClient, index, signal }), {
      index,
      samplingTimeoutMs,
      query: 'Column probe',
    }))
  ) {
    // A source with no index yet, which create accepts. An empty schema alone is not enough,
    // since an index that holds documents but maps no field reports it too: that one is an
    // invalid source.
    return { kind: 'empty' };
  }
  // The later answer wins: an index created between the two probes shows up in the full
  // schema with a valid @timestamp, and then there is nothing to reject. Its schema also
  // carries the entity fields the first, empty answer lacked.
  const problem = getTimestampColumnProblem(fullColumns);
  return problem ? { kind: 'unsupported', problem } : { kind: 'supported', columns: fullColumns };
};

/** Tells whether the source holds a document, within `timeRange` when given. */
export const hasAnyDocument = async ({
  esClient,
  index,
  signal,
  timeRange,
}: {
  esClient: ElasticsearchClient;
  index: string;
  signal: AbortSignal;
  /** Epoch millis. The source must have a date `@timestamp`. */
  timeRange?: { start: number; end: number };
}): Promise<boolean> => {
  const source = esql.from([index]);
  const query = timeRange ? source.where`${esqlTimeRange(timeRange.start, timeRange.end)}` : source;
  const response = (await esClient.esql.query(
    { query: query.limit(1).pipe`STATS total = COUNT(*)`.print('basic') },
    { signal }
  )) as unknown as { values: unknown[][]; is_partial?: boolean };
  const total = response.values[0]?.[0];
  const hasDocument = typeof total === 'number' && total > 0;
  // A partial result counts only the shards that did not fail, so its zero proves nothing.
  if (!hasDocument && response.is_partial) {
    throw new Error(
      `Cannot tell whether [${index}] holds a document: Elasticsearch returned partial results`
    );
  }
  return hasDocument;
};
