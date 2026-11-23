/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { Builder, esql } from '@elastic/esql';
import type { ESQLSingleAstItem } from '@elastic/esql/types';
import type { FeatureWithFilter } from '@kbn/significant-events-schema';
import { getEsqlColumnSchema, getSampleDocumentsEsql, type EsqlColumnSchema } from '@kbn/ai-tools';
import { getDiverseSampleDocuments } from '@kbn/nightshift-ai';
import {
  SOURCE_TIMESTAMP_FIELD,
  conditionToESQLFilterAst,
  getTimestampColumnProblem,
} from '@kbn/nightshift-shared';
import { getConditionFields } from '@kbn/streamlang';
import { partition } from 'lodash';
import { withSpan } from '@kbn/apm-utils';
import { timeoutSignal } from '@kbn/std';
import { type EntityFilter, getEntityFilters, isEntityValuesFilter } from './get_entity_filters';
import { parseError } from '../../streams/parse_error';
import { createSignificantEventsTracedEsClient } from '../create_significant_events_traced_es_client';
import { isIndexNotFoundError } from '../latest_source_query';
import { StatusError } from '../../errors/status_error';

const EMPTY_SAMPLE: { hits: Array<SearchHit<Record<string, unknown>>> } = { hits: [] };

type SamplingStrategy = 'entity-filtered' | 'diverse' | 'random';

/**
 * The column probe and the random arm are intentionally not caught (see call
 * sites): unlike diverse/entity-filtered, they are simple queries that are not
 * expected to fail, and the random arm is the backfill bucket the other arms
 * fall back to, so a failure here should hard-fail the call rather than
 * degrade silently. Wrap them so whatever does fail is reported with the
 * sampling context instead of a bare "Request timed out".
 */
