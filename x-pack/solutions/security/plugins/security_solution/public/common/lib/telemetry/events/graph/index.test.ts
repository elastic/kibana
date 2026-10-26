/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { telemetryEvents } from '../telemetry_events';
import { graphTelemetryEvents } from '.';
import { GraphEventTypes } from './types';

describe('graph telemetry events', () => {
  it('defines a schema for every GraphEventTypes member', () => {
    const defined = graphTelemetryEvents.map(({ eventType }) => eventType).sort();
    expect(defined).toEqual(Object.values(GraphEventTypes).sort());
  });

  it('registers the graph events with the telemetry service', () => {
    graphTelemetryEvents.forEach((event) => {
      expect(telemetryEvents).toContain(event);
    });
  });

  it('describes every schema field and marks optionality explicitly', () => {
    graphTelemetryEvents.forEach(({ schema }) => {
      Object.values(schema).forEach((field) => {
        const { _meta: meta } = field as { _meta: { description: string; optional?: boolean } };
        expect(meta.description.length).toBeGreaterThan(0);
        expect(typeof meta.optional).toBe('boolean');
      });
    });
  });

  it('does not tag events with the flyout system in use', () => {
    graphTelemetryEvents.forEach(({ schema }) => {
      expect(Object.keys(schema)).not.toContain('flyoutVersion');
    });
  });

  it('only marks the toggle state as optional on the node action event', () => {
    const nodeAction = graphTelemetryEvents.find(
      ({ eventType }) => eventType === GraphEventTypes.NodeActionClicked
    );
    const optionalFields = Object.entries(nodeAction?.schema ?? {})
      .filter(([, field]) => (field as { _meta: { optional?: boolean } })._meta.optional)
      .map(([name]) => name);
    expect(optionalFields).toEqual(['state']);
  });
});
