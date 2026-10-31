/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import * as t from 'io-ts';
import { createUxServerRoute } from '../create_ux_server_route';
import { RUM_SESSION_SOURCE_INDEX } from '../../../common/session_replay';
import {
  applySessionIndexTrendSessions,
  durationToMs,
  emptyVitalAttribution,
  mergeRumPageRows,
  ranksFromPercentileRanks,
  mergeRumCountries,
  type RumCountryRow,
  type RumOverviewResponse,
  type RumPageRow,
  type RumVitalSummary,
} from '../../../common/rum_app';
import { groupingFromSettings } from '../../../common/session_replay_settings';
import { rangeSpanMs } from '../../../common/rum_daily';
import { canUseSessionIndex, rangeIncludesOpenTail } from '../../../common/rum_sessions';
import { readSessionReplaySettings } from '../session_replay/settings';
import { getRumAnalyticsStatus } from '../../transforms/rum_sessions';
import { resolveRumDaily } from '../../transforms/rum_daily';
import { queryDailyOverview } from '../../transforms/rum_daily_query';
import {
  overlaySessionTrendSessions,
  querySessionIndexFilters,
  querySessionIndexKpis,
  sessionIndexParamsFromQuery,
} from '../../transforms/rum_sessions_query';
import { resolveNewTailSessionIds } from '../../transforms/rum_sessions_tail';
import { rumEsSearchOptions } from './es_retry';
import { getRumSearchClient } from '../../lib/rum_search_client';
import {
  BROWSER_SCRIPT,
  DOCUMENT_LOAD_FILTER,
  EXCEPTION_FILTER,
  OS_SCRIPT,
  PAGE_VIEW_FILTER,
  WEB_VITAL_FILTER,
  cardValue,
  facetFromScriptTerms,
  frustrationEventFilter,
  pagePathTerms,
  percentileValue,
  rumBaseFilters,
  rumListQueryCodec,
  sessionCardinality,
  termsBuckets,
} from './query';

