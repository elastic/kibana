/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { events } from './telemetry_events';
import { TelemetryEventTypes } from './types';

describe('telemetry events', () => {
  it('registers a schema entry for the linked dashboard view event', () => {
    const event = events.find((e) => e.eventType === TelemetryEventTypes.LINKED_DASHBOARD_VIEW);

    expect(event).toBeDefined();
    expect(event?.schema).toMatchObject({
      rule_type_id: { type: 'keyword' },
      rule_id: { type: 'keyword' },
      dashboard_id: { type: 'keyword' },
    });
  });

  it('registers a schema entry for the suggested dashboard added event', () => {
    const event = events.find((e) => e.eventType === TelemetryEventTypes.SUGGESTED_DASHBOARD_ADDED);

    expect(event).toBeDefined();
    expect(event?.schema).toMatchObject({
      rule_type_id: { type: 'keyword' },
      rule_id: { type: 'keyword' },
      dashboard_id: { type: 'keyword' },
    });
  });
});
