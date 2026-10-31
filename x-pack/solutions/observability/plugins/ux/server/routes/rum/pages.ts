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
  durationToMs,
  mergeRumPageRows,
  summarizePagesKpis,
  type RumPageRow,
  type RumPagesResponse,
  type RumResourceRow,
  type RumVitalAttribution,
} from '../../../common/rum_app';
import type { RumBackendCall } from '../../../common/rum_backend';
import { groupingFromSettings } from '../../../common/session_replay_settings';
import { getRumAnalyticsStatus } from '../../transforms/rum_sessions';
import { resolveRumDaily } from '../../transforms/rum_daily';
import { queryDailyPages } from '../../transforms/rum_daily_query';
import { rumEsSearchOptions } from './es_retry';
import { getRumSearchClient } from '../../lib/rum_search_client';
import { readSessionReplaySettings } from '../session_replay/settings';
import {
  DOCUMENT_LOAD_FILTER,
  EXCEPTION_FILTER,
  EXTERNAL_HTTP_FILTER,
  HTTP_FAIL_FILTER,
  HTTP_ORIGIN_SCRIPT,
  PAGE_VIEW_FILTER,
  WEB_VITAL_FILTER,
  boundedString,
  cardValue,
  frustrationEventFilter,
  pagePathTerms,
  percentileValue,
  rumBaseFilters,
  rumListQueryCodec,
  sessionCardinality,
  termsBuckets,
} from './query';

const pageVitals = (name: 'lcp' | 'inp' | 'cls') => ({
  filter: {
    bool: {
      filter: [WEB_VITAL_FILTER, { term: { 'attributes.browser.web_vital.name': name } }],
    },
  },
  aggs: {
    p75: { percentiles: { field: 'attributes.browser.web_vital.value', percents: [75] } },
  },
});

const attrScript = (field: string): string => `
  if (doc.containsKey('${field}') && doc['${field}'].size() > 0) {
    return doc['${field}'].value.toString();
  }
  return '';
`;

const attrTerms = (field: string, size = 1) => ({
  terms: { script: { source: attrScript(field), lang: 'painless' }, size, exclude: '' },
});

const avgField = (field: string) => ({ avg: { field } });

const RESOURCE_URL_SCRIPT = `
  if (doc.containsKey('attributes.url.full') && doc['attributes.url.full'].size() > 0) {
    return doc['attributes.url.full'].value.toString();
  }
  if (doc.containsKey('attributes.http.url') && doc['attributes.http.url'].size() > 0) {
    return doc['attributes.http.url'].value.toString();
  }
  return '';
`;

const RESOURCE_FILTER = {
  bool: {
    should: [
      { term: { name: 'resourceFetch' } },
      { exists: { field: 'attributes.http.render_blocking_status' } },
      { exists: { field: 'attributes.http.queue.duration' } },
    ],
    minimum_should_match: 1,
  },
};

const topString = (agg: unknown): string | null => {
  const key = termsBuckets(agg)[0]?.key;
  return key != null && String(key).length > 0 ? String(key) : null;
};

const avgMs = (agg: unknown): number | null => {
  const value = (agg as { value?: number | null } | undefined)?.value;
  return durationToMs(value ?? undefined);
};

const attributionFromBucket = (bucket: Record<string, unknown>): RumVitalAttribution => ({
  lcpElement: topString(bucket.lcp_element),
  lcpUrl: topString(bucket.lcp_url),
  lcpTtfb: avgMs(bucket.lcp_ttfb),
  lcpResourceLoadDelay: avgMs(bucket.lcp_rld),
  lcpResourceLoadDuration: avgMs(bucket.lcp_rldur),
  lcpElementRenderDelay: avgMs(bucket.lcp_erd),
  inpTarget: topString(bucket.inp_target),
  inpType: topString(bucket.inp_type),
  inpInputDelay: avgMs(bucket.inp_input),
  inpProcessing: avgMs(bucket.inp_proc),
  inpPresentation: avgMs(bucket.inp_pres),
  clsSource: topString(bucket.cls_source),
});

const resourcesFromBucket = (bucket: Record<string, unknown>): RumResourceRow[] => {
  const resourcesAgg = bucket.resources as { by_url?: unknown } | undefined;
  return termsBuckets(resourcesAgg?.by_url)
    .map((row) => ({
      url: String(row.key),
      count: row.doc_count,
      avgDurationMs:
        durationToMs((row.avg_ns as { value?: number | null } | undefined)?.value ?? undefined) ??
        durationToMs((row.avg_us as { value?: number | null } | undefined)?.value ?? undefined),
      renderBlocking: topString(row.blocking),
      status: (() => {
        const raw = topString(row.status);
        const n = raw ? Number(raw) : NaN;
        return Number.isFinite(n) ? n : null;
      })(),
      dnsMs: avgMs(row.dns),
      tcpMs: avgMs(row.tcp),
      tlsMs: avgMs(row.tls),
      requestMs: avgMs(row.request),
      responseMs: avgMs(row.response),
      queueMs: avgMs(row.queue),
    }))
    .filter((row) => row.url.length > 0);
};