const overlaySessionIndex = async (
  result: RumOverviewResponse,
  client: ElasticsearchClient,
  query: {
    rangeFrom?: string;
    rangeTo?: string;
    serviceName?: string;
    browser?: string;
    os?: string;
    location?: string;
    pageUrl?: string;
    user?: string;
    frustration?: string;
    breakpoint?: string;
    analyticsMode?: string;
    kuery?: string;
    connection?: string;
    device?: string;
    errorGroup?: string;
  },
  installed: boolean,
  watermark?: string | null,
  lookbackDays?: number
): Promise<RumOverviewResponse> => {
  if (
    !canUseSessionIndex({
      installed,
      analyticsMode: query.analyticsMode,
      rangeMs: rangeSpanMs(query.rangeFrom, query.rangeTo),
      kuery: query.kuery,
      lookbackDays,
    })
  ) {
    return result;
  }
  const sessionParams = sessionIndexParamsFromQuery(query, watermark);
  const tailPromise =
    watermark && rangeIncludesOpenTail(query.rangeTo, watermark)
      ? resolveNewTailSessionIds({
          client,
          rangeFrom: watermark,
          rangeTo: query.rangeTo || 'now',
          serviceName: query.serviceName,
          kuery: query.kuery,
        })
      : Promise.resolve([]);
  const [slice, facets, tailIds] = await Promise.all([
    querySessionIndexKpis({
      client,
      ...sessionParams,
    }),
    querySessionIndexFilters({
      client,
      ...sessionParams,
    }),
    tailPromise,
  ]);
  const sessions = slice.sessions + tailIds.length;
  return {
    ...result,
    trends: applySessionIndexTrendSessions(result.trends, slice.trends),
    kpis: {
      ...result.kpis,
      sessions,
      pageViews: slice.pageViews,
      errorSessions: slice.errorSessions,
      errorRate: sessions > 0 ? slice.errorSessions / sessions : 0,
      bounceRate: slice.bounceRate,
    },
    frustration: {
      ...result.frustration,
      rageSessions: slice.rageSessions,
      errorSessions: slice.errorSessions,
      deadClickSessions: slice.deadSessions,
      rageClicks: slice.rageClicks,
      deadClicks: slice.deadClicks,
    },
    browsers: facets.browsers.length > 0 ? facets.browsers : result.browsers,
    os: facets.os.length > 0 ? facets.os : result.os,
    countries: mergeRumCountries(result.countries, facets.countries),
  };
};

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
  handler: async ({ context, core, params, request }): Promise<RumOverviewResponse> => {
    const { elasticsearch } = await context.core;
    const client = await getRumSearchClient({ context, core, request });
    const status = await getRumAnalyticsStatus(elasticsearch.client.asInternalUser);
    const daily = resolveRumDaily({
      pagesDaily: status.pagesDaily,
      serviceDaily: status.serviceDaily,
      browserDaily: status.browserDaily,
      analyticsMode: params.query.analyticsMode,
      rangeFrom: params.query.rangeFrom,
      rangeTo: params.query.rangeTo,
      browser: params.query.browser,
      os: params.query.os,
      location: params.query.location,
      user: params.query.user,
      kuery: params.query.kuery,
      frustration: params.query.frustration,
      breakpoint: params.query.breakpoint,
      connection: params.query.connection,
      device: params.query.device,
      errorGroup: params.query.errorGroup,
      pageUrl: params.query.pageUrl,
    });
    if (daily.usePages || daily.useService || daily.useBrowser) {
      const coreStart = await core.start();
      const settings = await readSessionReplaySettings(
        coreStart.savedObjects.createInternalRepository()
      );
      const result = await queryDailyOverview({
        client,
        rangeFrom: params.query.rangeFrom || 'now-24h',
        rangeTo: params.query.rangeTo || 'now',
        serviceName: params.query.serviceName,
        pageUrl: params.query.pageUrl,
        browser: params.query.browser,
        usePages: daily.usePages,
        useService: daily.useService,
        useBrowser: daily.useBrowser,
        pagesWatermark: status.pagesDaily?.watermark,
        serviceWatermark: status.serviceDaily?.watermark,
        browserWatermark: status.browserDaily?.watermark,
        uniqueFromRaw: true,
        includeBots: params.query.includeBots,
        botUa: params.query.botUa,
      });
      const withPages = {
        ...result,
        topPages: mergeRumPageRows(result.topPages, groupingFromSettings(settings)),
      };
      const sessionParams = sessionIndexParamsFromQuery(params.query, status.watermark);
      const destCountries = status.installed
        ? (await querySessionIndexFilters({ client, ...sessionParams })).countries
        : [];
      const withDestCountries = {
        ...withPages,
        countries: mergeRumCountries(withPages.countries, destCountries),
      };
      if (
        !canUseSessionIndex({
          installed: status.installed,
          analyticsMode: params.query.analyticsMode,
          rangeMs: rangeSpanMs(params.query.rangeFrom, params.query.rangeTo),
          kuery: params.query.kuery,
          lookbackDays: status.sourceLookbackDays,
        })
      ) {
        return withDestCountries;
      }
      return {
        ...withDestCountries,
        trends: await overlaySessionTrendSessions({
          client,
          trends: withDestCountries.trends,
          align: '1d',
          ...sessionParams,
        }),
      };
    }
    const filters = rumBaseFilters(params.query);

    const aggResult = await client.search(
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
          rage_clicks: { filter: frustrationEventFilter('rage_click') },
          dead_clicks: { filter: frustrationEventFilter('dead_click') },
          error_clicks: { filter: frustrationEventFilter('error_click') },
          rage_sessions: {
            filter: frustrationEventFilter('rage_click'),
            aggs: { sessions: sessionCardinality },
          },
          dead_sessions: {
            filter: frustrationEventFilter('dead_click'),
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
    );

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
        sessionCount: 0,
        rageClicks: 0,
        deadClicks: 0,
        trend: [],
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

    const rageSessions = cardValue(
      (aggs.rage_sessions as { sessions?: unknown } | undefined)?.sessions
    );
    const deadClickSessions = cardValue(
      (aggs.dead_sessions as { sessions?: unknown } | undefined)?.sessions
    );
    const rageClicks = (aggs.rage_clicks as { doc_count?: number } | undefined)?.doc_count ?? 0;
    const deadClicks = (aggs.dead_clicks as { doc_count?: number } | undefined)?.doc_count ?? 0;
    const errorClicks = (aggs.error_clicks as { doc_count?: number } | undefined)?.doc_count ?? 0;

    const sessionParams = sessionIndexParamsFromQuery(params.query, status.watermark);
    const destCountries = status.installed
      ? (await querySessionIndexFilters({ client, ...sessionParams })).countries
      : [];

    return overlaySessionIndex(
      {
        kpis: {
          sessions,
          pageViews,
          errorSessions,
          errorRate: sessions > 0 ? errorSessions / sessions : 0,
          bounceRate: null,
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
        countries: mergeRumCountries(countries, destCountries),
      },
      client,
      params.query,
      status.installed,
      status.watermark,
      status.sourceLookbackDays
    );
  },
});
