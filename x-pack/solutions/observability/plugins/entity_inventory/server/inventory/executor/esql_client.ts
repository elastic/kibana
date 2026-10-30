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
import type { InventoryRow } from './types';

export interface EsqlStats {
  /** Cluster time in milliseconds, not wall time. */
  took: number | null;
  /** Documents Elasticsearch visited, not matched. */
  documentsFound: number | null;
  /** Field values Elasticsearch read. */
  valuesLoaded: number | null;
  rowCount: number;
}

/** The columns, rows, completeness and cost of one ES|QL query. */
export interface EsqlQueryResult {
  columns: ESQLColumn[];
  rows: InventoryRow[];
  isPartial: boolean;
  stats: EsqlStats;
}

/** `EsqlQueryResponse` lacks the stats Elasticsearch writes on every ES|QL response. */
interface EsqlQueryResponseWithStats extends estypes.EsqlQueryResponse {
  documents_found?: number;
  values_loaded?: number;
}

/** Options for {@link executeEsql}. */
export interface ExecuteEsqlOptions {
  signal?: AbortSignal;
}

/**
 * Runs one generated query with its named parameters sent as request parameters, never
 * interpolated; throws the client's error unchanged.
 */
export const executeEsql = async (
  client: ElasticsearchClient,
  { esql, params }: GeneratedQuery,
  { signal }: ExecuteEsqlOptions = {}
): Promise<EsqlQueryResult> => {
  // `drop_null_columns` stays off so every plan returns the same column list.
  const rawResponse: EsqlQueryResponseWithStats = await client.esql.query(
    { query: esql, params, include_execution_metadata: true },
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
      rowCount: rows.length,
    },
  };
};
