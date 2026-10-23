/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { ESQLSearchResponse } from '@kbn/es-types';
import type { GeneratedQuery } from '../generator';
import type { EsqlColumn, EsqlValue, InventoryRow } from './types';

/** `ESQLSearchResponse` lacks `values_loaded`, which `include_execution_metadata` adds. */
type EsqlResponseWithMetadata = ESQLSearchResponse & { values_loaded?: number };

/** What one query cost; metadata the response lacks is null. */
export interface EsqlStats {
  /** Cluster time in milliseconds, not wall time. */
  took: number | null;
  /** Documents Elasticsearch visited, not matched. */
  documentsFound: number | null;
  /** Field values Elasticsearch read. */
  valuesLoaded: number | null;
  rowCount: number;
}

/** The columns, rows and cost of one ES|QL query. */
export interface EsqlQueryResult {
  columns: EsqlColumn[];
  rows: InventoryRow[];
  stats: EsqlStats;
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
  const response = (await client.esql.query(
    { query: esql, params, include_execution_metadata: true },
    { signal }
  )) as EsqlResponseWithMetadata;

  const columns = response.columns.map(({ name, type }) => ({ name, type }));
  const rows = response.values.map((values) => {
    const row: InventoryRow = {};
    columns.forEach(({ name }, index) => {
      row[name] = values[index] as EsqlValue;
    });
    return row;
  });

  return {
    columns,
    rows,
    stats: {
      took: response.took ?? null,
      documentsFound: response.documents_found ?? null,
      valuesLoaded: response.values_loaded ?? null,
      rowCount: rows.length,
    },
  };
};
