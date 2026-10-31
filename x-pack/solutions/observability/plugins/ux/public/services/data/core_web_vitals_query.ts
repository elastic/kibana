/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESSearchResponse, ESSearchRequest } from '@kbn/es-types';
import type { UXMetrics } from '@kbn/observability-shared-plugin/public';
import {
  TBT_FIELD,
  FCP_FIELD,
  CLS_FIELD,
  LCP_FIELD,
} from '../../../common/elasticsearch_fieldnames';
import { OTEL_WEB_VITAL_NAME, OTEL_WEB_VITAL_VALUE } from '../../../common/otel_rum';
import type { SetupUX, UxUIFilters } from '../../../typings/ui_filters';
import { getRumPageLoadTransactionsProjection } from './projections';
import { rumUrlWildcardFilter, rumWebVitalLogsFilter } from './rum_otel_filters';
import { rangeQuery } from './range_query';
import { getEsFilter } from './get_es_filter';

export const DEFAULT_RANKS = [100, 0, 0];

export const getRanksPercentages = (
  ranks?: Record<string, number | null> | Array<{ value?: number }>
) => {
  if (!Array.isArray(ranks)) return null;
  const ranksVal = ranks?.map(({ value }) => value?.toFixed(0) ?? 0) ?? [];
  return [
    Number(ranksVal?.[0]),
    Number(ranksVal?.[1]) - Number(ranksVal?.[0]),
    100 - Number(ranksVal?.[1]),
  ];
};

interface PercentileAggregation {
  values?: Record<string, number>;
}

interface PercentileRanksAggregation {
  values?: Array<{ value?: number }>;
}

interface CoreWebVitalsAggregations {
  classic?: {
    doc_count?: number;
    lcp?: PercentileAggregation;
    cls?: PercentileAggregation;
    tbt?: PercentileAggregation;
    fcp?: PercentileAggregation;
    lcpRanks?: PercentileRanksAggregation;
    clsRanks?: PercentileRanksAggregation;
    coreVitalPages?: { doc_count?: number };
  };
  otelVitals?: {
    doc_count?: number;
    byName?: {
      buckets?: Array<{
        key: string;
        doc_count?: number;
        value?: PercentileAggregation;
        ranks?: PercentileRanksAggregation;
        lcpRanks?: PercentileRanksAggregation;
        clsRanks?: PercentileRanksAggregation;
      }>;
    };
  };
  // legacy flat shape (kept for tests)
  lcp?: PercentileAggregation;
  cls?: PercentileAggregation;
  tbt?: PercentileAggregation;
  fcp?: PercentileAggregation;
  lcpRanks?: PercentileRanksAggregation;
  clsRanks?: PercentileRanksAggregation;
  coreVitalPages?: { doc_count?: number };
}

const otelVital = (
  byName: CoreWebVitalsAggregations['otelVitals'],
  name: string,
  pkey: string
): number | undefined => {
  const bucket = byName?.byName?.buckets?.find((b) => String(b.key).toLowerCase() === name);
  return bucket?.value?.values?.[pkey];
};

const otelRanks = (
  byName: CoreWebVitalsAggregations['otelVitals'],
  name: string
): Array<{ value?: number }> | undefined => {
  const bucket = byName?.byName?.buckets?.find((b) => String(b.key).toLowerCase() === name);
  if (name === 'cls') {
    return bucket?.clsRanks?.values ?? bucket?.ranks?.values;
  }
  return bucket?.lcpRanks?.values ?? bucket?.ranks?.values;
};

