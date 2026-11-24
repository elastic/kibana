/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import {
  createTracedEsClientMock,
  esqlResponse,
} from '../../../lib/create_digital_experience_traced_es_client.test_helpers';
import { getOtelOverviewKpis } from './get_otel_overview_kpis';

const HOUR = 60 * 60 * 1000;

const CURRENT_ROW = {
  page_loads: 120,
  load_time: 1800,
  load_time_samples: 100,
  js_errors: 6,
  http_requests: 50,
  failed_http_requests: 5,
  request_duration: 250_000_000,
  sessions: 40,
  sessions_with_errors: 4,
};

const PREVIOUS_ROW = {
  page_loads: 100,
  load_time: 2000,
  load_time_samples: 90,
  js_errors: 3,
  http_requests: 40,
  failed_http_requests: 2,
  request_duration: 200_000_000,
  sessions: 32,
  sessions_with_errors: 2,
};

describe('getOtelOverviewKpis', () => {
  it('compares each KPI with the period of equal length before', async () => {
    const { client, esClient } = createTracedEsClientMock();
    client.esql.query
      .mockResolvedValueOnce(esqlResponse([CURRENT_ROW]))
      .mockResolvedValueOnce(esqlResponse([PREVIOUS_ROW]));

    const kpis = await getOtelOverviewKpis({
      esClient,
      serviceName: 'storefront-web',
      start: 2 * HOUR,
      end: 3 * HOUR,
    });

    expect(kpis.percentile).toBe(75);
    expect(kpis.sessions).toEqual({ value: 40, previous: 32, delta: 8 });
    expect(kpis.errorFreeSessions.value).toBeCloseTo(0.9);
    expect(kpis.errorFreeSessions.previous).toBeCloseTo(0.9375);
    expect(kpis.pageLoads).toEqual({ value: 120, previous: 100, delta: 20 });
    expect(kpis.loadTime).toEqual({ value: 1800, previous: 2000, delta: -200 });
    expect(kpis.jsErrors).toEqual({ value: 6, previous: 3, delta: 3 });
    expect(kpis.failedHttpRequests.value).toBeCloseTo(0.1);
    expect(kpis.failedHttpRequests.previous).toBeCloseTo(0.05);
    // Span durations are in nanoseconds.
    expect(kpis.requestLatency).toEqual({ value: 250, previous: 200, delta: 50 });
    expect(kpis.counts).toEqual({
      sessionsWithErrors: 4,
      loadTimeSamples: 100,
      httpRequests: 50,
      failedHttpRequests: 5,
    });
  });

  it('reads the previous period with the same query, application and environment', async () => {
    const { client, esClient } = createTracedEsClientMock();
    client.esql.query.mockResolvedValue(esqlResponse([CURRENT_ROW]));

    await getOtelOverviewKpis({
      esClient,
      serviceName: 'storefront-web',
      start: 2 * HOUR,
      end: 3 * HOUR,
      environment: 'production',
      filters: { browser: [{ value: 'Chrome', exclude: false }] },
      percentile: 95,
      kuery: { term: { 'user.id': 'u-1' } },
    });

    const [[current], [previous]] = client.esql.query.mock.calls;
    expect(current.query).toBe(previous.query);
    expect(current.query).toContain(
      'PERCENTILE(attributes.browser.navigation_timing.load_event_end, 95)'
    );
    expect(current.query).toContain('WHERE filter_browser IN ("Chrome")');

    const ranges = [current, previous].map(({ filter }) =>
      JSON.stringify(filter)
        .match(/"gte":(\d+),"lt":(\d+)/)
        ?.slice(1)
        .map(Number)
    );
    expect(ranges).toEqual([
      [2 * HOUR, 3 * HOUR],
      [HOUR, 2 * HOUR],
    ]);
    [current, previous].forEach(({ filter }) => {
      const text = JSON.stringify(filter);
      expect(text).toContain('storefront-web');
      expect(text).toContain('production');
      expect(text).toContain('u-1');
    });
  });

  it('has no ratio or duration without the data, and zero counts', async () => {
    const { client, esClient } = createTracedEsClientMock();
    // Columns every document has null for are left out of the response.
    client.esql.query.mockResolvedValue(esqlResponse([{ page_loads: 0, sessions: 0 }]));

    const kpis = await getOtelOverviewKpis({
      esClient,
      serviceName: 'storefront-web',
      start: HOUR,
      end: 2 * HOUR,
    });

    expect(kpis.sessions).toEqual({ value: 0, previous: 0, delta: 0 });
    expect(kpis.errorFreeSessions).toEqual({ value: null, previous: null, delta: null });
    expect(kpis.loadTime.value).toBeNull();
    expect(kpis.failedHttpRequests.value).toBeNull();
    expect(kpis.requestLatency.value).toBeNull();
  });

  it('has no data when the OTel indices do not exist', async () => {
    const { client, esClient } = createTracedEsClientMock();
    client.esql.query.mockRejectedValue(
      new errors.ResponseError({
        statusCode: 400,
        body: { error: { type: 'verification_exception', reason: 'Unknown index [logs-*]' } },
        headers: {},
        warnings: null,
        meta: {} as never,
      })
    );

    await expect(
      getOtelOverviewKpis({ esClient, serviceName: 'storefront-web', start: HOUR, end: 2 * HOUR })
    ).resolves.toMatchObject({ pageLoads: { value: 0 }, loadTime: { value: null } });
  });
});
