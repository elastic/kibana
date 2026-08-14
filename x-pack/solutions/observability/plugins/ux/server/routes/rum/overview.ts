/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { createUxServerRoute } from '../create_ux_server_route';
import { RUM_SESSION_SOURCE_INDEX } from '../../../common/session_replay';
import {
  durationToMs,
  emptyVitalAttribution,
  ranksFromPercentileRanks,
  type RumCountryRow,
  type RumOverviewResponse,
  type RumPageRow,
  type RumVitalSummary,
} from '../../../common/rum_app';
import { SAMPLE_SOURCE } from '../session_replay/list_sessions';
import { SESSION_ID_SCRIPT } from '../session_replay/session_id_script';
import {
  collectSessionSignals,
  countDeadAndErrorClicks,
  type OtelHit,
} from '../session_replay/session_attributes';
import { rumEsSearchOptions } from './es_retry';
import {
  BROWSER_SCRIPT,
  DOCUMENT_LOAD_FILTER,
  EXCEPTION_FILTER,
  OS_SCRIPT,
  PAGE_VIEW_FILTER,
  WEB_VITAL_FILTER,
  cardValue,
  facetFromScriptTerms,
  pagePathTerms,
  percentileValue,
  rumBaseFilters,
  rumListQueryCodec,
  sessionCardinality,
  termsBuckets,
} from './query';

const emptyVital = (): RumVitalSummary => ({ p75: null, ranks: null, samples: 0 });

const vitalFromBucket = (
  bucket:
    | { doc_count?: number; p75?: unknown; ranks?: { values?: Record<string, number | null> } }
    | undefined
): RumVitalSummary => {
  if (!bucket) {
    return emptyVital();
  }
  return {
    p75: percentileValue(bucket.p75),
    ranks: ranksFromPercentileRanks(bucket.ranks?.values),
    samples: bucket.doc_count ?? 0,
  };
};

