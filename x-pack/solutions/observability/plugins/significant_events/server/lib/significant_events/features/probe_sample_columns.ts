/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { esql } from '@elastic/esql';
import { getEsqlColumnSchema, type EsqlColumnSchema } from '@kbn/ai-tools';
import { SOURCE_TIMESTAMP_FIELD, getTimestampColumnProblem } from '@kbn/nightshift-shared';
import { parseError } from '../../streams/parse_error';
import { isIndexNotFoundError } from '../latest_source_query';
import { StatusError } from '../../errors/status_error';

/** Reports a failure of the column probe or the random arm, which hard-fail sampling, with its sampling context. */
export const withSamplingErrorContext = async <T>(
  promise: Promise<T>,
  {
    index,
    samplingTimeoutMs,
    query,
  }: { index: string; samplingTimeoutMs: number; query: 'Column probe' | 'Random sampling query' }
): Promise<T> => {
  try {
    return await promise;
  } catch (err) {
    // Missing data is the caller's input, not a sampling failure.
    if (isIndexNotFoundError(err)) {
      throw new StatusError(
        `There are no documents to sample: an index behind [${index}] does not exist yet.`,
        400
      );
    }
    throw new Error(
      `${query} failed (samplingTimeoutMs=${samplingTimeoutMs}ms): ${parseError(err).message}`
    );
  }
};

export type SampleColumnsProbe =
  /** `columns` is absent when the probe could not answer: sampling runs without it. */
  | { kind: 'sampleable'; columns: EsqlColumnSchema[] | undefined }
  | { kind: 'empty' }
  | { kind: 'invalid'; problem: string };

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
  const columns = await withSamplingErrorContext(
    getEsqlColumnSchema({
      esClient,
      index,
      fields: [SOURCE_TIMESTAMP_FIELD, ...new Set(fields)],
      signal,
    }),
    { index, samplingTimeoutMs, query: 'Column probe' }
  ).catch((error) => {
    if (error instanceof StatusError) {
      throw error;
    }
    // A probe that cannot answer must not take sampling down with it: the arms run as they did
    // before the probe existed, the entity arm without its filters.
    logger.warn(`Column probe failed, sampling without it: ${parseError(error).message}`);
    return undefined;
  });

  // Every arm filters on @timestamp. A narrowed probe drops unmapped columns, so a missing one
  // looks the same for a source with data but no @timestamp (saved before the source API
  // required it) and for a wildcard with no index yet. Only the first is the source's fault.
  if (!columns || !getTimestampColumnProblem(columns)) {
    return { kind: 'sampleable', columns };
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
  return problem ? { kind: 'invalid', problem } : { kind: 'sampleable', columns: fullColumns };
};

/** One cheap `LIMIT 1` count: tells a view with no data yet apart from one that has documents. */
const hasAnyDocument = async ({
  esClient,
  index,
  signal,
}: {
  esClient: ElasticsearchClient;
  index: string;
  signal: AbortSignal;
}): Promise<boolean> => {
  const response = (await esClient.esql.query(
    { query: esql.from([index]).limit(1).pipe`STATS total = COUNT(*)`.print('basic') },
    { signal }
  )) as unknown as { values: unknown[][] };
  const total = response.values[0]?.[0];
  return typeof total === 'number' && total > 0;
};
