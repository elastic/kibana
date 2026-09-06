/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  NIGHTSHIFT_SEARCH_QUERY_PARAM,
  buildNightshiftEventFlyoutShareUrl,
  clearNightshiftEventIdParam,
  getNightshiftEventIdFromSearch,
  NIGHTSHIFT_EVENT_ID_QUERY_PARAM,
  setNightshiftEventIdParam,
} from './url_params';

describe('url_params', () => {
  it('builds a share URL with the eventId query param', () => {
    window.history.pushState(
      {},
      '',
      `/app/observability/nightshift?${NIGHTSHIFT_SEARCH_QUERY_PARAM}=logs.web`
    );

    expect(buildNightshiftEventFlyoutShareUrl('evt-001')).toBe(
      `${window.location.origin}/app/observability/nightshift?${NIGHTSHIFT_SEARCH_QUERY_PARAM}=logs.web&${NIGHTSHIFT_EVENT_ID_QUERY_PARAM}=evt-001`
    );
  });

  it('replaces an existing eventId when building a share URL', () => {
    window.history.pushState(
      {},
      '',
      `/app/observability/nightshift?${NIGHTSHIFT_EVENT_ID_QUERY_PARAM}=old-id&${NIGHTSHIFT_SEARCH_QUERY_PARAM}=logs.web`
    );

    expect(buildNightshiftEventFlyoutShareUrl('evt-001')).toBe(
      `${window.location.origin}/app/observability/nightshift?${NIGHTSHIFT_EVENT_ID_QUERY_PARAM}=evt-001&${NIGHTSHIFT_SEARCH_QUERY_PARAM}=logs.web`
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
});
