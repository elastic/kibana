/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { esql, mutate, type ComposerQuery } from '@elastic/esql';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import {
  isRequestAbortedError,
  isResponseError,
  type ElasticsearchErrorDetails,
} from '@kbn/es-errors';
import {
  getSourceLocalIndexExpressions,
  getSourceReadTargets,
  toFromSourceQuery,
  withTimeRange,
} from '@kbn/nightshift-shared';
import type { SourceVolume } from './source_volume_event';

const QUERY_TIMEOUT_MS = 60_000;
const INDEX_MODE_FIELD = '_index_mode';
const SOURCE_FIELD = '_source';
const JSON_SAMPLE_SIZE = 10_000;

export interface MeasurementWindow {
  start: string;
  end: string;
}

interface MeteringStatsResponse {
  indices?: Array<{ num_docs: number; size_in_bytes: number }>;
}

const buildSourceQuery = (
  sourceEsql: string,
  metadataFields: readonly string[] = []
): ComposerQuery => {
  const source = esql(sourceEsql);
  const isTimeSeries = source.ast.commands[0]?.name === 'ts';
  // STATS COUNT(*) and METADATA _source need FROM, which also reads the indices TS leaves out.
  const query = isTimeSeries ? esql(toFromSourceQuery(sourceEsql)) : source;
  for (const field of [...metadataFields, ...(isTimeSeries ? [INDEX_MODE_FIELD] : [])]) {
    mutate.commands.from.metadata.upsert(query.ast, field);
  }
  return isTimeSeries
    ? query.where`${esql.col(INDEX_MODE_FIELD)} == ${esql.str('time_series')}`
    : query;
};

const withinWindow = (query: ComposerQuery, { start, end }: MeasurementWindow): ComposerQuery =>
  withTimeRange(query, { from: start, to: end });

const print = (query: ComposerQuery): string => query.inlineParams().print('basic');

const buildCountQuery = (sourceEsql: string, window: MeasurementWindow): string =>
  print(withinWindow(buildSourceQuery(sourceEsql), window).pipe`STATS doc_count = COUNT(*)`);

// A random sample: LIMIT alone reads in storage order, which skews towards a few indices.
const buildJsonSizeQuery = ({
  sourceEsql,
  window,
  docCount,
}: {
  sourceEsql: string;
  window: MeasurementWindow;
  docCount: number;
}): string => {
  const probability = JSON_SAMPLE_SIZE / docCount;
  const matched = withinWindow(buildSourceQuery(sourceEsql, [SOURCE_FIELD]), window);
  // SAMPLE rejects a probability of 1.
  const sampled = probability < 1 ? matched.sample(probability) : matched;
  return print(
    sampled.pipe`STATS average_json_bytes = AVG(BYTE_LENGTH(JSON_EXTRACT(${esql.col(
      SOURCE_FIELD
    )}, "$")))`
  );
};

const esErrorType = (error: errors.ResponseError): string | undefined =>
  (error.body as ElasticsearchErrorDetails | undefined)?.error?.type;

const isIndexNotFound = (error: unknown): boolean =>
  isResponseError(error) && esErrorType(error) === 'index_not_found_exception';

const isTimeout = (error: unknown): boolean =>
  error instanceof errors.TimeoutError || isRequestAbortedError(error);

type SourceTraits = Pick<SourceVolume, 'has_remote' | 'has_filter'>;

const toFailure = (error: unknown, traits: SourceTraits): SourceVolume => {
  if (isTimeout(error)) {
    return { status: 'timeout', ...traits, error: 'timeout' };
  }
  if (isResponseError(error)) {
    return {
      status: 'error',
      ...traits,
      error: esErrorType(error) ?? `http_${error.statusCode}`,
    };
  }
  return { status: 'error', ...traits, error: 'unknown' };
};

interface DocumentCount {
  docCount: number;
  isPartial: boolean;
  clusters?: { total: number; unsuccessful: number };
}

const countDocuments = async ({
  esClient,
  sourceEsql,
  window,
  signal,
}: {
  esClient: ElasticsearchClient;
  sourceEsql: string;
  window: MeasurementWindow;
  signal: AbortSignal;
}): Promise<DocumentCount> => {
  const {
    values,
    is_partial: isPartial = false,
    _clusters: clusterInfo,
  } = await esClient.esql.query(
    {
      query: buildCountQuery(sourceEsql, window),
      format: 'json',
      include_ccs_metadata: true,
    },
    { signal, requestTimeout: QUERY_TIMEOUT_MS }
  );
  // Every cluster skipped yields no rows, which must not read as an empty window.
  const clusters = clusterInfo && {
    total: clusterInfo.total,
    unsuccessful: clusterInfo.skipped + clusterInfo.partial + clusterInfo.failed,
  };
  return { docCount: Number(values[0]?.[0] ?? 0), isPartial, clusters };
};

