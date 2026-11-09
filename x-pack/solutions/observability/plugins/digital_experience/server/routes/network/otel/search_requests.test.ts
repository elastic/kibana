/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpRequestsSearch, resourcesSearch } from './search_requests';

const PARAMS = { serviceName: 'shop', start: 1000, end: 2000 };

describe('resourcesSearch', () => {
  it('searches every browser log, for the picker to list every environment', () => {
    const request = resourcesSearch(PARAMS);
    const { filter } = request.query.bool;
    const aggs = request.aggs;

    expect(request).toMatchObject({ index: 'logs-*.otel-*', size: 0 });
    expect(filter).toContainEqual({ term: { 'service.name': 'shop' } });
    expect(JSON.stringify(filter)).not.toContain('browser.resource_timing');
    expect(aggs.environments).toBeDefined();
    expect(aggs.inEnvironment.filter).toEqual({ match_all: {} });
  });

  it('lists the resource timings without the API calls', () => {
    const { resources } = resourcesSearch(PARAMS).aggs.inEnvironment.aggs;

    expect(resources.filter.bool.filter).toEqual([
      { term: { event_name: 'browser.resource_timing' } },
    ]);
    expect(resources.filter.bool.must_not).toEqual([
      { terms: { 'browser.resource_timing.initiator_type': ['fetch', 'xmlhttprequest'] } },
    ]);
  });

  it('orders the resources by the p75 duration and flags the render-blocking ones', () => {
    const { urls } = resourcesSearch(PARAMS).aggs.inEnvironment.aggs.resources.aggs;

    // 50, for the table to page through and filter on the render-blocking ones.
    expect(urls.terms).toEqual({
      field: 'url.full',
      size: 50,
      shard_size: 200,
      order: { 'duration.75': 'desc' },
    });
    expect(urls.aggs.duration.percentiles.field).toBe('browser.resource_timing.duration');
    expect(urls.aggs.transferSize.percentiles.field).toBe('browser.resource_timing.transfer_size');
    expect(urls.aggs.renderBlocking.filter.bool.filter).toEqual([
      { term: { 'browser.resource_timing.render_blocking_status': 'blocking' } },
    ]);
  });
});

describe('httpRequestsSearch', () => {
  it('searches the client HTTP spans of the application in the local OTel traces', () => {
    const request = httpRequestsSearch(PARAMS);
    const { filter } = request.query.bool;

    expect(request).toMatchObject({ index: 'traces-*.otel-*', size: 0 });
    expect(filter).toContainEqual({ term: { 'telemetry.sdk.language': 'webjs' } });
    expect(filter).toContainEqual({ term: { kind: 'Client' } });
    expect(filter).toContainEqual({ exists: { field: 'http.request.method' } });
  });

  it('groups by URL and method, with the outcomes and the p95 duration', () => {
    const { requests } = httpRequestsSearch(PARAMS).aggs.inEnvironment.aggs;

    expect(requests.multi_terms).toEqual({
      terms: [{ field: 'url.full' }, { field: 'http.request.method' }],
      size: 10,
      collect_mode: 'breadth_first',
    });
    expect(Object.keys(requests.aggs)).toEqual(['withOutcome', 'failed', 'duration']);
    expect(requests.aggs.duration.percentiles).toMatchObject({ field: 'duration', percents: [95] });
  });

  it('lists every environment for the picker and filters the requests to the selected one', () => {
    const aggs = httpRequestsSearch({ ...PARAMS, environment: 'staging' }).aggs;

    expect(aggs.environments).toBeDefined();
    expect(aggs.environmentNotDefined).toBeDefined();
    expect(JSON.stringify(aggs.inEnvironment.filter)).toContain('staging');
  });
});
