/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PND_INCIDENT_CLOSED_TRIGGER_ID } from '@kbn/pnd-common';
import {
  IncidentClosedEventSchema,
  incidentClosedTriggerCommonDefinition,
} from './incident_closed';

const validEvent = {
  correlationId: 'ad-1',
  incidentConversationId: 'conv-1',
  spaceId: 'default',
  watchId: 'system-security-watch-deep',
};

describe('incidentClosedTriggerCommonDefinition', () => {
  it('uses the shared pnd.incidentClosed trigger id', () => {
    expect(incidentClosedTriggerCommonDefinition.id).toEqual(PND_INCIDENT_CLOSED_TRIGGER_ID);
  });

  it('exposes the incident-closed event schema', () => {
    expect(incidentClosedTriggerCommonDefinition.eventSchema).toBe(IncidentClosedEventSchema);
  });

  it('declares a stability level', () => {
    expect(incidentClosedTriggerCommonDefinition.stability).toEqual('tech_preview');
  });
});

describe('IncidentClosedEventSchema', () => {
  it('accepts an event carrying only ids and non-sensitive metadata', () => {
    expect(IncidentClosedEventSchema.safeParse(validEvent).success).toBe(true);
  });

  it('rejects unknown fields (no information disclosure through the event, S6)', () => {
    expect(
      IncidentClosedEventSchema.safeParse({ ...validEvent, alertBody: 'secret' }).success
    ).toBe(false);
  });

  it('rejects a missing correlationId', () => {
    const { correlationId, ...rest } = validEvent;
    expect(IncidentClosedEventSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects an empty incidentConversationId', () => {
    expect(
      IncidentClosedEventSchema.safeParse({ ...validEvent, incidentConversationId: '' }).success
    ).toBe(false);
  });

  it('rejects a missing spaceId', () => {
    const { spaceId, ...rest } = validEvent;
    expect(IncidentClosedEventSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects a missing watchId', () => {
    const { watchId, ...rest } = validEvent;
    expect(IncidentClosedEventSchema.safeParse(rest).success).toBe(false);
  });
});
