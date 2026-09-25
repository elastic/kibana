/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getTopologicalAgentOrder } from './graph';
import { TinesStoryParser } from './story_json';
import { TINES_AGENT_TYPES, type ParsedTinesAgent } from './types';
import simpleStory from './mock/simple_story.json';

const agent = (index: number, overrides: Partial<ParsedTinesAgent> = {}): ParsedTinesAgent => ({
  index,
  type: TINES_AGENT_TYPES.HTTP_REQUEST,
  name: `Agent ${index}`,
  guid: `guid-${index}`,
  stepName: `agent_${index}`,
  incomingLinks: [],
  outgoingLinks: [],
  ...overrides,
});

describe('getTopologicalAgentOrder', () => {
  it('returns a linear order for a simple chain', () => {
    const agents = [agent(0), agent(1), agent(2)];
    const order = getTopologicalAgentOrder(agents, [
      { source: 0, receiver: 1 },
      { source: 1, receiver: 2 },
    ]);

    expect(order).toEqual([0, 1, 2]);
  });

  it('throws when links contain a cycle', () => {
    const agents = [agent(0), agent(1), agent(2)];

    expect(() =>
      getTopologicalAgentOrder(agents, [
        { source: 0, receiver: 1 },
        { source: 1, receiver: 2 },
        { source: 2, receiver: 0 },
      ])
    ).toThrow(/Cycle detected/);
  });

  it('ignores links that point at agents not in the input set', () => {
    const enabled = [agent(0), agent(2)];
    const order = getTopologicalAgentOrder(enabled, [
      { source: 0, receiver: 1 },
      { source: 1, receiver: 2 },
      { source: 0, receiver: 2 },
    ]);

    expect(order).toEqual([0, 2]);
  });

  it('orders the Simple story fixture without cycles', () => {
    const parsed = TinesStoryParser.parse(simpleStory);
    const order = getTopologicalAgentOrder(parsed.agents, parsed.links);

    expect(order).toHaveLength(parsed.agents.length);
    expect(new Set(order).size).toBe(parsed.agents.length);
  });
});
