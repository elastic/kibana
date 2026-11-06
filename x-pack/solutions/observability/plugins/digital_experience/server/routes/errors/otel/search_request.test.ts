/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NO_STACKTRACE, NO_TYPE, errorsSearch } from './search_request';

const PARAMS = { serviceName: 'shop', start: 1000, end: 2000 };

describe('errorsSearch', () => {
  it('searches the exceptions of the application in the local OTel logs', () => {
    const request = errorsSearch(PARAMS);
    const { filter } = request.query.bool;

    expect(request).toMatchObject({ index: 'logs-*.otel-*', size: 0, ignore_unavailable: true });
    expect(filter).toContainEqual({ term: { 'telemetry.sdk.language': 'webjs' } });
    expect(filter).toContainEqual({ term: { 'service.name': 'shop' } });
    expect(JSON.stringify(filter)).not.toContain('exception');
  });

  it('lists every environment for the picker and filters the groups to the selected one', () => {
    const { aggs } = errorsSearch({ ...PARAMS, environment: 'production' });

    expect(aggs.environments).toBeDefined();
    expect(aggs.environmentNotDefined).toBeDefined();
    expect(JSON.stringify(aggs.inEnvironment.filter)).toContain('production');
    expect(aggs.inEnvironment.aggs.exceptions.filter.bool.filter).toEqual([
      { term: { event_name: 'exception' } },
    ]);
  });

  it('groups the errors by type and stack trace, never by message', () => {
    const { groups } = errorsSearch(PARAMS).aggs.inEnvironment.aggs.exceptions.aggs;

    expect(groups.multi_terms).toEqual({
      terms: [
        { field: 'exception.type', missing: NO_TYPE },
        { field: 'exception.stacktrace', missing: NO_STACKTRACE },
      ],
      size: 100,
    });
    expect(JSON.stringify(errorsSearch(PARAMS))).not.toContain('"field":"exception.message"}');
  });

  it('gives each group its latest message and last occurrence', () => {
    const groupAggs = errorsSearch(PARAMS).aggs.inEnvironment.aggs.exceptions.aggs.groups.aggs;

    expect(groupAggs.message.top_hits).toMatchObject({ size: 1, fields: ['exception.message'] });
    expect(groupAggs.lastSeen).toEqual({ max: { field: '@timestamp' } });
  });
});

describe('errorsSearch with filters', () => {
  const FILTERS = { browser: 'Chrome', pageUrl: 'https://shop.example.com/' };

  it('narrows the groups to the selected browser, not the picker environments or the page', () => {
    const request = errorsSearch({ ...PARAMS, filters: FILTERS });

    expect(Object.keys(request.runtime_mappings)).toContain('digital_experience_filter_browser');
    expect(request.aggs.inEnvironment.filter).toEqual({
      bool: {
        filter: [{ match_all: {} }, { term: { digital_experience_filter_browser: 'Chrome' } }],
      },
    });
    expect(request.aggs.environments).toBeDefined();
    expect(JSON.stringify(request)).not.toContain('shop.example.com');
  });

  it('is unchanged without a selection', () => {
    expect(errorsSearch(PARAMS).aggs.inEnvironment.filter).toEqual({ match_all: {} });
  });
});
