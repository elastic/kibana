/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FRUSTRATION_EVENTS } from '../../../../common/otel_data';
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

  it('filters the browser documents of the application, page loads, clicks and frustration only', () => {
    const { filter } = usageSearch(PARAMS).query.bool;

    expect(filter).toContainEqual({ term: { 'telemetry.sdk.language': 'webjs' } });
    expect(filter).toContainEqual({ term: { 'service.name': 'shop' } });
    expect(filter).toContainEqual({
      terms: {
        event_name: [
          'browser.navigation_timing',
          'browser.user_action.click',
          'browser.frustration.rage_click',
          'browser.frustration.dead_click',
          'browser.frustration.error_click',
        ],
      },
    });
  });

  it('lists every environment for the picker and filters the usage to the selected one', () => {
    const all = usageSearch(PARAMS).aggs;
    const { aggs } = usageSearch({ ...PARAMS, environment: 'production' });

    expect(all.inEnvironment.filter).toEqual({ match_all: {} });
    expect(aggs.environments).toBeDefined();
    expect(aggs.environmentNames).toBeDefined();
    expect(aggs.environmentNotDefined).toBeDefined();
    expect(JSON.stringify(aggs.inEnvironment.filter)).toContain('production');
    expect(JSON.stringify(aggs.environments)).not.toContain('production');
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

  it('reads the breakdowns from the fields the filters read, so a row is a value to filter on', () => {
    const { pageLoads } = inEnvironment(usageSearch(PARAMS)).aggs;

    expect(pageLoads.aggs.browsers.terms).toEqual({
      field: 'digital_experience_filter_browser',
      size: 10,
    });
    expect(pageLoads.aggs.operatingSystems.terms).toEqual({
      field: 'digital_experience_filter_os',
      size: 10,
    });
    expect(pageLoads.aggs.devices.terms).toEqual({
      field: 'digital_experience_filter_device',
      size: 10,
    });
  });

  it('counts the clicks by selector with its tag name', () => {
    const { selectors } = inEnvironment(usageSearch(PARAMS)).aggs.clicks.aggs;

    expect(selectors.terms).toEqual({ field: 'browser.css_selector', size: 10 });
    expect(selectors.aggs.tagName.terms).toEqual({ field: 'browser.tag_name', size: 1 });
  });

  it('reads the frustration by type, element and page', () => {
    const { frustration } = inEnvironment(usageSearch(PARAMS)).aggs;
    const byType = { terms: { field: 'event_name', size: 3 } };
    const sessions = { cardinality: { field: 'session.id' } };

    expect(frustration).toEqual({
      filter: { bool: { filter: [{ terms: { event_name: [...FRUSTRATION_EVENTS] } }] } },
      aggs: {
        byType,
        sessions,
        elements: {
          terms: { field: 'browser.css_selector', size: 10 },
          aggs: {
            byType,
            sessions,
            tagName: { terms: { field: 'browser.tag_name', size: 1 } },
            topPage: { terms: { field: 'url.full', size: 1 } },
          },
        },
        pages: {
          terms: { field: 'url.full', size: 30 },
          aggs: { byType, sessions },
        },
      },
    });
  });
});

describe('usageSearch with filters', () => {
  const FILTERS = {
    browser: [
      { value: 'Chrome', exclude: false },
      { value: 'Safari', exclude: true },
    ],
    country: [{ value: 'DE', exclude: false }],
    pageUrl: [{ value: 'https://shop.example.com/', exclude: false }],
  };

  it('defines the runtime fields the filters read', () => {
    expect(Object.keys(usageSearch(PARAMS).runtime_mappings)).toEqual([
      'digital_experience_filter_browser',
      'digital_experience_filter_os',
      'digital_experience_filter_device',
      'digital_experience_filter_country',
      'digital_experience_filter_appVersion',
    ]);
  });

  it('narrows the pages, breakdowns and clicks to the selected browser, OS, device and country', () => {
    const { filter } = inEnvironment(usageSearch({ ...PARAMS, filters: FILTERS }));

    expect(filter).toEqual({
      bool: {
        filter: [
          { match_all: {} },
          { terms: { digital_experience_filter_browser: ['Chrome'] } },
          { bool: { must_not: [{ terms: { digital_experience_filter_browser: ['Safari'] } }] } },
          { terms: { digital_experience_filter_country: ['DE'] } },
        ],
      },
    });
  });

  it('narrows the page loads and frustration to the selected page, not the clicks', () => {
    const { pageLoads, clicks, frustration } = inEnvironment(
      usageSearch({ ...PARAMS, filters: FILTERS })
    ).aggs;

    expect(pageLoads.filter.bool.filter).toEqual([
      { term: { event_name: 'browser.navigation_timing' } },
      { terms: { 'attributes.url.full': ['https://shop.example.com/'] } },
    ]);
    expect(clicks.filter).toEqual({
      bool: { filter: [{ term: { event_name: 'browser.user_action.click' } }] },
    });
    expect(frustration.filter.bool.filter).toEqual([
      { terms: { event_name: [...FRUSTRATION_EVENTS] } },
      { terms: { 'attributes.url.full': ['https://shop.example.com/'] } },
    ]);
  });

  it('is unchanged without a selection', () => {
    expect(inEnvironment(usageSearch({ ...PARAMS, filters: {} })).filter).toEqual({
      match_all: {},
    });
  });

  it('keeps the documents the KQL query matches', () => {
    const kuery = { match: { 'browser.name': 'Chrome' } };

    expect(usageSearch({ ...PARAMS, kuery }).query.bool.filter).toContainEqual(kuery);
    expect(usageSearch(PARAMS).query.bool.filter).not.toContainEqual(kuery);
  });
});
