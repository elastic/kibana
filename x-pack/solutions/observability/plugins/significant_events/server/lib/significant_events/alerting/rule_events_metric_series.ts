/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql, type ComposerQuery } from '@elastic/esql';
import type {
  MappingRuntimeFields,
  QueryDslQueryContainer,
} from '@elastic/elasticsearch/lib/api/types';
import {
  METRIC_SERIES_BUCKET_FIELD,
  METRIC_SERIES_VALUE_FIELD,
} from '../rules/metric_series_contract';

/** Alerting v2 signal events index used by Significant Events readers. */
export const RULE_EVENTS_INDEX = '.rule-events';

/**
 * Canonical ES|QL projection of MATCH metric-series leaves from flattened `data`.
 *
 * `.rule-events.data` is `flattened`, so `data.bucket` / `data.metric_value` are
 * not columns. Every ES|QL read path must go through {@link projectMetricSeriesColumns}:
 *
 * ```esql
 * | EVAL metric_value = TO_LONG(FIELD_EXTRACT(data, "metric_value"))
 * | EVAL bucket = TO_DATETIME(TO_LONG(FIELD_EXTRACT(data, "bucket")))
 * ```
 *
 * Invariant: both this projection and {@link METRIC_SERIES_RUNTIME_MAPPINGS}
 * assume Alerting v2 persists the ES|QL date column as epoch millis, which the
 * Arrow streaming write path guarantees. `TO_LONG` / `Long.parseLong` cannot
 * parse an ISO-8601 string — if `bucket` were ever persisted as ISO text, the
 * reader's `bucket IS NOT NULL` guard would silently empty the series.
 */
export function projectMetricSeriesColumns(query: ComposerQuery): ComposerQuery {
  const dataCol = esql.col('data');
  const bucketKey = esql.str(METRIC_SERIES_BUCKET_FIELD);
  const valueKey = esql.str(METRIC_SERIES_VALUE_FIELD);

  // `metric_value` is a `long` in the runtime mapping; TO_LONG keeps the ES|QL
  // read path type-symmetric with it.
  return query.pipe`EVAL metric_value = TO_LONG(FIELD_EXTRACT(${dataCol}, ${valueKey}))`
    .pipe`EVAL bucket = TO_DATETIME(TO_LONG(FIELD_EXTRACT(${dataCol}, ${bucketKey})))`;
}

/** Runtime field names used by DSL aggregations over the projected metric series. */
export const METRIC_SERIES_BUCKET_RUNTIME_FIELD = 'metric_series.bucket';
export const METRIC_SERIES_VALUE_RUNTIME_FIELD = 'metric_series.value';

/**
 * Parse a flattened `data` leaf from `_source` (preferred) or doc-values.
 *
 * Alerting v2 treats `doc['data.<leaf>']` as brittle for flattened fields and
 * prefers `_source` / FIELD_EXTRACT (see series_grouping_values_query). Runtime
 * mappings used by change_point must follow the same `_source`-first rule or the
 * date_histogram sees no values and change_point returns `indeterminable`.
 *
 * Numeric parse only (epoch millis for `bucket`): same contract as the ES|QL
 * `TO_LONG` path above.
 */
function flattenedLeafScript(leaf: string): string {
  return `
        String text = null;
        if (params._source != null && params._source.containsKey('data') && params._source.data != null) {
          def raw = params._source.data['${leaf}'];
          if (raw != null) { text = raw.toString(); }
        }
        if (text == null || text.isEmpty()) {
          if (doc.containsKey('data.${leaf}') && !doc['data.${leaf}'].empty) {
            text = doc['data.${leaf}'].value.toString();
          }
        }
        if (text != null && !text.isEmpty()) {
          try {
            emit(Long.parseLong(text));
          } catch (NumberFormatException e) {
            emit((long) Double.parseDouble(text));
          }
        }
      `;
}

export const METRIC_SERIES_RUNTIME_MAPPINGS: MappingRuntimeFields = {
  [METRIC_SERIES_BUCKET_RUNTIME_FIELD]: {
    type: 'date',
    script: {
      source: flattenedLeafScript(METRIC_SERIES_BUCKET_FIELD),
    },
  },
  [METRIC_SERIES_VALUE_RUNTIME_FIELD]: {
    type: 'long',
    script: {
      source: flattenedLeafScript(METRIC_SERIES_VALUE_FIELD),
    },
  },
};

export interface RuleEventsSignalFilterParams {
  spaceId: string;
  lookback: string;
  ruleIds?: string[];
  ruleUuid?: string;
}

/** Shared DSL filter for signal docs in {@link RULE_EVENTS_INDEX}. */
export function buildRuleEventsSignalFilter({
  spaceId,
  lookback,
  ruleIds,
  ruleUuid,
}: RuleEventsSignalFilterParams): QueryDslQueryContainer[] {
  const filter: QueryDslQueryContainer[] = [
    { term: { type: 'signal' } },
    { term: { space_id: spaceId } },
    { range: { '@timestamp': { gte: lookback } } },
  ];
  if (ruleUuid) {
    filter.push({ term: { 'rule.id': ruleUuid } });
  }
  if (ruleIds?.length) {
    filter.push({ terms: { 'rule.id': ruleIds } });
  }
  return filter;
}
