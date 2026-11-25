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
import { getEsqlColumnSchema, type EsqlColumnSchema } from '@kbn/ai-tools';
import { SOURCE_TIMESTAMP_FIELD, getTimestampColumnProblem } from '@kbn/nightshift-shared';
import { parseError } from '../../streams/parse_error';
import { isIndexNotFoundError } from '../latest_source_query';
import { StatusError } from '../../errors/status_error';

const getMissingIndexProblem = (index: string): string =>
  `There are no documents to sample: an index behind [${index}] does not exist yet.`;

/** Reports a failure of the column probe or the random arm, which hard-fail sampling, with its sampling context. */
export const withSamplingErrorContext = async <T>(
  promise: Promise<T>,
  { index, query }: { index: string; query: 'Column probe' | 'Random sampling query' }
): Promise<T> => {
  try {
    return await promise;
  } catch (err) {
    // Missing data is the caller's input, not a sampling failure.
    if (isIndexNotFoundError(err)) {
      throw new StatusError(getMissingIndexProblem(index), 400);
    }
    throw new Error(`${query} failed: ${parseError(err).message}`);
  }
};

export type SampleColumnsProbe =
  | { kind: 'supported'; columns: EsqlColumnSchema[] | undefined }
  | { kind: 'empty' }
  | { kind: 'unsupported'; problem: string };

interface ProbeSampleColumnsParams {
  esClient: ElasticsearchClient;
  index: string;
  fields?: string[];
  logger: Logger;
  signal: AbortSignal;
}

/** Decides from a source's columns whether it can be sampled; throws only when it cannot tell. */
export const probeSampleColumns = async (
  params: ProbeSampleColumnsParams
): Promise<SampleColumnsProbe> => {
  try {
    return await probeColumns(params);
  } catch (error) {
    if (isIndexNotFoundError(error)) {
      return { kind: 'unsupported', problem: getMissingIndexProblem(params.index) };
    }
    throw new Error(`Column probe failed: ${parseError(error).message}`);
  }
};

const probeColumns = async ({
  esClient,
  index,
  fields = [],
  logger,
  signal,
}: ProbeSampleColumnsParams): Promise<SampleColumnsProbe> => {
  let columns: EsqlColumnSchema[];
  try {
    // Only the columns the caller reads: the full schema of a wide source can time out. No time
    // range here: a request-level range narrows the lookup to indices with data in the window,
    // while the sampling query's WHERE does not, so the two could disagree on a column's type.
    columns = await getEsqlColumnSchema({
      esClient,
      index,
      fields: [SOURCE_TIMESTAMP_FIELD, ...new Set(fields)],
      signal,
    });
  } catch (error) {
    if (isIndexNotFoundError(error)) {
      throw error;
    }
    const reason = getVerificationReason(error);
    // With the caller's fields in the probe the refusal can be about one of them, not the source:
    // NULLIFY does not cover a metadata name such as `_id`.
    if (reason !== undefined && fields.length === 0) {
      return {
        kind: 'unsupported',
        problem: `Elasticsearch rejects the query behind [${index}]: ${reason}`,
      };
    }
    // A probe that cannot answer must not take sampling down with it: the arms run as they did
    // before the probe existed, the entity arm without its filters.
    logger.warn(`Column probe failed, sampling without it: ${parseError(error).message}`);
    return { kind: 'supported', columns: undefined };
  }

  if (columns.some(({ name }) => name === SOURCE_TIMESTAMP_FIELD)) {
    return checkTimestampColumn(index, columns);
  }

  // The narrowed probe drops unmapped columns, so a missing @timestamp looks the same for a
  // source that never returns one (saved before the source API required it) and for a wildcard
  // with no index yet. The full schema tells them apart: nothing resolves behind a wildcard with
  // no index, while an index without @timestamp still reports its columns, whatever the
  // source's WHERE matches. It is wide, but only runs on a source that is already wrong.
  const fullColumns = await getEsqlColumnSchema({ esClient, index, signal });
  // An empty schema alone is not enough: an index that holds documents but maps no field
  // reports it too, and that one is an invalid source.
  if (fullColumns.length === 0 && !(await hasAnyDocument({ esClient, index, signal }))) {
    return { kind: 'empty' };
  }
  // The later answer wins: an index created between the two probes shows up here with a valid
  // @timestamp and with the entity fields the first, empty answer lacked.
  return checkTimestampColumn(index, fullColumns);
};

const checkTimestampColumn = (index: string, columns: EsqlColumnSchema[]): SampleColumnsProbe => {
  const problem = getTimestampColumnProblem(columns);
  return problem
    ? { kind: 'unsupported', problem: `Cannot sample [${index}]: ${problem}` }
    : { kind: 'supported', columns };
};

const getVerificationReason = (error: unknown): string | undefined => {
  if (
    !(error instanceof errors.ResponseError) ||
    error.body?.error?.type !== 'verification_exception'
  ) {
    return undefined;
  }
  const reason: unknown = error.body.error.reason;
  return typeof reason === 'string' ? reason : error.message;
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
