/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  sloCreatedEbtEvent,
  sloDeletedEbtEvent,
  sloResetEbtEvent,
  sloUpdatedEbtEvent,
} from './ebt_events';
import { registerSloEbtEvents } from './register_slo_ebt_events';

interface SchemaNode {
  _meta?: { description?: string };
  properties?: Record<string, SchemaNode>;
  items?: SchemaNode;
}

const sloEbtEvents = [sloCreatedEbtEvent, sloUpdatedEbtEvent, sloDeletedEbtEvent, sloResetEbtEvent];

const findNodesWithoutDescription = (node: SchemaNode, path: string): string[] => {
  const missing = node._meta?.description ? [] : [path];
  const children = Object.entries(node.properties ?? {}).flatMap(([key, child]) =>
    findNodesWithoutDescription(child, `${path}.${key}`)
  );
  const items = node.items ? findNodesWithoutDescription(node.items, `${path}[]`) : [];

  return [...missing, ...children, ...items];
};

describe('registerSloEbtEvents', () => {
  it('registers every SLO event type once', () => {
    const analytics = { registerEventType: jest.fn() };

    registerSloEbtEvents(analytics);

    expect(analytics.registerEventType.mock.calls).toEqual(sloEbtEvents.map((event) => [event]));
    expect(new Set(sloEbtEvents.map(({ eventType }) => eventType)).size).toBe(sloEbtEvents.length);
  });

  it.each(
    sloEbtEvents.map(({ eventType, schema }): [string, Record<string, SchemaNode>] => [
      eventType,
      schema,
    ])
  )('describes every field of %s', (_eventType, schema) => {
    expect(
      Object.entries(schema).flatMap(([key, node]) => findNodesWithoutDescription(node, key))
    ).toEqual([]);
  });
});
