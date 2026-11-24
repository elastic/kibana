/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { ESQLColumn } from '@kbn/es-types';
import type { GeneratedQuery } from '../generator';
import { esqlResultsToRows } from './esql_results_to_rows';
import type {
  EsqlRequestBody,
  InventoryRow,
  QueryExecutionStats,
  QueryShardStats,
} from '../../../common';

/** The execution metadata of one response and the number of rows it returned. */
export interface EsqlStats extends Omit<QueryExecutionStats, 'isPartial'> {
  rowCount: number;
}

/** The columns, rows, completeness and cost of one ES|QL query. */
export interface EsqlQueryResult {
  columns: ESQLColumn[];
  rows: InventoryRow[];
  isPartial: boolean;
  stats: EsqlStats;
}

/**
 * `EsqlQueryResponse` lacks the stats Elasticsearch writes on every ES|QL response that sets
 * `include_execution_metadata`.
 */
interface EsqlQueryResponseWithStats extends estypes.EsqlQueryResponse {
  documents_found?: number;
  values_loaded?: number;
  rows_emitted?: number;
  cpu_nanos?: number;
  driver_nanos?: number;
  bytes_read?: number;
}

type ShardCount = 'successful' | 'skipped' | 'failed';

const sumShards = (shards: estypes.EsqlEsqlShardInfo[], key: ShardCount): number | null => {
  const counts = shards.flatMap((shard) => (shard[key] === undefined ? [] : [shard[key]]));
  return counts.length === 0 ? null : counts.reduce((sum, count) => sum + count, 0);
};

/** Sums the shard counts of every cluster; null when no cluster reports shards. */
const toShardStats = (
  clusters: estypes.EsqlEsqlClusterInfo | undefined
): QueryShardStats | null => {
  const shards = Object.values(clusters?.details ?? {}).flatMap(({ _shards: clusterShards }) =>
    clusterShards ? [clusterShards] : []
  );
  if (shards.length === 0) {
    return null;
  }
  return {
    total: shards.reduce((sum, { total }) => sum + total, 0),
    successful: sumShards(shards, 'successful'),
    skipped: sumShards(shards, 'skipped'),
    failed: sumShards(shards, 'failed'),
  };
};

/** Options for {@link executeEsql}. */
export interface ExecuteEsqlOptions {
  signal?: AbortSignal;
}

/** Builds the `POST /_query` body for one generated query; the only place that body is built. */
export const toEsqlRequestBody = ({ esql, params }: GeneratedQuery): EsqlRequestBody => ({
  query: esql,
  params,
  // `drop_null_columns` stays off so every plan returns the same column list.
  include_execution_metadata: true,
});

/**
 * Runs one generated query with its named parameters sent as request parameters, never
 * interpolated; throws the client's error unchanged.
 */
export const executeEsql = async (
  client: ElasticsearchClient,
  query: GeneratedQuery,
  { signal }: ExecuteEsqlOptions = {}
): Promise<EsqlQueryResult> => {
  const rawResponse: EsqlQueryResponseWithStats = await client.esql.query(
    toEsqlRequestBody(query),
    { signal }
  );

  const { columns, values } = rawResponse;
  const rows = esqlResultsToRows(columns, values);

  return {
    columns,
    rows,
    isPartial: rawResponse.is_partial ?? false,
    stats: {
      took: rawResponse.took ?? null,
      documentsFound: rawResponse.documents_found ?? null,
      valuesLoaded: rawResponse.values_loaded ?? null,
      rowsEmitted: rawResponse.rows_emitted ?? null,
      cpuNanos: rawResponse.cpu_nanos ?? null,
      driverNanos: rawResponse.driver_nanos ?? null,
      bytesRead: rawResponse.bytes_read ?? null,
      shards: toShardStats(rawResponse._clusters),
      rowCount: rows.length,
    },
  };
};
