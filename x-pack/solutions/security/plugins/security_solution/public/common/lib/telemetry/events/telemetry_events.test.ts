/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { telemetryEvents } from './telemetry_events';

describe('telemetry events', () => {
  it('ensure properties have consistent types', () => {
    const propertyTypes: Record<string, string> = {};
    telemetryEvents.forEach((event) => {
      expect(event).toHaveProperty('eventType');
      expect(event).toHaveProperty('schema'); // schema is an object
      Object.keys(event.schema).forEach((item) => {
        // @ts-ignore
        const eventType = event.schema[item].type;
        if (!propertyTypes[item]) {
          propertyTypes[item] = eventType;
        } else {
          try {
            expect(propertyTypes[item]).toEqual(eventType);
          } catch (e) {
            // Show a descriptive error message
            throw new Error(`Property "${item}" has inconsistent types.\n${e}`);
          }
        }
      });
    });
  });

  it('ensure event type have no collision', () => {
    const eventTypes: Set<string> = new Set();
    telemetryEvents.forEach((event) => {
      expect(event).toHaveProperty('eventType');

      try {
        expect(eventTypes.has(event.eventType)).toBeFalsy();
      } catch (e) {
        throw new Error(`Event type "${event.eventType}" has collision.\n${e}`);
      }
      eventTypes.add(event.eventType);
    });
  });
});
