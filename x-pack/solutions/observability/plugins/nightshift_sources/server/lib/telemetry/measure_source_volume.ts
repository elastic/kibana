/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { BasicPrettyPrinter, Parser } from '@elastic/esql';
import type { ESQLAstItem, ESQLCommandOption } from '@elastic/esql/types';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { isResponseError, type ElasticsearchErrorDetails } from '@kbn/es-errors';
import { getSourceLocalIndexExpressions, getSourceReadTargets } from '@kbn/nightshift-shared';
import type { SourceVolume } from './source_volume_event';

const QUERY_TIMEOUT_MS = 60_000;
const INDEX_MODE_FIELD = '_index_mode';
const SOURCE_FIELD = '_source';
const RAW_SAMPLE_SIZE = 10_000;
// Sampled documents are shipped to Kibana here, so the sample is smaller.
const RAW_FALLBACK_SAMPLE_SIZE = 200;
// SAMPLE returns a varying number of rows.
const RAW_FALLBACK_MAX_ROWS = 2 * RAW_FALLBACK_SAMPLE_SIZE;

export interface MeasurementWindow {
  start: string;
  end: string;
}

interface MeteringStatsResponse {
  indices?: Array<{ num_docs: number; size_in_bytes: number }>;
}

const isMetadataOption = (argument: ESQLAstItem): argument is ESQLCommandOption =>
  !Array.isArray(argument) && argument.type === 'option' && argument.name === 'metadata';

const buildSourceQuery = (esql: string, metadataFields: readonly string[] = []): string => {
  const { root } = Parser.parse(esql);
  const [sourceCommand, ...processingCommands] = root.commands;
  const isTimeSeries = sourceCommand?.name === 'ts';
  const metadata = sourceCommand?.args.find(isMetadataOption);
  const missingFields = [...metadataFields, ...(isTimeSeries ? [INDEX_MODE_FIELD] : [])].filter(
    (field) =>
      !metadata?.args.some(
        (argument) =>
          !Array.isArray(argument) && argument.type === 'column' && argument.name === field
      )
  );
  if (!sourceCommand || (!isTimeSeries && missingFields.length === 0)) {
    return esql;
  }

  const source = BasicPrettyPrinter.command(sourceCommand).replace(/^TS(?=\s)/, 'FROM');
  const metadataSeparator = metadata ? ', ' : ' METADATA ';
  const from =
    missingFields.length > 0 ? `${source}${metadataSeparator}${missingFields.join(', ')}` : source;
  return [
    from,
    ...(isTimeSeries ? [`| WHERE \`${INDEX_MODE_FIELD}\` == "time_series"`] : []),
    ...processingCommands.map((command) => `| ${BasicPrettyPrinter.command(command)}`),
  ].join('\n');
};

// Inline for pushdown; newlines prevent trailing comments from swallowing appended commands.
const windowFilter = ({ start, end }: MeasurementWindow): string =>
  `| WHERE @timestamp >= "${start}" AND @timestamp <= "${end}"`;

const buildCountQuery = (esql: string, window: MeasurementWindow): string =>
  `${buildSourceQuery(esql)}\n${windowFilter(window)}\n| STATS doc_count = COUNT(*)`;

// A random sample: LIMIT alone reads in storage order, which skews towards a few indices.
const buildRawSampleQuery = ({
  esql,
  window,
  docCount,
  sampleSize,
}: {
  esql: string;
  window: MeasurementWindow;
  docCount: number;
  sampleSize: number;
}): string => {
  const probability = sampleSize / docCount;
  return [
    buildSourceQuery(esql, [SOURCE_FIELD]),
    windowFilter(window),
    // SAMPLE rejects a probability of 1; toFixed avoids exponent notation.
    ...(probability < 1 ? [`| SAMPLE ${probability.toFixed(12)}`] : []),
  ].join('\n');
};

const esErrorType = (error: errors.ResponseError): string | undefined =>
  (error.body as ElasticsearchErrorDetails | undefined)?.error?.type;

const isIndexNotFound = (error: unknown): boolean =>
  isResponseError(error) && esErrorType(error) === 'index_not_found_exception';

const isTimeout = (error: unknown): boolean =>
  error instanceof errors.TimeoutError || error instanceof errors.RequestAbortedError;

const toFailure = (error: unknown, hasRemote: boolean): SourceVolume => {
  if (isTimeout(error)) {
    return { status: 'timeout', has_remote: hasRemote, error: 'timeout' };
  }
  if (isResponseError(error)) {
    return {
      status: 'error',
      has_remote: hasRemote,
      error: esErrorType(error) ?? `http_${error.statusCode}`,
    };
  }
  return { status: 'error', has_remote: hasRemote, error: 'unknown' };
};

