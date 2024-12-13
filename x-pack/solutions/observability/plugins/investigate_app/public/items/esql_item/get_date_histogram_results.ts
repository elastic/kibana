/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Suggestion } from '@kbn/lens-plugin/public';
import type { ESQLColumn } from '@kbn/es-types';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { EsqlService } from '../../services/esql';

export async function getDateHistogramResults({
  query,
  esql,
  timeRange,
  filter,
  suggestion,
  signal,
  columns,
}: {
  query: string;
  esql: EsqlService;
  timeRange: {
    from: string;
    to: string;
  };
  filter: QueryDslQueryContainer;
  suggestion: Suggestion;
  signal: AbortSignal;
  columns: ESQLColumn[];
}) {
  const groupingExpression = `BUCKET(@timestamp, 50, "${timeRange.from}", "${timeRange.to}")`;
  const dateHistoQuery = `${query} | STATS count = COUNT(*) BY ${groupingExpression}`;

  const dateHistoResponse =
    suggestion.visualizationId === 'lnsDatatable' &&
    columns.find((column) => column.name === '@timestamp')
      ? await esql.queryWithMeta({
          query: dateHistoQuery,
          signal,
          filter,
        })
      : undefined;

  return dateHistoResponse
    ? {
        columns: dateHistoResponse.query.columns,
        values: dateHistoResponse.query.values,
        query: dateHistoQuery,
        groupingExpression,
      }
    : undefined;
}
