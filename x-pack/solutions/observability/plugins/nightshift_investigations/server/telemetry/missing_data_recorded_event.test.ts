/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAnalytics } from '@elastic/ebt/client';
import { loggerMock } from '@kbn/logging-mocks';
import {
  NIGHTSHIFT_MISSING_DATA_RECORDED_EVENT,
  missingDataRecordedEvent,
} from './missing_data_recorded_event';

describe('missingDataRecordedEvent schema', () => {
  // A dev-mode analytics client validates every reported event against its registered schema.
  it('accepts a reason and rejects any other field', () => {
    const analytics = createAnalytics({ isDev: true, logger: loggerMock.create() });
    analytics.registerEventType(missingDataRecordedEvent);

    expect(() =>
      analytics.reportEvent(NIGHTSHIFT_MISSING_DATA_RECORDED_EVENT, { reason: 'no_access' })
    ).not.toThrow();
    expect(() =>
      analytics.reportEvent(NIGHTSHIFT_MISSING_DATA_RECORDED_EVENT, {
        reason: 'no_access',
        what: 'inventory-service logs',
      })
    ).toThrow();
  });
});