export const getRumOverviewRoute = createUxServerRoute({
  endpoint: 'GET /internal/ux/rum/overview',
  options: { access: 'internal' },
  security: { authz: { requiredPrivileges: ['apm'] } },
  params: t.type({ query: rumListQueryCodec }),
  handler: async ({ context, params }): Promise<RumOverviewResponse> => {
    const { elasticsearch } = await context.core;
    const client = elasticsearch.client.asCurrentUser;
    const filters = rumBaseFilters(params.query);

    const [aggResult, sessionSample] = await Promise.all([
      client.search(
        {
          index: RUM_SESSION_SOURCE_INDEX,
          ignore_unavailable: true,
          allow_no_indices: true,
          size: 0,
          query: { bool: { filter: filters } },
          aggs: {
            sessions: sessionCardinality,
            page_views: { filter: PAGE_VIEW_FILTER },
            error_sessions: {
              filter: EXCEPTION_FILTER,
              aggs: { sessions: sessionCardinality },
            },
            load_duration: {
              filter: DOCUMENT_LOAD_FILTER,
              aggs: {
                p75_ns: { percentiles: { field: 'duration', percents: [75] } },
                p75_us: {
                  percentiles: { field: 'attributes.transaction.duration.us', percents: [75] },
                },
              },
            },
            vitals: {
              filter: WEB_VITAL_FILTER,
              aggs: {
                by_name: {
                  terms: { field: 'attributes.browser.web_vital.name', size: 10 },
                  aggs: {
                    p75: {
                      percentiles: { field: 'attributes.browser.web_vital.value', percents: [75] },
                    },
                    ranks_lcp: {
                      percentile_ranks: {
                        field: 'attributes.browser.web_vital.value',
                        values: [2500, 4000],
                      },
                    },
                    ranks_inp: {
                      percentile_ranks: {
                        field: 'attributes.browser.web_vital.value',
                        values: [200, 500],
                      },
                    },
                    ranks_cls: {
                      percentile_ranks: {
                        field: 'attributes.browser.web_vital.value',
                        values: [0.1, 0.25],
                      },
                    },
                    ranks_fcp: {
                      percentile_ranks: {
                        field: 'attributes.browser.web_vital.value',
                        values: [1800, 3000],
                      },
                    },
                  },
                },
              },
            },
            trends: {
              auto_date_histogram: { field: '@timestamp', buckets: 24 },
              aggs: {
                sessions: sessionCardinality,
                page_views: { filter: PAGE_VIEW_FILTER },
                errors: { filter: EXCEPTION_FILTER },
              },
            },
            top_pages: {
              ...pagePathTerms(8),
              aggs: {
                views: { filter: PAGE_VIEW_FILTER },
                errors: { filter: EXCEPTION_FILTER },
                lcp: {
                  filter: {
                    bool: {
                      filter: [
                        WEB_VITAL_FILTER,
                        { term: { 'attributes.browser.web_vital.name': 'lcp' } },
                      ],
                    },
                  },
                  aggs: {
                    p75: {
                      percentiles: { field: 'attributes.browser.web_vital.value', percents: [75] },
                    },
                  },
                },
                inp: {
                  filter: {
                    bool: {
                      filter: [
                        WEB_VITAL_FILTER,
                        { term: { 'attributes.browser.web_vital.name': 'inp' } },
                      ],
                    },
                  },
                  aggs: {
                    p75: {
                      percentiles: { field: 'attributes.browser.web_vital.value', percents: [75] },
                    },
                  },
                },
                cls: {
                  filter: {
                    bool: {
                      filter: [
                        WEB_VITAL_FILTER,
                        { term: { 'attributes.browser.web_vital.name': 'cls' } },
                      ],
                    },
                  },
                  aggs: {
                    p75: {
                      percentiles: { field: 'attributes.browser.web_vital.value', percents: [75] },
                    },
                  },
                },
                load: {
                  filter: DOCUMENT_LOAD_FILTER,
                  aggs: {
                    avg_ns: { avg: { field: 'duration' } },
                    avg_us: { avg: { field: 'attributes.transaction.duration.us' } },
                  },
                },
              },
            },
            browsers: {
              terms: { script: { source: BROWSER_SCRIPT, lang: 'painless' }, size: 8, exclude: '' },
            },
            os: {
              terms: { script: { source: OS_SCRIPT, lang: 'painless' }, size: 8, exclude: '' },
            },
            countries: {
              terms: { field: 'client.geo.country_iso_code', size: 12, missing: '' },
              aggs: {
                country_name: {
                  terms: { field: 'client.geo.country_name', size: 1 },
                },
                views: { filter: PAGE_VIEW_FILTER },
                errors: { filter: EXCEPTION_FILTER },
                sessions: sessionCardinality,
                lcp: {
                  filter: {
                    bool: {
                      filter: [
                        WEB_VITAL_FILTER,
                        { term: { 'attributes.browser.web_vital.name': 'lcp' } },
                      ],
                    },
                  },
                  aggs: {
                    p75: {
                      percentiles: { field: 'attributes.browser.web_vital.value', percents: [75] },
                    },
                  },
                },
              },
            },
          },
        },
        rumEsSearchOptions
      ),
      client.search(
        {
          index: RUM_SESSION_SOURCE_INDEX,
          ignore_unavailable: true,
          allow_no_indices: true,
          size: 0,
          query: { bool: { filter: filters } },
          aggs: {
            sessions: {
              terms: {
                script: { source: SESSION_ID_SCRIPT, lang: 'painless' },
                size: 200,
                exclude: '',
              },
              aggs: {
                error_count: { filter: EXCEPTION_FILTER },
                sample: {
                  top_hits: {
                    size: 80,
                    sort: [{ '@timestamp': 'asc' as const }],
                    _source: SAMPLE_SOURCE,
                  },
                },
              },
            },
          },
        },
        rumEsSearchOptions
      ),
    ]);

    const aggs = (aggResult.aggregations ?? {}) as Record<string, unknown>;
    const sessions = cardValue(aggs.sessions);
    const pageViews = (aggs.page_views as { doc_count?: number } | undefined)?.doc_count ?? 0;
    const errorSessions = cardValue(
      (aggs.error_sessions as { sessions?: unknown } | undefined)?.sessions
    );
    const load = aggs.load_duration as { p75_ns?: unknown; p75_us?: unknown } | undefined;
    const p75LoadMs =
      durationToMs(percentileValue(load?.p75_ns)) ?? durationToMs(percentileValue(load?.p75_us));

    const vitalBuckets = termsBuckets((aggs.vitals as { by_name?: unknown } | undefined)?.by_name);
    const vitalNamed = (name: string) =>
      vitalBuckets.find((bucket) => String(bucket.key).toLowerCase() === name) as
        | {
            doc_count?: number;
            p75?: unknown;
            ranks_lcp?: { values?: Record<string, number | null> };
            ranks_inp?: { values?: Record<string, number | null> };
            ranks_cls?: { values?: Record<string, number | null> };
            ranks_fcp?: { values?: Record<string, number | null> };
          }
        | undefined;

    const lcpBucket = vitalNamed('lcp');
    const inpBucket = vitalNamed('inp');
    const clsBucket = vitalNamed('cls');
    const fcpBucket = vitalNamed('fcp');

    const topPages: RumPageRow[] = termsBuckets(aggs.top_pages).map((bucket) => {
      const loadAgg = bucket.load as
        | { avg_ns?: { value?: number | null }; avg_us?: { value?: number | null } }
        | undefined;
      return {
        path: String(bucket.key),
        views: (bucket.views as { doc_count?: number } | undefined)?.doc_count ?? 0,
        errorCount: (bucket.errors as { doc_count?: number } | undefined)?.doc_count ?? 0,
        p75Lcp: percentileValue((bucket.lcp as { p75?: unknown } | undefined)?.p75),
        p75Inp: percentileValue((bucket.inp as { p75?: unknown } | undefined)?.p75),
        p75Cls: percentileValue((bucket.cls as { p75?: unknown } | undefined)?.p75),
        avgDurationMs:
          durationToMs(loadAgg?.avg_ns?.value ?? undefined) ??
          durationToMs(loadAgg?.avg_us?.value ?? undefined),
        attribution: emptyVitalAttribution(),
        resources: [],
      };
    });

    const countries: RumCountryRow[] = termsBuckets(aggs.countries)
      .filter((bucket) => String(bucket.key).length > 0)
      .map((bucket) => {
        const nameBucket = termsBuckets(bucket.country_name)[0];
        return {
          isoCode: String(bucket.key),
          name: nameBucket ? String(nameBucket.key) : String(bucket.key),
          pageViews: (bucket.views as { doc_count?: number } | undefined)?.doc_count ?? 0,
          sessions: cardValue(bucket.sessions),
          errorCount: (bucket.errors as { doc_count?: number } | undefined)?.doc_count ?? 0,
          p75Lcp: percentileValue((bucket.lcp as { p75?: unknown } | undefined)?.p75),
        };
      })
      .sort((a, b) => b.pageViews - a.pageViews || b.sessions - a.sessions);

    const trendBuckets = termsBuckets(aggs.trends);
    const trends = trendBuckets.map((bucket) => ({
      timestamp:
        (bucket as { key_as_string?: string }).key_as_string ??
        new Date(Number(bucket.key)).toISOString(),
      sessions: cardValue(bucket.sessions),
      pageViews: (bucket.page_views as { doc_count?: number } | undefined)?.doc_count ?? 0,
      errors: (bucket.errors as { doc_count?: number } | undefined)?.doc_count ?? 0,
    }));

    const sampleBuckets =
      (
        sessionSample.aggregations as {
          sessions?: {
            buckets?: Array<{
              key: string;
              error_count?: { doc_count: number };
              sample?: { hits?: { hits?: OtelHit[] } };
            }>;
          };
        }
      )?.sessions?.buckets ?? [];

    let rageSessions = 0;
    let deadClickSessions = 0;
    let rageClicks = 0;
    let deadClicks = 0;
    let errorClicks = 0;
    for (const bucket of sampleBuckets) {
      if (!bucket.key) {
        continue;
      }
      const hits = bucket.sample?.hits?.hits ?? [];
      const { clicks } = collectSessionSignals(hits);
      const { dead, errorClicks: errClicks, rage } = countDeadAndErrorClicks(hits, clicks);
      if (rage > 0) {
        rageSessions += 1;
        rageClicks += rage;
      }
      if (dead > 0) {
        deadClickSessions += 1;
        deadClicks += dead;
      }
      errorClicks += errClicks;
    }

    return {
      kpis: {
        sessions,
        pageViews,
        errorSessions,
        errorRate: sessions > 0 ? errorSessions / sessions : 0,
        p75LoadMs,
        p75Inp: percentileValue(inpBucket?.p75 ?? undefined),
      },
      vitals: {
        lcp: {
          ...vitalFromBucket(lcpBucket),
          ranks: ranksFromPercentileRanks(lcpBucket?.ranks_lcp?.values),
        },
        inp: {
          ...vitalFromBucket(inpBucket),
          ranks: ranksFromPercentileRanks(inpBucket?.ranks_inp?.values),
        },
        cls: {
          ...vitalFromBucket(clsBucket),
          ranks: ranksFromPercentileRanks(clsBucket?.ranks_cls?.values),
        },
        fcp: {
          ...vitalFromBucket(fcpBucket),
          ranks: ranksFromPercentileRanks(fcpBucket?.ranks_fcp?.values),
        },
      },
      trends,
      frustration: {
        rageSessions,
        errorSessions,
        deadClickSessions,
        rageClicks,
        deadClicks,
        errorClicks,
      },
      topPages,
      browsers: facetFromScriptTerms(aggs.browsers),
      os: facetFromScriptTerms(aggs.os),
      countries,
    };
  },
});
