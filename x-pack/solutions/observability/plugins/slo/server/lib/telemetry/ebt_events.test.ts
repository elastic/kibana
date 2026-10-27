/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SLO_CREATED_EBT_EVENT_TYPE,
  SLO_DELETED_EBT_EVENT_TYPE,
  SLO_EBT_EVENT_TYPES,
  SLO_RESET_EBT_EVENT_TYPE,
  SLO_UPDATED_EBT_EVENT_TYPE,
} from './ebt_event_types';
import type { SloEbtEventType } from './ebt_event_types';
import { sloEbtEventTypeOpts } from './ebt_events';
import { registerSloEbtEvents } from './register_slo_ebt_events';

interface SchemaNode {
  _meta?: { description?: string };
  properties?: Record<string, SchemaNode>;
  items?: SchemaNode;
}

const findNodesWithoutDescription = (node: SchemaNode, path: string): string[] => {
  const missing = node._meta?.description ? [] : [path];
  const children = Object.entries(node.properties ?? {}).flatMap(([key, child]) =>
    findNodesWithoutDescription(child, `${path}.${key}`)
  );
  const items = node.items ? findNodesWithoutDescription(node.items, `${path}[]`) : [];

  return [...missing, ...children, ...items];
};

const getSchema = (eventType: SloEbtEventType): Record<string, SchemaNode> =>
  sloEbtEventTypeOpts[eventType].schema;

describe('registerSloEbtEvents', () => {
  it('registers every SLO event type exactly once', () => {
    const analytics = { registerEventType: jest.fn() };

    registerSloEbtEvents(analytics);

    expect(analytics.registerEventType.mock.calls.map(([{ eventType }]) => eventType)).toEqual([
      ...SLO_EBT_EVENT_TYPES,
    ]);
  });

  it.each(SLO_EBT_EVENT_TYPES)('describes every field of %s', (eventType) => {
    const schema = getSchema(eventType);

    expect(
      Object.entries(schema).flatMap(([key, node]) => findNodesWithoutDescription(node, key))
    ).toEqual([]);
  });

  it.each(SLO_EBT_EVENT_TYPES)('reports the origin of %s', (eventType) => {
    expect(Object.keys(getSchema(eventType).origin.properties ?? {})).toEqual([
      'actor',
      'channel',
      'app',
    ]);
  });

  it.each([
    SLO_CREATED_EBT_EVENT_TYPE,
    SLO_UPDATED_EBT_EVENT_TYPE,
    SLO_DELETED_EBT_EVENT_TYPE,
    SLO_RESET_EBT_EVENT_TYPE,
  ])('reports the SLO definition attributes in %s', (eventType) => {
    expect(getSchema(eventType)).toEqual(
      expect.objectContaining({
        slo_id: expect.any(Object),
        indicator_type: expect.any(Object),
        budgeting_method: expect.any(Object),
        time_window_type: expect.any(Object),
        settings: expect.any(Object),
      })
    );
  });

  it('reports the update specific fields', () => {
    expect(getSchema(SLO_UPDATED_EBT_EVENT_TYPE)).toEqual(
      expect.objectContaining({
        revision_bumped: expect.any(Object),
        changed_fields: expect.any(Object),
      })
    );
  });

  it('reports whether a deletion is part of a bulk deletion', () => {
    expect(getSchema(SLO_DELETED_EBT_EVENT_TYPE)).toHaveProperty('bulk');
  });
});