const withSamplingErrorContext = async <T>(
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

export async function fetchSampleDocuments({
  esClient,
  index,
  start,
  end,
  features,
  logger,
  size,
  entityFilteredRatio,
  diverseRatio,
  maxEntityFilters,
  iteration,
  samplingTimeoutMs,
}: {
  esClient: ElasticsearchClient;
  index: string;
  start: number;
  end: number;
  features: FeatureWithFilter[];
  logger: Logger;
  size: number;
  entityFilteredRatio: number;
  diverseRatio: number;
  iteration: number;
  maxEntityFilters: number;
  samplingTimeoutMs: number;
}) {
  if (entityFilteredRatio < 0 || diverseRatio < 0) {
    throw new Error(
      `entityFilteredRatio (${entityFilteredRatio}) and diverseRatio (${diverseRatio}) must be >= 0`
    );
  }
  if (entityFilteredRatio + diverseRatio > 1) {
    throw new Error(
      `entityFilteredRatio (${entityFilteredRatio}) + diverseRatio (${diverseRatio}) must be <= 1`
    );
  }

  const { filters: entityFilters, omitted } = getEntityFilters(features, maxEntityFilters);
  const samplingSignal = timeoutSignal(samplingTimeoutMs);
  try {
    // Only the columns the arms read: the full schema of a wide source can time out. No time
    // range here: a request-level range narrows the lookup to indices with data in the window,
    // while the sampling query's WHERE does not, so the two could disagree on a column's type.
    const columns = await withSamplingErrorContext(
      getEsqlColumnSchema({
        esClient,
        index,
        fields: [
          SOURCE_TIMESTAMP_FIELD,
          ...new Set(entityFilters.flatMap((filter) => getFilterFields(filter))),
        ],
        signal: samplingSignal,
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

    if (columns) {
      // Every arm filters on @timestamp. A narrowed probe drops unmapped columns, so a missing one
      // looks the same for a source with data but no @timestamp (saved before the source API
      // required it) and for a wildcard with no index yet. Only the first is the source's fault.
      if (getTimestampColumnProblem(columns)) {
        const isTimestampUnmapped = !columns.some(({ name }) => name === SOURCE_TIMESTAMP_FIELD);
        // The full schema is the one thing that tells them apart: nothing resolves behind a
        // wildcard with no index, while an index without @timestamp still reports its columns,
        // whatever the source's WHERE matches. It is wide, but only runs on a source that is
        // already wrong.
        const fullColumns = isTimestampUnmapped
          ? await withSamplingErrorContext(
              getEsqlColumnSchema({ esClient, index, signal: samplingSignal }),
              { index, samplingTimeoutMs, query: 'Column probe' }
            )
          : columns;
        if (isTimestampUnmapped && fullColumns.length === 0) {
          // A source with no index yet, which create accepts: an empty sample lets the workflow
          // end on its "no documents" skip instead of failing the run.
          logger.debug(() => `Nothing resolves behind [${index}] yet; nothing to sample.`);
          return {
            documents: [],
            totalFilters: features.length,
            filtersCapped: omitted > 0,
            hasFilteredDocuments: false,
          };
        }
        // The later answer wins: an index created between the two probes shows up in the full
        // schema with a valid @timestamp, and then there is nothing to reject.
        const fullTimestampProblem = getTimestampColumnProblem(fullColumns);
        if (fullTimestampProblem) {
          throw new StatusError(`Cannot sample [${index}]: ${fullTimestampProblem}`, 400);
        }
      }
    }

    const tracedEsClient = createSignificantEventsTracedEsClient({
      client: esClient,
      logger,
      abortSignal: samplingSignal,
    });

    if (entityFilters.length === 0) {
      const diverseSize = Math.round(size * diverseRatio);

      const [{ hits: diverseHits }, { hits: randomHits }] = await Promise.all([
        diverseSize > 0
          ? withSpan(
              {
                name: 'sample_documents_diverse',
                labels: { stream: index, strategy: 'diverse', sampleSize: String(diverseSize) },
              },
              () =>
                getDiverseSampleDocuments({
                  esClient: tracedEsClient,
                  index,
                  start,
                  end,
                  size: diverseSize,
                  iteration,
                  logger,
                  signal: samplingSignal,
                })
            ).catch((err) => {
              logger.warn(`Diverse sampling query failed: ${parseError(err).message}`);
              return EMPTY_SAMPLE;
            })
          : Promise.resolve(EMPTY_SAMPLE),
        withSamplingErrorContext(
          withSpan(
            {
              name: 'sample_documents_random',
              labels: { stream: index, strategy: 'random', sampleSize: String(size) },
            },
            () =>
              getSampleDocumentsEsql({
                esClient,
                index,
                start,
                end,
                sampleSize: size,
                abortSignal: samplingSignal,
              })
          ),
          { index, samplingTimeoutMs, query: 'Random sampling query' }
        ),
      ]);

      const { documents, bucketCounts } = mergeDocuments(
        [
          { hits: diverseHits, cap: diverseSize, label: 'diverse' },
          { hits: randomHits, cap: size, label: 'random' },
        ],
        size
      );

      logger.debug(
        () =>
          `Sampled ${documents.length} documents (${bucketCounts.diverse} diverse, ${
            bucketCounts.random
          } random). ${
            features.length === 0
              ? 'No entities available to filter by.'
              : `No entity filters could be applied (${omitted} features omitted).`
          }`
      );

      return {
        documents,
        totalFilters: features.length,
        filtersCapped: omitted > 0,
        hasFilteredDocuments: false,
      };
    }

    const entityFilteredSize = Math.round(size * entityFilteredRatio);
    const diverseSize = Math.round(size * diverseRatio);

    const [{ hits: entityFilteredHits }, { hits: diverseHits }, { hits: randomHits }] =
      await Promise.all([
        withSpan(
          {
            name: 'sample_documents_entity_filtered',
            labels: {
              stream: index,
              strategy: 'entity-filtered',
              sampleSize: String(entityFilteredSize),
            },
          },
          () =>
            fetchEntityFilteredDocuments({
              esClient,
              index,
              start,
              end,
              sampleSize: entityFilteredSize,
              entityFilters,
              columns,
              logger,
              abortSignal: samplingSignal,
            })
        ).catch((err) => {
          logger.warn(`Entity-filtered sampling query failed: ${parseError(err).message}`);
          return EMPTY_SAMPLE;
        }),
        diverseSize > 0
          ? withSpan(
              {
                name: 'sample_documents_diverse',
                labels: {
                  stream: index,
                  strategy: 'diverse',
                  sampleSize: String(diverseSize + entityFilteredSize),
                },
              },
              () =>
                getDiverseSampleDocuments({
                  esClient: tracedEsClient,
                  index,
                  start,
                  end,
                  size: diverseSize + entityFilteredSize,
                  iteration,
                  logger,
                  signal: samplingSignal,
                })
            ).catch((err) => {
              logger.warn(`Diverse sampling query failed: ${parseError(err).message}`);
              return EMPTY_SAMPLE;
            })
          : Promise.resolve(EMPTY_SAMPLE),
        withSamplingErrorContext(
          withSpan(
            {
              name: 'sample_documents_random',
              labels: { stream: index, strategy: 'random', sampleSize: String(size) },
            },
            () =>
              getSampleDocumentsEsql({
                esClient,
                index,
                start,
                end,
                sampleSize: size,
                abortSignal: samplingSignal,
              })
          ),
          { index, samplingTimeoutMs, query: 'Random sampling query' }
        ),
      ]);

    const { documents, bucketCounts } = mergeDocuments(
      [
        { hits: entityFilteredHits, cap: entityFilteredSize, label: 'entity-filtered' },
        { hits: diverseHits, cap: diverseSize, label: 'diverse' },
        { hits: randomHits, cap: size, label: 'random' },
      ],
      size
    );

    logger.debug(
      () =>
        `Sampled ${documents.length} documents (${
          bucketCounts['entity-filtered']
        } entity-filtered, ${bucketCounts.diverse} diverse of which ${Math.max(
          0,
          bucketCounts.diverse - diverseSize
        )} backfilled unused entity-filtered slots, ${bucketCounts.random} random). ${
          entityFilters.length
        } entity filters applied (${omitted} features omitted):\n${JSON.stringify(entityFilters)}`
    );

    return {
      documents,
      totalFilters: features.length,
      filtersCapped: omitted > 0,
      hasFilteredDocuments: entityFilteredHits.length > 0,
    };
  } finally {
    samplingSignal.dispose();
  }
}

/**
 * Runs the entity-filtered arm on the filters the source can evaluate from its mappings.
 *
 * Deliberately no `SET unmapped_fields="LOAD"`: when a filter field is unmapped in some
 * backing indices, LOAD parses `_source` for every document there, and the arm's count
 * query does it over the whole window. On wildcard logs sources that turned a 3 s query
 * into a timeout that only surfaced as a warning (elastic/nightshift-program#2273).
 * Filters on fields with no mapping at all are skipped; the diverse and random arms backfill.
 */
async function fetchEntityFilteredDocuments({
  esClient,
  index,
  start,
  end,
  sampleSize,
  entityFilters,
  columns,
  logger,
  abortSignal,
}: {
  esClient: ElasticsearchClient;
  index: string;
  start: number;
  end: number;
  sampleSize: number;
  entityFilters: EntityFilter[];
  /** Absent when the column probe failed: no filter can be checked, so the arm has nothing to run. */
  columns: EsqlColumnSchema[] | undefined;
  logger: Logger;
  abortSignal: AbortSignal;
}): Promise<{ hits: Array<SearchHit<Record<string, unknown>>> }> {
  if (!columns) {
    return EMPTY_SAMPLE;
  }
  // A type conflict across backing indices surfaces as `unsupported`, which no comparison accepts.
  const queryableFields = new Set(
    columns.filter(({ type }) => type !== 'unsupported').map(({ name }) => name)
  );
  const [queryableFilters, skippedFilters] = partition(entityFilters, (filter) =>
    getFilterFields(filter).every((name) => queryableFields.has(name))
  );

  if (skippedFilters.length > 0) {
    logger.debug(
      () =>
        `Skipped ${
          skippedFilters.length
        } entity filters on fields that are unmapped or have conflicting types in [${index}]:\n${JSON.stringify(
          skippedFilters
        )}`
    );
  }
  if (queryableFilters.length === 0) {
    return EMPTY_SAMPLE;
  }

  return getSampleDocumentsEsql({
    esClient,
    index,
    start,
    end,
    sampleSize,
    whereCondition: queryableFilters
      .map(toExclusionAst)
      .reduce((left, right) => Builder.expression.func.binary('and', [left, right])),
    abortSignal,
  });
}

const getFilterFields = (filter: EntityFilter): string[] =>
  isEntityValuesFilter(filter)
    ? [filter.field]
    : getConditionFields(filter).map(({ name }) => name);

const toLiteral = (value: string | number | boolean) => {
  if (typeof value === 'string') {
    return esql.str(value);
  }
  return typeof value === 'number' ? esql.num(value) : esql.bool(value);
};

const toExclusionAst = (filter: EntityFilter): ESQLSingleAstItem => {
  if (!isEntityValuesFilter(filter)) {
    return conditionToESQLFilterAst({ not: filter });
  }

  const notIn = esql.exp`${esql.col(filter.field)} NOT IN (${filter.values.map(toLiteral)})`;
  const isNull = Builder.expression.func.postfix(
    'IS NULL',
    Builder.expression.column(filter.field)
  );
  // The composer re-parses spliced ASTs as text, so a bare OR would bind looser than the surrounding AND.
  return Builder.expression.parens(Builder.expression.func.binary('or', [notIn, isNull]));
};

function mergeDocuments(
  prioritizedHits: Array<{
    hits: Array<SearchHit<Record<string, unknown>>>;
    cap: number;
    label: SamplingStrategy;
  }>,
  totalSize: number
): {
  documents: Array<SearchHit<Record<string, unknown>>>;
  bucketCounts: Record<SamplingStrategy, number>;
} {
  const seen = new Set<string>();
  const result: Array<SearchHit<Record<string, unknown>>> = [];
  const bucketCounts = { 'entity-filtered': 0, diverse: 0, random: 0 };

  // Cumulative: a bucket's unused slots carry to the next.
  let limit = 0;
  for (const { hits, cap, label } of prioritizedHits) {
    limit = Math.min(limit + cap, totalSize);
    const countBefore = result.length;
    for (const hit of hits) {
      if (result.length >= limit) break;
      if (hit._id && seen.has(hit._id)) continue;
      if (hit._id) seen.add(hit._id);
      result.push(hit);
    }
    bucketCounts[label] = result.length - countBefore;
  }

  return { documents: result, bucketCounts };
}