export function transformCoreWebVitalsResponse<T>(
  response?: ESSearchResponse<
    T,
    ReturnType<typeof coreWebVitalsQuery>,
    { restTotalHitsAsInt: false }
  >,
  percentile = PERCENTILE_DEFAULT
): UXMetrics | undefined {
  if (!response) return response;
  const aggs = (response.aggregations ?? {}) as CoreWebVitalsAggregations;
  const classic = aggs.classic;
  const otel = aggs.otelVitals;
  const pkey = percentile.toFixed(1);

  const classicPages = classic?.coreVitalPages?.doc_count ?? classic?.doc_count ?? 0;
  const otelPages = otel?.doc_count ?? 0;
  const hasClassicVitals =
    classicPages > 0 &&
    Boolean(
      classic?.lcp?.values?.[pkey] ?? classic?.fcp?.values?.[pkey] ?? classic?.cls?.values?.[pkey]
    );
  const hasOtelVitals = otelPages > 0;

  // Prefer classic RUM vitals when they actually have values; otherwise EDOT Browser logs.
  if (hasClassicVitals || !hasOtelVitals) {
    const lcp = classic?.lcp ?? aggs.lcp;
    const cls = classic?.cls ?? aggs.cls;
    const tbt = classic?.tbt ?? aggs.tbt;
    const fcp = classic?.fcp ?? aggs.fcp;
    const lcpRanks = classic?.lcpRanks ?? aggs.lcpRanks;
    const clsRanks = classic?.clsRanks ?? aggs.clsRanks;
    const coreVitalPages = classic?.coreVitalPages ?? aggs.coreVitalPages;

    return {
      coreVitalPages: coreVitalPages?.doc_count ?? classicPages,
      cls: cls?.values?.[pkey] ?? null,
      lcp: lcp?.values?.[pkey],
      tbt: tbt?.values?.[pkey] ?? 0,
      fcp: fcp?.values?.[pkey],
      lcpRanks: lcp?.values?.[pkey]
        ? getRanksPercentages(lcpRanks?.values) ?? DEFAULT_RANKS
        : DEFAULT_RANKS,
      clsRanks: cls?.values?.[pkey]
        ? getRanksPercentages(clsRanks?.values) ?? DEFAULT_RANKS
        : DEFAULT_RANKS,
    };
  }

  const lcp = otelVital(otel, 'lcp', pkey);
  const fcp = otelVital(otel, 'fcp', pkey);
  const cls = otelVital(otel, 'cls', pkey);
  const lcpPages =
    otel?.byName?.buckets?.find((b) => String(b.key).toLowerCase() === 'lcp')?.doc_count ?? 0;

  return {
    coreVitalPages: lcpPages || otelPages,
    cls: cls ?? null,
    lcp,
    tbt: 0, // not emitted by EDOT Browser
    fcp,
    lcpRanks: lcp ? getRanksPercentages(otelRanks(otel, 'lcp')) ?? DEFAULT_RANKS : DEFAULT_RANKS,
    clsRanks: cls ? getRanksPercentages(otelRanks(otel, 'cls')) ?? DEFAULT_RANKS : DEFAULT_RANKS,
  };
}

export const PERCENTILE_DEFAULT = 50;

export function coreWebVitalsQuery(
  start: number,
  end: number,
  urlQuery?: string,
  uiFilters?: UxUIFilters,
  percentile = PERCENTILE_DEFAULT
): Omit<ESSearchRequest, 'index'> {
  const setup: SetupUX = { uiFilters: uiFilters ?? {} };

  const projection = getRumPageLoadTransactionsProjection({
    setup,
    urlQuery,
    checkFetchStartFieldExists: false,
    start,
    end,
  });

  const otelFilters = [
    ...rangeQuery(start, end),
    rumWebVitalLogsFilter(),
    ...(urlQuery ? [rumUrlWildcardFilter(urlQuery)] : []),
    ...getEsFilter(uiFilters ?? {}),
  ];

  // Do not merge this query onto the page-load projection: lodash merge keeps
  // projection.bool.filter, which ANDs documentLoad and drops web-vital logs.
  const params: ESSearchRequest = {
    size: 0,
    query: {
      bool: {
        should: [
          { bool: { filter: [...projection.query.bool.filter] } },
          { bool: { filter: otelFilters } },
        ],
        minimum_should_match: 1,
        must_not: [...projection.query.bool.must_not],
      },
    },
    aggs: {
      classic: {
        filter: {
          bool: {
            filter: [
              { term: { 'processor.event': 'transaction' } },
              { term: { 'transaction.type': 'page-load' } },
            ],
          },
        },
        aggs: {
          coreVitalPages: {
            filter: {
              exists: {
                field: 'transaction.experience',
              },
            },
          },
          lcp: {
            percentiles: {
              field: LCP_FIELD,
              percents: [percentile],
            },
          },
          cls: {
            percentiles: {
              field: CLS_FIELD,
              percents: [percentile],
            },
          },
          tbt: {
            percentiles: {
              field: TBT_FIELD,
              percents: [percentile],
            },
          },
          fcp: {
            percentiles: {
              field: FCP_FIELD,
              percents: [percentile],
            },
          },
          lcpRanks: {
            percentile_ranks: {
              field: LCP_FIELD,
              values: [2500, 4000],
              keyed: false,
            },
          },
          clsRanks: {
            percentile_ranks: {
              field: CLS_FIELD,
              values: [0.1, 0.25],
              keyed: false,
            },
          },
        },
      },
      otelVitals: {
        filter: rumWebVitalLogsFilter(),
        aggs: {
          byName: {
            terms: {
              field: OTEL_WEB_VITAL_NAME,
              size: 10,
            },
            aggs: {
              value: {
                percentiles: {
                  field: OTEL_WEB_VITAL_VALUE,
                  percents: [percentile],
                },
              },
              lcpRanks: {
                percentile_ranks: {
                  field: OTEL_WEB_VITAL_VALUE,
                  values: [2500, 4000],
                  keyed: false,
                },
              },
              clsRanks: {
                percentile_ranks: {
                  field: OTEL_WEB_VITAL_VALUE,
                  values: [0.1, 0.25],
                  keyed: false,
                },
              },
            },
          },
        },
      },
    },
  };
  return params;
}