interface DocumentCount {
  docCount: number;
  isPartial: boolean;
  clusters?: { total: number; unsuccessful: number };
}

const countDocuments = async ({
  esClient,
  esql,
  window,
  signal,
}: {
  esClient: ElasticsearchClient;
  esql: string;
  window: MeasurementWindow;
  signal: AbortSignal;
}): Promise<DocumentCount> => {
  const {
    values,
    is_partial: isPartial = false,
    _clusters: clusterInfo,
  } = await esClient.esql.query(
    {
      query: buildCountQuery(esql, window),
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

const averageRawDocumentBytes = async ({
  esClient,
  esql,
  window,
  docCount,
  signal,
}: {
  esClient: ElasticsearchClient;
  esql: string;
  window: MeasurementWindow;
  docCount: number;
  signal: AbortSignal;
}): Promise<number | undefined> => {
  const options = { signal, requestTimeout: QUERY_TIMEOUT_MS };
  try {
    const { values } = await esClient.esql.query(
      {
        query: [
          buildRawSampleQuery({ esql, window, docCount, sampleSize: RAW_SAMPLE_SIZE }),
          `| EVAL raw_bytes = BYTE_LENGTH(JSON_EXTRACT(${SOURCE_FIELD}, "$"))`,
          '| STATS average_raw_bytes = AVG(raw_bytes)',
        ].join('\n'),
        format: 'json',
      },
      options
    );
    const average = values[0]?.[0];
    return typeof average === 'number' ? average : undefined;
  } catch (error) {
    if (isTimeout(error)) {
      throw error;
    }
  }

  // JSON_EXTRACT on _source needs 9.4+ on the executing cluster: measure in Kibana instead.
  const { values } = await esClient.esql.query(
    {
      query: [
        buildRawSampleQuery({ esql, window, docCount, sampleSize: RAW_FALLBACK_SAMPLE_SIZE }),
        `| LIMIT ${RAW_FALLBACK_MAX_ROWS}`,
        `| KEEP ${SOURCE_FIELD}`,
      ].join('\n'),
      format: 'json',
    },
    options
  );
  const sizes = values.flatMap(([source]) =>
    source === null || source === undefined ? [] : [Buffer.byteLength(JSON.stringify(source))]
  );
  return sizes.length > 0 ? sizes.reduce((sum, size) => sum + size, 0) / sizes.length : undefined;
};

const averageDocumentBytes = async ({
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
  esql,
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
  let hasRemote: boolean;
  try {
    indexPatterns = getSourceLocalIndexExpressions(esql);
    ({ hasRemote } = getSourceReadTargets(esql));
  } catch {
    return { status: 'error', has_remote: false, error: 'invalid_query' };
  }

  let count: DocumentCount;
  try {
    count = await countDocuments({ esClient, esql, window, signal });
  } catch (error) {
    return toFailure(error, hasRemote);
  }

  const { docCount, isPartial, clusters } = count;
  const isIncomplete = isPartial || (clusters?.unsuccessful ?? 0) > 0;
  const volume: SourceVolume = {
    status: isIncomplete ? 'partial' : 'ok',
    has_remote: hasRemote,
    doc_count: docCount,
    ...(clusters && {
      clusters_total: clusters.total,
      clusters_unsuccessful: clusters.unsuccessful,
    }),
  };
  // A lower-bound count would make the extrapolated sizes misleading.
  if (isIncomplete) {
    return volume;
  }
  const hasLocalIndex = indexPatterns.length > 0;
  if (docCount === 0) {
    return { ...volume, raw_bytes_estimated: 0, ...(hasLocalIndex && { disk_bytes_estimated: 0 }) };
  }

  const [averageRawBytes, averageDiskBytes] = await Promise.all([
    averageRawDocumentBytes({ esClient, esql, window, docCount, signal }).catch((error) => {
      logger.warn(`Could not sample the document size of a source: ${error.message}`);
      return undefined;
    }),
    hasLocalIndex
      ? averageDocumentBytes({
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
  if (averageRawBytes !== undefined) {
    volume.raw_bytes_estimated = Math.round(averageRawBytes * docCount);
  }
  if (averageDiskBytes !== undefined) {
    volume.disk_bytes_estimated = Math.round(averageDiskBytes * docCount);
  }
  return volume;
};
