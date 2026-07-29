/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildNightshiftEventFlyoutShareUrl,
  NIGHTSHIFT_EVENT_UUID_QUERY_PARAM,
} from './nightshift_url_params';

describe('nightshift_url_params', () => {
  it('builds a share URL with the eventUuid query param', () => {
    window.history.pushState({}, '', '/app/observability/nightshift?blastRadius=logs.web');

    expect(buildNightshiftEventFlyoutShareUrl('evt-uuid-001')).toBe(
      `${window.location.origin}/app/observability/nightshift?blastRadius=logs.web&${NIGHTSHIFT_EVENT_UUID_QUERY_PARAM}=evt-uuid-001`
    );
  });

  it('replaces an existing eventUuid when building a share URL', () => {
    window.history.pushState(
      {},
      '',
      `/app/observability/nightshift?${NIGHTSHIFT_EVENT_UUID_QUERY_PARAM}=old-uuid&blastRadius=logs.web`
    );

    expect(buildNightshiftEventFlyoutShareUrl('evt-uuid-001')).toBe(
      `${window.location.origin}/app/observability/nightshift?${NIGHTSHIFT_EVENT_UUID_QUERY_PARAM}=evt-uuid-001&blastRadius=logs.web`
    );
  });
});
