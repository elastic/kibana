/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup } from '@kbn/core-analytics-server';
import { EbtTelemetryService } from './service';

/** Downstream dashboards key on these names; changing the list is a telemetry contract change. */
const REGISTERED_EVENT_TYPES = [
  'significant-events-significant-events-queries-generated',
  'significant-events-features-identified',
  'significant-events-agent-builder-knowledge-indicator-created',
  'significant-events-agent-tool-ki-identification-started',
  'significant-events-agent-tool-event-create',
  'significant-events-agent-tool-event-status-update',
  'significant-events-significant-events-discovery-triggered',
  'significant-events-onboarding-scheduled',
  'significant-events-detection-scan',
  'significant-events-agent-tool-event-write',
  'significant-events-agent-tool-event-search',
  'significant-events-event-status-changed',
];

const createAnalytics = () =>
  ({ registerEventType: jest.fn() } as unknown as jest.Mocked<AnalyticsServiceSetup>);

describe('EbtTelemetryService', () => {
  it('registers exactly the catalogued event types', () => {
    const analytics = createAnalytics();

    new EbtTelemetryService().setup(analytics);

    const registered = analytics.registerEventType.mock.calls.map(([{ eventType }]) => eventType);
    expect([...registered].sort()).toEqual([...REGISTERED_EVENT_TYPES].sort());
    expect(new Set(registered).size).toBe(registered.length);
  });

  it('describes every schema field', () => {
    const analytics = createAnalytics();

    new EbtTelemetryService().setup(analytics);

    const undescribed = analytics.registerEventType.mock.calls.flatMap(([{ eventType, schema }]) =>
      Object.entries(schema as Record<string, { _meta?: { description?: string } }>)
        .filter(([, field]) => !field._meta?.description)
        .map(([field]) => `${eventType}.${field}`)
    );
    expect(undescribed).toEqual([]);
  });
});