const backendCallsFromBucket = (bucket: Record<string, unknown>): RumBackendCall[] => {
  const httpAgg = bucket.backend as { by_origin?: unknown } | undefined;
  return termsBuckets(httpAgg?.by_origin)
    .map((row) => ({
      origin: String(row.key),
      count: row.doc_count,
      failCount: (row.fails as { doc_count?: number } | undefined)?.doc_count ?? 0,
      avgDurationMs:
        durationToMs((row.avg_ns as { value?: number | null } | undefined)?.value ?? undefined) ??
        durationToMs((row.avg_us as { value?: number | null } | undefined)?.value ?? undefined),
      sampleTraceId: topString(row.trace),
      serviceName: topString(row.peer),
    }))
    .filter((row) => row.origin.length > 0);
};

const BACKEND_CALLS_AGG = {
  filter: EXTERNAL_HTTP_FILTER,
  aggs: {
    by_origin: {
      terms: {
        script: { source: HTTP_ORIGIN_SCRIPT, lang: 'painless' },
        size: 8,
        exclude: '',
      },
      aggs: {
        avg_ns: { avg: { field: 'duration' } },
        avg_us: { avg: { field: 'attributes.transaction.duration.us' } },
        fails: { filter: HTTP_FAIL_FILTER },
        trace: attrTerms('trace.id'),
        peer: attrTerms('attributes.peer.service'),
      },
    },
  },
};

export const queryRawPageDetail = async ({
  client,
  query,
}: {
  client: ElasticsearchClient;
  query: t.TypeOf<typeof rumListQueryCodec>;
}): Promise<{
  attribution: RumVitalAttribution;
  resources: RumResourceRow[];
  backendCalls: RumBackendCall[];
}> => {
  const result = await client.search(
    {
      index: RUM_SESSION_SOURCE_INDEX,
      ignore_unavailable: true,
      allow_no_indices: true,
      size: 0,
      query: { bool: { filter: rumBaseFilters(query) } },
      aggs: {
        lcp_element: attrTerms('attributes.browser.web_vital.lcp.element'),
        lcp_url: attrTerms('attributes.browser.web_vital.lcp.url'),
        lcp_ttfb: avgField('attributes.browser.web_vital.lcp.ttfb'),
        lcp_rld: avgField('attributes.browser.web_vital.lcp.resource_load_delay'),
        lcp_rldur: avgField('attributes.browser.web_vital.lcp.resource_load_duration'),
        lcp_erd: avgField('attributes.browser.web_vital.lcp.element_render_delay'),
        inp_target: attrTerms('attributes.browser.web_vital.inp.target'),
        inp_type: attrTerms('attributes.browser.web_vital.inp.type'),
        inp_input: avgField('attributes.browser.web_vital.inp.input_delay'),
        inp_proc: avgField('attributes.browser.web_vital.inp.processing_duration'),
        inp_pres: avgField('attributes.browser.web_vital.inp.presentation_delay'),
        cls_source: attrTerms('attributes.browser.web_vital.cls.source'),
        resources: {
          filter: RESOURCE_FILTER,
          aggs: {
            by_url: {
              terms: {
                script: { source: RESOURCE_URL_SCRIPT, lang: 'painless' },
                size: 8,
                exclude: '',
              },
              aggs: {
                avg_ns: { avg: { field: 'duration' } },
                avg_us: { avg: { field: 'attributes.transaction.duration.us' } },
                blocking: attrTerms('attributes.http.render_blocking_status'),
                status: attrTerms('attributes.http.response.status_code'),
                dns: avgField('attributes.http.dns.duration'),
                tcp: avgField('attributes.http.tcp.duration'),
                tls: avgField('attributes.http.tls.duration'),
                request: avgField('attributes.http.request.duration'),
                response: avgField('attributes.http.response.duration'),
                queue: avgField('attributes.http.queue.duration'),
              },
            },
          },
        },
        backend: BACKEND_CALLS_AGG,
      },
    },
    rumEsSearchOptions
  );
  const aggs = (result.aggregations ?? {}) as Record<string, unknown>;
  return {
    attribution: attributionFromBucket(aggs),
    resources: resourcesFromBucket(aggs),
    backendCalls: backendCallsFromBucket(aggs),
  };
};

export const getRumPageDetailRoute = createUxServerRoute({
  endpoint: 'GET /internal/ux/rum/pages/detail',
  options: { access: 'internal' },
  security: { authz: { requiredPrivileges: ['apm'] } },
  params: t.type({
    query: t.intersection([rumListQueryCodec, t.type({ pageUrl: boundedString(512) })]),
  }),
  handler: async ({ context, core, params, request }) => {
    return queryRawPageDetail({
      client: await getRumSearchClient({ context, core, request }),
      query: params.query,
    });
  },
});

