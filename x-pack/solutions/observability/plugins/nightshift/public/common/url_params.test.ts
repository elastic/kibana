/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  BLAST_RADIUS_QUERY_PARAM,
  buildNightshiftEventFlyoutShareUrl,
  clearNightshiftEventSelectionParams,
  getNightshiftEventSelectionFromSearch,
  NIGHTSHIFT_EVENT_ID_QUERY_PARAM,
  NIGHTSHIFT_EVENT_UUID_QUERY_PARAM,
  setNightshiftEventSelectionParams,
} from './nightshift_url_params';

describe('nightshift_url_params', () => {
  it('builds a share URL with eventUuid and eventId query params', () => {
    window.history.pushState(
      {},
      '',
      `/app/observability/nightshift?${BLAST_RADIUS_QUERY_PARAM}=logs.web`
    );

    expect(buildNightshiftEventFlyoutShareUrl('evt-uuid-001', 'evt-001')).toBe(
      `${window.location.origin}/app/observability/nightshift?${BLAST_RADIUS_QUERY_PARAM}=logs.web&${NIGHTSHIFT_EVENT_UUID_QUERY_PARAM}=evt-uuid-001&${NIGHTSHIFT_EVENT_ID_QUERY_PARAM}=evt-001`
    );
  });

  it('replaces an existing eventUuid when building a share URL', () => {
    window.history.pushState(
      {},
      '',
      `/app/observability/nightshift?${NIGHTSHIFT_EVENT_UUID_QUERY_PARAM}=old-uuid&${BLAST_RADIUS_QUERY_PARAM}=logs.web`
    );

    expect(buildNightshiftEventFlyoutShareUrl('evt-uuid-001', 'evt-001')).toBe(
      `${window.location.origin}/app/observability/nightshift?${NIGHTSHIFT_EVENT_UUID_QUERY_PARAM}=evt-uuid-001&${BLAST_RADIUS_QUERY_PARAM}=logs.web&${NIGHTSHIFT_EVENT_ID_QUERY_PARAM}=evt-001`
    );
  });

  it('reads and writes event selection params', () => {
    expect(
      getNightshiftEventSelectionFromSearch(
        `?${NIGHTSHIFT_EVENT_UUID_QUERY_PARAM}=uuid-1&${NIGHTSHIFT_EVENT_ID_QUERY_PARAM}=id-1`
      )
    ).toEqual({ eventId: 'id-1', eventUuid: 'uuid-1' });

    const params = new URLSearchParams();
    setNightshiftEventSelectionParams(params, { eventId: 'id-2', eventUuid: 'uuid-2' });
    expect(params.get(NIGHTSHIFT_EVENT_UUID_QUERY_PARAM)).toBe('uuid-2');
    expect(params.get(NIGHTSHIFT_EVENT_ID_QUERY_PARAM)).toBe('id-2');

    clearNightshiftEventSelectionParams(params);
    expect(params.has(NIGHTSHIFT_EVENT_UUID_QUERY_PARAM)).toBe(false);
    expect(params.has(NIGHTSHIFT_EVENT_ID_QUERY_PARAM)).toBe(false);
  });
});