const averageJsonDocumentBytes = async ({
  esClient,
  sourceEsql,
  window,
  docCount,
  signal,
}: {
  esClient: ElasticsearchClient;
  sourceEsql: string;
  window: MeasurementWindow;
  docCount: number;
  signal: AbortSignal;
}): Promise<number | undefined> => {
  const { values } = await esClient.esql.query(
    { query: buildJsonSizeQuery({ sourceEsql, window, docCount }), format: 'json' },
    { signal, requestTimeout: QUERY_TIMEOUT_MS }
  );
  const average = values[0]?.[0];
  return typeof average === 'number' ? average : undefined;
};

// The size APIs take no filter or time range: the average covers every document of the indices.
const averageStoredDocumentBytes = async ({
  esClient,
  indexPatterns,
  isServerless,
  signal,
}: {
  esClient: ElasticsearchClient;
  indexPatterns: string[];
  isServerless: boolean;
  signal: AbortSignal;
}): Promise<number | undefined> => {
  try {
    if (isServerless) {
      // Not a disk size: on Observability projects this is the metered size of the field values.
      const { indices = [] } = await esClient.transport.request<MeteringStatsResponse>(
        {
          method: 'GET',
          path: `/_metering/stats/${encodeURIComponent(indexPatterns.join(','))}`,
        },
        { signal }
      );
      const docs = indices.reduce((sum, { num_docs: numDocs }) => sum + numDocs, 0);
      const bytes = indices.reduce((sum, { size_in_bytes: sizeInBytes }) => sum + sizeInBytes, 0);
      return docs > 0 ? bytes / docs : undefined;
    }
    const { _shards: shards, _all: all } = await esClient.indices.stats(
      {
        index: indexPatterns,
        metric: ['docs', 'store'],
        expand_wildcards: ['open', 'hidden'],
        filter_path: [
          '_shards.failed',
          '_all.primaries.docs.count',
          '_all.primaries.store.total_data_set_size_in_bytes',
        ],
      },
      { signal }
    );
    if ((shards?.failed ?? 0) > 0) {
      return undefined;
    }
    const docs = all?.primaries?.docs?.count ?? 0;
    const bytes = all?.primaries?.store?.total_data_set_size_in_bytes ?? 0;
    return docs > 0 ? bytes / docs : undefined;
  } catch (error) {
    if (isIndexNotFound(error)) {
      return undefined;
    }
    throw error;
  }
};

/** Never throws: a failed count is reported in `status`; a failed size read drops its estimate. */
export const measureSourceVolume = async ({
  esClient,
  meteringEsClient,
  esql: sourceEsql,
  isServerless,
  window,
  signal,
  logger,
}: {
  esClient: ElasticsearchClient;
  meteringEsClient: ElasticsearchClient;
  esql: string;
  isServerless: boolean;
  window: MeasurementWindow;
  signal: AbortSignal;
  logger: Logger;
}): Promise<SourceVolume> => {
  let indexPatterns: string[];
  let traits: SourceTraits;
  try {
    indexPatterns = getSourceLocalIndexExpressions(sourceEsql);
    traits = {
      has_remote: getSourceReadTargets(sourceEsql).hasRemote,
      has_filter: esql(sourceEsql)
        .ast.commands.slice(1)
        .some(({ name }) => name === 'where'),
    };
  } catch {
    return { status: 'error', has_remote: false, has_filter: false, error: 'invalid_query' };
  }

  let count: DocumentCount;
  try {
    count = await countDocuments({ esClient, sourceEsql, window, signal });
  } catch (error) {
    return toFailure(error, traits);
  }

  const { docCount, isPartial, clusters } = count;
  const isIncomplete = isPartial || (clusters?.unsuccessful ?? 0) > 0;
  const volume: SourceVolume = {
    status: isIncomplete ? 'partial' : 'ok',
    ...traits,
    doc_count: docCount,
    ...(clusters && {
      clusters_total: clusters.total,
      clusters_unsuccessful: clusters.unsuccessful,
    }),
  };
  const hasLocalIndex = indexPatterns.length > 0;
  const storedBytesField = isServerless ? 'metered_bytes_estimated' : 'disk_bytes_estimated';
  if (docCount === 0) {
    if (isIncomplete) {
      return volume;
    }
    volume.json_bytes_estimated = 0;
    if (hasLocalIndex) {
      volume[storedBytesField] = 0;
    }
    return volume;
  }

  const [averageJsonBytes, averageStoredBytes] = await Promise.all([
    averageJsonDocumentBytes({ esClient, sourceEsql, window, docCount, signal }).catch((error) => {
      logger.warn(`Could not sample the document size of a source: ${error.message}`);
      return undefined;
    }),
    hasLocalIndex
      ? averageStoredDocumentBytes({
          esClient: isServerless ? meteringEsClient : esClient,
          indexPatterns,
          isServerless,
          signal,
        }).catch((error) => {
          logger.warn(`Could not read the index size behind a source: ${error.message}`);
          return undefined;
        })
      : undefined,
  ]);
  if (averageJsonBytes) {
    volume.json_bytes_estimated = Math.round(averageJsonBytes * docCount);
  }
  if (averageStoredBytes) {
    volume[storedBytesField] = Math.round(averageStoredBytes * docCount);
  }
  return volume;
};