export const getRumPagesRoute = createUxServerRoute({
  endpoint: 'GET /internal/ux/rum/pages',
  options: { access: 'internal' },
  security: { authz: { requiredPrivileges: ['apm'] } },
  params: t.type({ query: rumListQueryCodec }),
  handler: async ({ context, core, params, request }): Promise<RumPagesResponse> => {
    const { elasticsearch } = await context.core;
    const client = await getRumSearchClient({ context, core, request });
    const coreStart = await core.start();
    const settings = await readSessionReplaySettings(
      coreStart.savedObjects.createInternalRepository()
    );
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
    if (daily.usePages) {
      const result = await queryDailyPages({
        client,
        rangeFrom: params.query.rangeFrom || 'now-24h',
        rangeTo: params.query.rangeTo || 'now',
        serviceName: params.query.serviceName,
        pageUrl: params.query.pageUrl,
        watermark: status.pagesDaily?.watermark,
        serviceWatermark: status.serviceDaily?.watermark,
        useService: daily.useService,
        includeBots: params.query.includeBots,
        botUa: params.query.botUa,
      });
      const pages = mergeRumPageRows(result.pages, groupingFromSettings(settings));
      return {
        pages,
        kpis: {
          ...summarizePagesKpis(pages, result.kpis.sessions),
          views: result.kpis.views,
        },
      };
    }

    const result = await client.search({
      index: RUM_SESSION_SOURCE_INDEX,
      ignore_unavailable: true,
      allow_no_indices: true,
      size: 0,
      query: { bool: { filter: rumBaseFilters(params.query) } },
      aggs: {
        sessions: sessionCardinality,
        pages: {
          ...pagePathTerms(80),
          aggs: {
            views: { filter: PAGE_VIEW_FILTER },
            errors: { filter: EXCEPTION_FILTER },
            sessions: sessionCardinality,
            rage: { filter: frustrationEventFilter('rage_click') },
            dead: { filter: frustrationEventFilter('dead_click') },
            trend: {
              auto_date_histogram: { field: '@timestamp', buckets: 12 },
              aggs: { views: { filter: PAGE_VIEW_FILTER } },
            },
            lcp: pageVitals('lcp'),
            inp: pageVitals('inp'),
            cls: pageVitals('cls'),
            load: {
              filter: DOCUMENT_LOAD_FILTER,
              aggs: {
                avg_ns: { avg: { field: 'duration' } },
                avg_us: { avg: { field: 'attributes.transaction.duration.us' } },
              },
            },
            lcp_element: attrTerms('attributes.browser.web_vital.lcp.element'),
            lcp_url: attrTerms('attributes.browser.web_vital.lcp.url'),
            lcp_ttfb: avgField('attributes.browser.web_vital.lcp.ttfb'),
            lcp_rld: avgField('attributes.browser.web_vital.lcp.resource_load_delay'),
            lcp_rldur: avgField('attributes.browser.web_vital.lcp.resource_load_duration'),
            lcp_erd: avgField('attributes.browser.web_vital.lcp.element_render_delay'),
            inp_target: attrTerms('attributes.browser.web_vital.inp.target'),
            inp_type: attrTerms('attributes.browser.web_vital.inp.type'),
            inp_input: avgField('attributes.browser.web_vital.inp.input_delay'),
            inp_proc: avgField('attributes.browser.web_vital.inp.processing_duration'),
            inp_pres: avgField('attributes.browser.web_vital.inp.presentation_delay'),
            cls_source: attrTerms('attributes.browser.web_vital.cls.source'),
            resources: {
              filter: RESOURCE_FILTER,
              aggs: {
                by_url: {
                  terms: {
                    script: { source: RESOURCE_URL_SCRIPT, lang: 'painless' },
                    size: 8,
                    exclude: '',
                  },
                  aggs: {
                    avg_ns: { avg: { field: 'duration' } },
                    avg_us: { avg: { field: 'attributes.transaction.duration.us' } },
                    blocking: attrTerms('attributes.http.render_blocking_status'),
                    status: attrTerms('attributes.http.response.status_code'),
                    dns: avgField('attributes.http.dns.duration'),
                    tcp: avgField('attributes.http.tcp.duration'),
                    tls: avgField('attributes.http.tls.duration'),
                    request: avgField('attributes.http.request.duration'),
                    response: avgField('attributes.http.response.duration'),
                    queue: avgField('attributes.http.queue.duration'),
                  },
                },
              },
            },
          },
        },
      },
    });

    const pages: RumPageRow[] = termsBuckets(
      (result.aggregations as { pages?: unknown } | undefined)?.pages
    ).map((bucket) => {
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
        sessionCount: cardValue(bucket.sessions),
        rageClicks: (bucket.rage as { doc_count?: number } | undefined)?.doc_count ?? 0,
        deadClicks: (bucket.dead as { doc_count?: number } | undefined)?.doc_count ?? 0,
        trend: termsBuckets(
          (bucket.trend as { buckets?: unknown } | undefined) ?? bucket.trend
        ).map((point) => (point.views as { doc_count?: number } | undefined)?.doc_count ?? 0),
        attribution: attributionFromBucket(bucket),
        resources: resourcesFromBucket(bucket),
      };
    });

    const merged = mergeRumPageRows(pages, groupingFromSettings(settings));
    return {
      pages: merged,
      kpis: summarizePagesKpis(
        merged,
        cardValue((result.aggregations as { sessions?: unknown } | undefined)?.sessions)
      ),
    };
  },
});
