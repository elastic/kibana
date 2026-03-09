/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DiscoverStart } from '@kbn/discover-plugin/public';
import type { TimeRange } from '@kbn/es-query';
import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
import {
  ALL_VALUE,
  apmTransactionDurationIndicatorSchema,
  apmTransactionErrorRateIndicatorSchema,
  kqlWithFiltersSchema,
} from '@kbn/slo-schema';

const SLO_EVENT_VARIABLE = 'slo_event_filter';

interface EsqlLinkConfig {
  esql: string;
}

function getTransactionIndex(slo: SLOWithSummaryResponse, apmTransactionIndex: string): string {
  if (slo.remote) {
    return apmTransactionIndex
      .split(',')
      .map((p) => `${slo.remote!.remoteName}:${p.trim()}`)
      .join(',');
  }
  return apmTransactionIndex;
}

function appendApmWhereFilters(
  whereClauses: string[],
  params: {
    service: string;
    environment: string;
    transactionType: string;
    transactionName: string;
    filter?: unknown;
  }
) {
  if (params.service !== ALL_VALUE) {
    whereClauses.push(`service.name == "${params.service}"`);
  }
  if (params.environment !== ALL_VALUE) {
    whereClauses.push(`service.environment == "${params.environment}"`);
  }
  if (params.transactionType !== ALL_VALUE) {
    whereClauses.push(`transaction.type == "${params.transactionType}"`);
  }
  if (params.transactionName !== ALL_VALUE) {
    whereClauses.push(`transaction.name == "${params.transactionName}"`);
  }

  if (params.filter) {
    const filterKuery = kqlWithFiltersSchema.is(params.filter)
      ? params.filter.kqlQuery
      : String(params.filter);
    if (filterKuery) {
      whereClauses.push(filterKuery);
    }
  }
}

function buildApmLatencyEsqlConfig(
  slo: SLOWithSummaryResponse,
  apmTransactionIndex: string
): EsqlLinkConfig | undefined {
  if (!apmTransactionDurationIndicatorSchema.is(slo.indicator)) {
    return undefined;
  }

  const { params } = slo.indicator;
  const index = getTransactionIndex(slo, apmTransactionIndex);
  const thresholdMicros = Math.trunc(params.threshold * 1000);

  const whereClauses: string[] = ['TO_STRING(processor.event) == "transaction"'];
  appendApmWhereFilters(whereClauses, params);

  const sloEventFilter = [
    `(?${SLO_EVENT_VARIABLE} == "bad" AND transaction.duration.us > ${thresholdMicros})`,
    `OR (?${SLO_EVENT_VARIABLE} == "good" AND transaction.duration.us <= ${thresholdMicros})`,
    `OR ?${SLO_EVENT_VARIABLE} == "all"`,
  ].join(' ');

  const esql = [
    `FROM ${index}`,
    `  | WHERE ${whereClauses.join(' AND ')}`,
    `  | EVAL slo_event = CASE(transaction.duration.us <= ${thresholdMicros}, "good", "bad")`,
    `  | WHERE ${sloEventFilter}`,
  ].join('\n');

  return { esql };
}

function buildApmAvailabilityEsqlConfig(
  slo: SLOWithSummaryResponse,
  apmTransactionIndex: string
): EsqlLinkConfig | undefined {
  if (!apmTransactionErrorRateIndicatorSchema.is(slo.indicator)) {
    return undefined;
  }

  const { params } = slo.indicator;
  const index = getTransactionIndex(slo, apmTransactionIndex);

  const whereClauses: string[] = [
    'TO_STRING(processor.event) == "transaction"',
    'event.outcome IN ("success", "failure")',
  ];
  appendApmWhereFilters(whereClauses, params);

  const sloEventFilter = [
    `(?${SLO_EVENT_VARIABLE} == "bad" AND event.outcome == "failure")`,
    `OR (?${SLO_EVENT_VARIABLE} == "good" AND event.outcome == "success")`,
    `OR ?${SLO_EVENT_VARIABLE} == "all"`,
  ].join(' ');

  const esql = [
    `FROM ${index}`,
    `  | WHERE ${whereClauses.join(' AND ')}`,
    `  | EVAL slo_event = CASE(event.outcome == "success", "good", "bad")`,
    `  | WHERE ${sloEventFilter}`,
  ].join('\n');

  return { esql };
}

function buildEsqlConfig(
  slo: SLOWithSummaryResponse,
  apmTransactionIndex: string
): EsqlLinkConfig | undefined {
  return (
    buildApmLatencyEsqlConfig(slo, apmTransactionIndex) ??
    buildApmAvailabilityEsqlConfig(slo, apmTransactionIndex)
  );
}

function buildSloEventControl() {
  return {
    'slo-event-control': {
      type: 'esqlControl',
      order: 0,
      variable_name: SLO_EVENT_VARIABLE,
      variable_type: 'values',
      available_options: ['all', 'good', 'bad'],
      selected_options: ['bad'],
      single_select: true,
      title: 'SLO event',
      esql_query: '',
      control_type: 'STATIC_VALUES',
    },
  };
}

export function getDiscoverEsqlLink({
  slo,
  timeRange,
  discover,
  apmTransactionIndex,
}: {
  slo: SLOWithSummaryResponse;
  timeRange: TimeRange;
  discover?: DiscoverStart;
  apmTransactionIndex: string;
}): string | undefined {
  if (!apmTransactionIndex) {
    return undefined;
  }

  const config = buildEsqlConfig(slo, apmTransactionIndex);
  if (!config) {
    return undefined;
  }

  return discover?.locator?.getRedirectUrl({
    query: { esql: config.esql },
    timeRange,
    esqlControls: buildSloEventControl() as Record<string, unknown> as any,
  });
}
