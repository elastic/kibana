/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { usageSearch } from './search_request';

const PARAMS = { serviceName: 'shop', start: 1000, end: 2000 };

const inEnvironment = (request: ReturnType<typeof usageSearch>) => {
  return request.aggs.inEnvironment;
};

describe('usageSearch', () => {
  it('searches the local OTel logs for aggregations only', () => {
    expect(usageSearch(PARAMS)).toMatchObject({
      index: 'logs-*.otel-*',
      size: 0,
      ignore_unavailable: true,
      allow_partial_search_results: false,
    });
  });

  it('filters the browser documents of the application, page loads and clicks only', () => {
    const { filter } = usageSearch(PARAMS).query.bool;

    expect(filter).toContainEqual({ term: { 'telemetry.sdk.language': 'webjs' } });
    expect(filter).toContainEqual({ term: { 'service.name': 'shop' } });
    expect(filter).toContainEqual({
      terms: { event_name: ['browser.navigation_timing', 'browser.user_action.click'] },
    });
  });

  it('filters the environment in one aggregation, without picker terms', () => {
    const all = usageSearch(PARAMS).aggs;
    const production = inEnvironment(usageSearch({ ...PARAMS, environment: 'production' }));

    expect(Object.keys(all)).toEqual(['inEnvironment']);
    expect(all.inEnvironment.filter).toEqual({ match_all: {} });
    expect(JSON.stringify(production.filter)).toContain('production');
  });

  it('reads the top pages from navigation timings, with their load time', () => {
    const { pageLoads } = inEnvironment(usageSearch(PARAMS)).aggs;

    expect(pageLoads.filter.bool.filter).toEqual([
      { term: { event_name: 'browser.navigation_timing' } },
    ]);
    expect(pageLoads.aggs.topPages.terms).toEqual({ field: 'url.full', size: 10 });
    expect(pageLoads.aggs.topPages.aggs.loadTime.percentiles).toMatchObject({
      field: 'browser.navigation_timing.load_event_end',
      percents: [75],
    });
  });

  it('reads the breakdowns from the browser resource attributes', () => {
    const { pageLoads } = inEnvironment(usageSearch(PARAMS)).aggs;

    expect(pageLoads.aggs.browsers.terms).toEqual({
      field: 'resource.attributes.browser.name',
      size: 10,
    });
    expect(pageLoads.aggs.operatingSystems.terms).toEqual({
      field: 'resource.attributes.browser.platform',
      size: 10,
    });
    expect(pageLoads.aggs.devices.terms).toEqual({
      field: 'resource.attributes.browser.mobile',
      size: 2,
    });
  });

  it('counts the clicks by selector with its tag name', () => {
    const { selectors } = inEnvironment(usageSearch(PARAMS)).aggs.clicks.aggs;

    expect(selectors.terms).toEqual({ field: 'browser.css_selector', size: 10 });
    expect(selectors.aggs.tagName.terms).toEqual({ field: 'browser.tag_name', size: 1 });
  });
});
