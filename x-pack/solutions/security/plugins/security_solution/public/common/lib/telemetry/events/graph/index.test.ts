/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { telemetryEvents } from '../telemetry_events';
import { graphTelemetryEvents } from '.';
import { GRAPH_ENTRY_POINT, GRAPH_EVENT_ID, GraphEventTypes } from './types';

describe('graph telemetry events', () => {
  it('defines a schema for every GraphEventTypes member', () => {
    const defined = graphTelemetryEvents.map(({ eventType }) => eventType).sort();
    expect(defined).toEqual(Object.values(GraphEventTypes).sort());
  });

  it('describes every property of every event variant', () => {
    const [{ schema }] = graphTelemetryEvents;
    expect(Object.keys(schema).sort()).toEqual(
      [
        'id',
        'entryPoint',
        'nodeType',
        'action',
        'state',
        'change',
        'timeRangeChanged',
        'queryChanged',
        'nodesAdded',
        'nodesLimitReached',
        'itemType',
        'drillTarget',
        'emptyReason',
        'errorCategory',
        'isEmpty',
      ].sort()
    );
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

  it('only requires the event id and entry point', () => {
    const [{ schema }] = graphTelemetryEvents;
    const requiredFields = Object.entries(schema)
      .filter(([, field]) => !(field as { _meta: { optional?: boolean } })._meta.optional)
      .map(([name]) => name)
      .sort();
    expect(requiredFields).toEqual(['entryPoint', 'id']);
  });

  it('describes the graph preview funnel ids in the id field', () => {
    const [{ schema }] = graphTelemetryEvents;
    const { description } = (schema.id as { _meta: { description: string } })._meta;

    expect(description).toContain('graph_preview_shown');
    expect(description).toContain('graph_preview_expanded');
    expect(Object.keys(GRAPH_EVENT_ID)).toEqual(
      expect.arrayContaining(['graph_preview_shown', 'graph_preview_expanded'])
    );
  });

  it('describes isEmpty as an optional boolean set only for graph_preview_shown', () => {
    const [{ schema }] = graphTelemetryEvents;
    const isEmpty = schema.isEmpty as {
      type: string;
      _meta: { description: string; optional?: boolean };
    };

    expect(isEmpty.type).toBe('boolean');
    expect(isEmpty._meta.optional).toBe(true);
    expect(isEmpty._meta.description.length).toBeGreaterThan(0);
    expect(isEmpty._meta.description).toContain('graph_preview_shown');
  });

  it('lists every entry point, including the AI chat attachment, in the entryPoint field', () => {
    const [{ schema }] = graphTelemetryEvents;
    const { description } = (schema.entryPoint as { _meta: { description: string } })._meta;

    Object.keys(GRAPH_ENTRY_POINT).forEach((entryPoint) => {
      expect(description).toContain(entryPoint);
    });
    expect(Object.keys(GRAPH_ENTRY_POINT)).toContain('ai_chat_attachment');
    expect(description).toContain('Agent Builder entity graph attachment');
  });

  it('uses a single entity_graph event type', () => {
    expect(Object.values(GraphEventTypes)).toEqual(['entity_graph']);
    expect(graphTelemetryEvents).toHaveLength(1);
  });
});
