/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildNightshiftEventFlyoutShareUrl,
  clearNightshiftEventIdParam,
  clearNightshiftSeverityParam,
  getNightshiftEventIdFromSearch,
  getNightshiftSearchQueryFromSearch,
  getNightshiftSeverityFromSearch,
  NIGHTSHIFT_EVENT_ID_QUERY_PARAM,
  NIGHTSHIFT_SEARCH_QUERY_PARAM,
  NIGHTSHIFT_SEVERITY_QUERY_PARAM,
  setNightshiftEventIdParam,
  setNightshiftSearchQueryParam,
  setNightshiftSeverityParam,
} from './url_params';

describe('url_params', () => {
  it('builds a share URL with the eventId query param', () => {
    window.history.pushState({}, '', '/app/observability/nightshift?filter=logs.web');

    expect(buildNightshiftEventFlyoutShareUrl('evt-001')).toBe(
      `${window.location.origin}/app/observability/nightshift?filter=logs.web&${NIGHTSHIFT_EVENT_ID_QUERY_PARAM}=evt-001`
    );
  });

  it('replaces an existing eventId when building a share URL', () => {
    window.history.pushState(
      {},
      '',
      `/app/observability/nightshift?${NIGHTSHIFT_EVENT_ID_QUERY_PARAM}=old-id&filter=logs.web`
    );

    expect(buildNightshiftEventFlyoutShareUrl('evt-001')).toBe(
      `${window.location.origin}/app/observability/nightshift?${NIGHTSHIFT_EVENT_ID_QUERY_PARAM}=evt-001&filter=logs.web`
    );
  });

  it('reads and writes the event id param', () => {
    expect(getNightshiftEventIdFromSearch(`?${NIGHTSHIFT_EVENT_ID_QUERY_PARAM}=id-1`)).toBe('id-1');
    expect(getNightshiftEventIdFromSearch('')).toBeUndefined();

    const params = new URLSearchParams();
    setNightshiftEventIdParam(params, 'id-2');
    expect(params.get(NIGHTSHIFT_EVENT_ID_QUERY_PARAM)).toBe('id-2');

    clearNightshiftEventIdParam(params);
    expect(params.has(NIGHTSHIFT_EVENT_ID_QUERY_PARAM)).toBe(false);
  });

  it('reads and writes the search query param', () => {
    expect(getNightshiftSearchQueryFromSearch(`?${NIGHTSHIFT_SEARCH_QUERY_PARAM}=logs.web`)).toBe(
      'logs.web'
    );
    expect(getNightshiftSearchQueryFromSearch('')).toBeUndefined();

    const params = new URLSearchParams();
    setNightshiftSearchQueryParam(params, 'logs.web');
    expect(params.get(NIGHTSHIFT_SEARCH_QUERY_PARAM)).toBe('logs.web');

    setNightshiftSearchQueryParam(params, '');
    expect(params.has(NIGHTSHIFT_SEARCH_QUERY_PARAM)).toBe(false);
  });

  it('reads and writes the severity param', () => {
    expect(getNightshiftSeverityFromSearch(`?${NIGHTSHIFT_SEVERITY_QUERY_PARAM}=80-critical`)).toBe(
      '80-critical'
    );
    expect(getNightshiftSeverityFromSearch('')).toBeUndefined();

    const params = new URLSearchParams();
    setNightshiftSeverityParam(params, '80-critical');
    expect(params.get(NIGHTSHIFT_SEVERITY_QUERY_PARAM)).toBe('80-critical');

    clearNightshiftSeverityParam(params);
    expect(params.has(NIGHTSHIFT_SEVERITY_QUERY_PARAM)).toBe(false);
  });
});
