/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { ESQLSearchResponse } from '@kbn/es-types';
import { toTimeSeriesSourceQuery } from '@kbn/nightshift-shared';
import { timeoutSignal } from '@kbn/std';

const CATALOGUE_PAGE_SIZE = 100;
const MAX_CATALOGUE_PAGES = 1_000;
const CATALOGUE_TIMEOUT_MS = 30_000;

export interface MetricsInfoRow {
  metricName: string;
  dataStream: string;
  unit?: string;
  metricType?: string;
  fieldType?: string;
  dimensionFields: string[];
}

export type MetricsCatalogue = ReadonlyMap<string, readonly MetricsInfoRow[]>;

interface PageCursor {
  metricName: string;
  dataStream: string;
}

interface RawMetricsInfoRow {
  metricName: string;
  dataStreams: string[];
  unit?: string;
  metricType?: string;
  fieldType?: string;
  dimensionFields: string[];
}

const asStrings = (value: ESQLSearchResponse['values'][number][number]): string[] => {
  const values = Array.isArray(value) ? value : [value];
  return values.filter((item): item is string => typeof item === 'string' && item.length > 0);
};

const firstString = (value: ESQLSearchResponse['values'][number][number]): string | undefined =>
  asStrings(value)[0];

const quoteString = (value: string): string =>
  `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;

const rowsFromResponse = (response: ESQLSearchResponse): RawMetricsInfoRow[] => {
  const indexOf = (name: string): number =>
    response.columns.findIndex((column) => column.name === name);
  const metricNameIndex = indexOf('metric_name');
  const dataStreamIndex = indexOf('data_stream');
  const unitIndex = indexOf('unit');
  const metricTypeIndex = indexOf('metric_type');
  const fieldTypeIndex = indexOf('field_type');
  const dimensionFieldsIndex = indexOf('dimension_fields');

  if (metricNameIndex === -1 || dataStreamIndex === -1) {
    return [];
  }

  return response.values.flatMap((values) => {
    const metricName = firstString(values[metricNameIndex]);
    const dataStreams = asStrings(values[dataStreamIndex]);
    if (!metricName || dataStreams.length === 0) {
      return [];
    }
    const unit = unitIndex === -1 ? undefined : firstString(values[unitIndex]);
    const metricType = metricTypeIndex === -1 ? undefined : firstString(values[metricTypeIndex]);
    const fieldType = fieldTypeIndex === -1 ? undefined : firstString(values[fieldTypeIndex]);
    const dimensionFields =
      dimensionFieldsIndex === -1 ? [] : asStrings(values[dimensionFieldsIndex]);
    return [{ metricName, dataStreams, unit, metricType, fieldType, dimensionFields }];
  });
};

const cursorFor = (row: RawMetricsInfoRow): PageCursor => ({
  metricName: row.metricName,
  dataStream: [...row.dataStreams].sort().at(-1) ?? '',
});

const buildMetricsInfoQuery = (sourceQuery: string, cursor?: PageCursor): string => {
  const after = cursor
    ? ` | WHERE metric_name > ${quoteString(cursor.metricName)} OR (metric_name == ${quoteString(
        cursor.metricName
      )} AND data_stream > ${quoteString(cursor.dataStream)})`
    : '';
  return `${sourceQuery} | WHERE TRANGE(1 hour) | METRICS_INFO${after} | SORT metric_name, data_stream | LIMIT ${CATALOGUE_PAGE_SIZE}`;
};

export interface GetMetricsCatalogueOptions {
  esClient: ElasticsearchClient;
  esql: string;
  signal?: AbortSignal;
}

const queryMetricsCatalogue = async ({
  esClient,
  sourceQuery,
  requestSignal,
}: {
  esClient: ElasticsearchClient;
  sourceQuery: string;
  requestSignal: AbortSignal;
}): Promise<MetricsCatalogue> => {
  const byDataStream = new Map<string, MetricsInfoRow[]>();
  let cursor: PageCursor | undefined;

  for (let page = 0; page < MAX_CATALOGUE_PAGES; page++) {
    const response = (await esClient.esql.query(
      { query: buildMetricsInfoQuery(sourceQuery, cursor) },
      { signal: requestSignal }
    )) as ESQLSearchResponse;
    const rows = rowsFromResponse(response);

    for (const row of rows) {
      for (const dataStream of row.dataStreams) {
        const entries = byDataStream.get(dataStream) ?? [];
        entries.push({
          metricName: row.metricName,
          dataStream,
          unit: row.unit,
          metricType: row.metricType,
          fieldType: row.fieldType,
          dimensionFields: row.dimensionFields,
        });
        byDataStream.set(dataStream, entries);
      }
    }

    if (rows.length < CATALOGUE_PAGE_SIZE) {
      return byDataStream;
    }

    const nextCursor = cursorFor(rows[rows.length - 1]);
    if (
      cursor?.metricName === nextCursor.metricName &&
      cursor.dataStream === nextCursor.dataStream
    ) {
      throw new Error('Metrics catalogue page did not advance');
    }
    cursor = nextCursor;
  }

  throw new Error('Metrics catalogue page limit reached');
};

/** Returns the live metrics catalogue grouped by data stream. */
export const getMetricsCatalogue = async ({
  esClient,
  esql,
  signal,
}: GetMetricsCatalogueOptions): Promise<MetricsCatalogue> => {
  const sourceQuery = toTimeSeriesSourceQuery(esql);
  const deadline = timeoutSignal(CATALOGUE_TIMEOUT_MS);
  try {
    const requestSignal = signal ? AbortSignal.any([signal, deadline]) : deadline;
    return await queryMetricsCatalogue({ esClient, sourceQuery, requestSignal });
  } finally {
    deadline.dispose();
  }
};
