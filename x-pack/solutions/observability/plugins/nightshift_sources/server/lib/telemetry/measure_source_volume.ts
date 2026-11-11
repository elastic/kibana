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

const COUNT_TIMEOUT_MS = 60_000;
const INDEX_MODE_FIELD = '_index_mode';

export interface MeasurementWindow {
  start: string;
  end: string;
}

interface MeteringStatsResponse {
  indices?: Array<{ num_docs: number; size_in_bytes: number }>;
}

const isMetadataOption = (argument: ESQLAstItem): argument is ESQLCommandOption =>
  !Array.isArray(argument) && argument.type === 'option' && argument.name === 'metadata';

const buildCountSourceQuery = (esql: string): string => {
  const { root } = Parser.parse(esql);
  const [sourceCommand, ...processingCommands] = root.commands;
  if (sourceCommand?.name !== 'ts') {
    return esql;
  }

  const source = BasicPrettyPrinter.command(sourceCommand).replace(/^TS(?=\s)/, 'FROM');
  const metadata = sourceCommand.args.find(isMetadataOption);
  const hasIndexModeMetadata =
    metadata?.args.some(
      (argument) =>
        !Array.isArray(argument) && argument.type === 'column' && argument.name === INDEX_MODE_FIELD
    ) ?? false;
  const metadataSeparator = metadata ? ', ' : ' METADATA ';
  const from = hasIndexModeMetadata ? source : `${source}${metadataSeparator}${INDEX_MODE_FIELD}`;
  return [
    from,
    `| WHERE \`${INDEX_MODE_FIELD}\` == "time_series"`,
    ...processingCommands.map((command) => `| ${BasicPrettyPrinter.command(command)}`),
  ].join('\n');
};

// Inline for pushdown; newlines prevent trailing comments from swallowing appended commands.
const buildCountQuery = (esql: string, { start, end }: MeasurementWindow): string =>
  `${buildCountSourceQuery(
    esql
  )}\n| WHERE @timestamp >= "${start}" AND @timestamp <= "${end}"\n| STATS doc_count = COUNT(*)`;

const esErrorType = (error: errors.ResponseError): string | undefined =>
  (error.body as ElasticsearchErrorDetails | undefined)?.error?.type;

const isIndexNotFound = (error: unknown): boolean =>
  isResponseError(error) && esErrorType(error) === 'index_not_found_exception';

const toFailure = (error: unknown, hasRemote: boolean): SourceVolume => {
  if (error instanceof errors.TimeoutError || error instanceof errors.RequestAbortedError) {
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
    { signal, requestTimeout: COUNT_TIMEOUT_MS }
  );
  // Every cluster skipped yields no rows, which must not read as an empty window.
  const clusters = clusterInfo && {
    total: clusterInfo.total,
    unsuccessful: clusterInfo.skipped + clusterInfo.partial + clusterInfo.failed,
  };
  return { docCount: Number(values[0]?.[0] ?? 0), isPartial, clusters };
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

/** Never throws: a failed count is reported in `status`; a failed size read drops `bytes_estimated`. */
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
  // A lower-bound count would make the extrapolated size misleading.
  if (isIncomplete || indexPatterns.length === 0) {
    return volume;
  }
  if (docCount === 0) {
    return { ...volume, bytes_estimated: 0 };
  }

  try {
    const averageBytes = await averageDocumentBytes({
      esClient: isServerless ? meteringEsClient : esClient,
      indexPatterns,
      isServerless,
      signal,
    });
    if (averageBytes !== undefined) {
      volume.bytes_estimated = Math.round(averageBytes * docCount);
    }
  } catch (error) {
    logger.warn(`Could not read the index size behind a source: ${error.message}`);
  }
  return volume;
};
