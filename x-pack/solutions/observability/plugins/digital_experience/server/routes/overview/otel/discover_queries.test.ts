/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { overviewDiscoverQueries } from './discover_queries';

const SCOPE = { serviceName: 'storefront-web', filters: {} };

describe('overviewDiscoverQueries', () => {
  it('opens the events of the application over Discover’s time range, newest first', () => {
    const { sessions } = overviewDiscoverQueries(SCOPE);

    expect(sessions).toContain('FROM logs-*.otel-*, traces-*.otel-*');
    expect(sessions).toContain('service.name == "storefront-web"');
    expect(sessions).toContain('telemetry.sdk.language == "webjs"');
    expect(sessions).toContain('@timestamp >= ?_tstart AND @timestamp < ?_tend');
    expect(sessions).toContain('SORT @timestamp DESC');
    expect(sessions).toContain('SET unmapped_fields = "nullify"');
  });

  it('narrows each tile to the events its value counts', () => {
    const queries = overviewDiscoverQueries(SCOPE);

    expect(queries.pageLoads).toContain('event_name == "browser.navigation_timing"');
    expect(queries.jsErrors).toContain('event_name == "exception"');
    expect(queries.failedHttpRequests).toContain('is_http_request');
    expect(queries.errorFreeSessions).toContain('event_name == "exception" OR');
    expect(queries.errorFreeSessions).toContain('is_http_request');
  });

  it('sorts the load time and request latency tiles by what they measure, the slowest first', () => {
    const { loadTime, requestLatency } = overviewDiscoverQueries(SCOPE);

    expect(loadTime).toContain('IS NOT NULL');
    expect(loadTime).toContain('browser.navigation_timing.load_event_end DESC');
    expect(requestLatency).toContain('duration DESC');
  });

  it('carries the environment, filters and KQL query of the Overview', () => {
    const { pageLoads } = overviewDiscoverQueries({
      serviceName: 'storefront-web',
      environment: 'production',
      kuery: 'user.id : "42"',
      filters: {
        browser: [{ value: 'Firefox', exclude: false }],
        pageContains: [{ value: '/checkout', exclude: false }],
      },
    });

    expect(pageLoads).toContain('service.environment == "production"');
    expect(pageLoads).toContain('KQL("user.id : \\"42\\"")');
    expect(pageLoads).toContain('Firefox');
    // The URL text narrows the page loads.
    expect(pageLoads).toContain('/checkout');
  });

  it('leaves the URL text out of the tiles that are not page loads', () => {
    const { jsErrors } = overviewDiscoverQueries({
      ...SCOPE,
      filters: { pageContains: [{ value: '/checkout', exclude: false }] },
    });

    expect(jsErrors).not.toContain('/checkout');
  });

  it('matches the events without an environment for "Not defined", and none for all', () => {
    const notDefined = overviewDiscoverQueries({
      ...SCOPE,
      environment: 'ENVIRONMENT_NOT_DEFINED',
    }).sessions;
    const all = overviewDiscoverQueries({ ...SCOPE, environment: 'ENVIRONMENT_ALL' }).sessions;

    expect(notDefined).toContain('IS NULL');
    expect(all).not.toContain('environment');
  });

  it('does not add a KQL condition for a blank query', () => {
    expect(overviewDiscoverQueries({ ...SCOPE, kuery: '  ' }).sessions).not.toContain('KQL(');
  });
});
