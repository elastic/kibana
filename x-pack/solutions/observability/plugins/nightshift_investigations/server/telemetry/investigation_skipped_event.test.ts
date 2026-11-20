/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAnalytics } from '@elastic/ebt/client';
import { loggerMock } from '@kbn/logging-mocks';
import {
  NIGHTSHIFT_INVESTIGATION_SKIPPED_EVENT,
  investigationSkippedEvent,
} from './investigation_skipped_event';

describe('investigationSkippedEvent schema', () => {
  // A dev-mode analytics client validates every reported event against its registered schema.
  it.each([
    { trigger: 'manual', origin: 'alert', skip_reason: 'deployment_quota' },
    {
      trigger: 'automation',
      origin: 'significant_event',
      automation_id: 'a1',
      skip_reason: 'automation_daily_limit',
    },
  ])('accepts %o', (event) => {
    const analytics = createAnalytics({ isDev: true, logger: loggerMock.create() });
    analytics.registerEventType(investigationSkippedEvent);

    expect(() =>
      analytics.reportEvent(NIGHTSHIFT_INVESTIGATION_SKIPPED_EVENT, event)
    ).not.toThrow();
  });
});
