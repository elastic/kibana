/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAnalytics } from '@elastic/ebt/client';
import { coreMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { ALERTZERO_TELEMETRY_EVENTS } from './constants';
import { ALERTZERO_TELEMETRY_EVENT_TYPES } from './event_types';
import { registerAlertZeroTelemetryEvents } from './register_telemetry_events';

describe('registerAlertZeroTelemetryEvents', () => {
  it('registers every AlertZero event type', () => {
    const { analytics } = coreMock.createSetup();

    registerAlertZeroTelemetryEvents(analytics);
    const registered = analytics.registerEventType.mock.calls.map(([opts]) => opts.eventType);

    expect(registered.sort()).toEqual(Object.values(ALERTZERO_TELEMETRY_EVENTS).sort());
  });

  it('registers each event with its schema', () => {
    const { analytics } = coreMock.createSetup();

    registerAlertZeroTelemetryEvents(analytics);

    expect(analytics.registerEventType.mock.calls.map(([opts]) => opts)).toEqual(
      ALERTZERO_TELEMETRY_EVENT_TYPES
    );
  });

  it('registers schemas a dev-mode analytics client accepts', () => {
    const analytics = createAnalytics({ isDev: true, logger: loggerMock.create() });

    expect(() => registerAlertZeroTelemetryEvents(analytics)).not.toThrow();
  });
});
