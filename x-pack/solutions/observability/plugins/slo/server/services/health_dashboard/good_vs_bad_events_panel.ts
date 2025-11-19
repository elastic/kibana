/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CreateSLOParams } from '@kbn/slo-schema';
import type { DashboardPanel } from '@kbn/dashboard-plugin/server';
import { createESQLPanel } from './create_esql_panel';

/**
 * Extracts the KQL query string from either a string or KQL query object
 */
function extractKqlString(
  kql: string | { kqlQuery: string; filters: unknown[] } | undefined
): string | undefined {
  if (!kql) {
    return undefined;
  }
  if (typeof kql === 'string') {
    return kql;
  }
  return kql.kqlQuery;
}

/**
 * Converts a simple KQL query to ESQL WHERE clause
 * Handles basic field:value patterns and comparison operators
 */
function kqlToEsqlWhere(kql: string): string {
  // Remove leading/trailing whitespace
  kql = kql.trim();

  // Pattern: field : "value" or field : value (equality)
  const simpleMatch = kql.match(/^(\w+(?:\.\w+)*)\s*:\s*"([^"]+)"$/);
  if (simpleMatch) {
    return `${simpleMatch[1]} == "${simpleMatch[2]}"`;
  }

  const simpleMatchNoQuotes = kql.match(/^(\w+(?:\.\w+)*)\s*:\s*(\w+)$/);
  if (simpleMatchNoQuotes) {
    return `${simpleMatchNoQuotes[1]} == "${simpleMatchNoQuotes[2]}"`;
  }

  // Pattern: field < value, field > value, field <= value, field >= value, field != value
  const comparisonMatch = kql.match(/^(\w+(?:\.\w+)*)\s*(<=?|>=?|!=)\s*(\d+(?:\.\d+)?)$/);
  if (comparisonMatch) {
    return `${comparisonMatch[1]} ${comparisonMatch[2]} ${comparisonMatch[3]}`;
  }

  // Pattern: field < "value", field > "value", etc. with quoted values
  const comparisonMatchQuoted = kql.match(/^(\w+(?:\.\w+)*)\s*(<=?|>=?|!=)\s*"([^"]+)"$/);
  if (comparisonMatchQuoted) {
    return `${comparisonMatchQuoted[1]} ${comparisonMatchQuoted[2]} "${comparisonMatchQuoted[3]}"`;
  }

  // Return as comment if we can't convert
  return `/* KQL: ${kql} - Complex KQL not converted */`;
}

/**
 * Generates an ESQL query for good vs bad events from source data
 * Only works for custom KQL indicator type
 */
function generateGoodBadEventsQuery(sloParams: CreateSLOParams): string | null {
  const indicator = sloParams.indicator;

  // Only support custom KQL indicators
  if (indicator.type !== 'sli.kql.custom') {
    return null;
  }

  // Extract index pattern and timestamp field
  if (!('params' in indicator) || !indicator.params) {
    return null;
  }

  const params = indicator.params;
  const indexPattern = params.index;
  const timestampField = params.timestampField || '@timestamp';

  // Extract KQL strings from potentially complex objects
  const globalFilterKql = extractKqlString(params.filter);
  const goodKql = extractKqlString(params.good);
  const totalKql = extractKqlString(params.total);

  if (!indexPattern || !goodKql) {
    return null;
  }

  // Convert KQL to ESQL WHERE clauses
  const goodWhere = kqlToEsqlWhere(goodKql);
  // If totalKql is empty or not provided, consider all documents (always true)
  const totalWhere = totalKql && totalKql.trim() !== '' ? kqlToEsqlWhere(totalKql) : 'true';

  // Build query
  let query = `FROM ${indexPattern}\n`;

  if (globalFilterKql && globalFilterKql.trim() !== '') {
    query += `| WHERE ${kqlToEsqlWhere(globalFilterKql)}\n`;
  }

  query += `| EVAL is_good = CASE(
    ${goodWhere}, 1,
    0
  )
  | EVAL is_total = CASE(
    ${totalWhere}, 1,
    0
  )
  | STATS 
      good_events = SUM(is_good),
      total_events = SUM(is_total)
    BY time_bucket = BUCKET(${timestampField}, 1 minute)
  | EVAL bad_events = total_events - good_events
  | EVAL time_bucket = TO_DATETIME(time_bucket)
  | SORT time_bucket DESC
  | LIMIT 100`;

  return query;
}

/**
 * Generates a Lens panel showing good vs bad events from source data
 * Only works for custom KQL indicator type
 * Returns null for other indicator types
 */
export function generateSourceDataPanel(sloParams: CreateSLOParams): DashboardPanel | null {
  const indicator = sloParams.indicator;

  // Only support custom KQL indicators
  if (indicator.type !== 'sli.kql.custom') {
    return null;
  }

  const esqlQuery = generateGoodBadEventsQuery(sloParams);

  if (!esqlQuery) {
    return null;
  }

  // At this point, TypeScript knows indicator.type is 'sli.kql.custom'
  // so indicator.params is properly typed
  const params = indicator.params;
  const indexPattern = params.index;
  const timestampField = params.timestampField || '@timestamp';

  return createESQLPanel({
    esqlQuery,
    title: 'Good vs Bad Events (Source Data)',
    description: 'Good and bad events from source index (independent of transforms)',
    indexPattern,
    gridPosition: { x: 0, y: 0, w: 24, h: 12 },
    visualizationType: 'lnsXY',
    columns: [
      {
        columnId: 'time_bucket',
        fieldName: 'time_bucket',
        meta: {
          type: 'date',
          esType: 'date',
        },
      },
      {
        columnId: 'good_events',
        fieldName: 'good_events',
        meta: {
          type: 'number',
          esType: 'long',
        },
        inMetricDimension: true,
      },
      {
        columnId: 'bad_events',
        fieldName: 'bad_events',
        meta: {
          type: 'number',
          esType: 'long',
        },
        inMetricDimension: true,
      },
    ],
    visualizationConfig: {
      xAccessor: 'time_bucket',
      accessors: ['good_events', 'bad_events'],
      seriesType: 'bar_stacked',
    },
    timeField: timestampField,
  });
}
