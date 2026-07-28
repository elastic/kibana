/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sloTelemetryEventBasedTypes } from './telemetry_events';
import { SloTelemetryEventTypes } from './types';

describe('sloTelemetryEventBasedTypes', () => {
  it('registers a schema entry for every SloTelemetryEventTypes value', () => {
    const registeredEventTypes = sloTelemetryEventBasedTypes.map((event) => event.eventType);

    expect(registeredEventTypes).toEqual(Object.values(SloTelemetryEventTypes));
  });

  it('registers slo_id in the schema for each engagement event', () => {
    const engagementEvents = [
      SloTelemetryEventTypes.SLO_CREATED,
      SloTelemetryEventTypes.SLO_EDITED,
      SloTelemetryEventTypes.SLO_DELETED,
      SloTelemetryEventTypes.SLO_CLONED,
      SloTelemetryEventTypes.SLO_RESET,
    ];

    engagementEvents.forEach((eventType) => {
      const event = sloTelemetryEventBasedTypes.find((e) => e.eventType === eventType);
      expect(event?.schema).toHaveProperty('slo_id');
    });
  });

  it('registers template_id as optional in the slo_created schema', () => {
    const event = sloTelemetryEventBasedTypes.find(
      (e) => e.eventType === SloTelemetryEventTypes.SLO_CREATED
    );

    expect(event?.schema).toMatchObject({
      template_id: { _meta: { optional: true } },
    });
  });
});
