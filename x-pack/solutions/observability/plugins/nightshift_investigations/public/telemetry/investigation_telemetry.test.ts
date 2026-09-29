/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { analyticsServiceMock } from '@kbn/core-analytics-browser-mocks';
import {
  createInvestigationTelemetry,
  registerInvestigationEvents,
} from './investigation_telemetry';

describe('investigation telemetry', () => {
  it('registers the investigation events', () => {
    const analytics = analyticsServiceMock.createAnalyticsServiceSetup();

    registerInvestigationEvents(analytics);

    expect(analytics.registerEventType.mock.calls.map(([{ eventType }]) => eventType)).toEqual([
      'nightshift-investigation-started',
      'nightshift-investigation-viewed',
    ]);
  });

  it('reports started and viewed events', () => {
    const analytics = analyticsServiceMock.createAnalyticsServiceStart();
    const telemetry = createInvestigationTelemetry(analytics);
    const action = {
      origin: 'alerts_table',
      subject_type: 'alert',
      investigation_id: 'inv-1',
    } as const;

    telemetry.reportInvestigationStarted({ ...action, is_reinvestigation: true });
    telemetry.reportInvestigationViewed({ ...action, investigation_status: 'completed' });

    expect(analytics.reportEvent.mock.calls).toEqual([
      ['nightshift-investigation-started', { ...action, is_reinvestigation: true }],
      ['nightshift-investigation-viewed', { ...action, investigation_status: 'completed' }],
    ]);
  });
});
