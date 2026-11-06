/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getMonitorCostMib } from './assign_shards';
import { summarizeRebalance } from './rebalance_stats';

const browser = getMonitorCostMib('browser');
const http = getMonitorCostMib('http');

describe('summarizeRebalance', () => {
  it('counts monitors per healthy agent, including idle agents', () => {
    const result = summarizeRebalance({
      monitors: [
        { id: 'm1', cost: http, currentAgentId: 'a' },
        { id: 'm2', cost: http, currentAgentId: 'a' },
      ],
      assignment: new Map([
        ['m1', 'a'],
        ['m2', 'a'],
      ]),
      healthyAgentIds: ['a', 'b'],
    });

    expect(result.monitorsPerAgent).toEqual({ a: 2, b: 0 });
    expect(result.failedOver).toBe(0);
  });

  it('separates monitors on an unhealthy agent from unpinned ones', () => {
    const result = summarizeRebalance({
      monitors: [
        { id: 'm1', cost: http, currentAgentId: 'dead' },
        { id: 'm2', cost: http },
        { id: 'm3', cost: http, currentAgentId: 'a' },
      ],
      assignment: new Map([
        ['m1', 'a'],
        ['m2', 'a'],
        ['m3', 'a'],
      ]),
      healthyAgentIds: ['a'],
    });

    expect(result.failedOver).toBe(1);
    expect(result.unpinned).toBe(1);
    expect(result.monitorsPerAgent).toEqual({ a: 3 });
  });

  it('counts browser monitors by type, not cost', () => {
    const result = summarizeRebalance({
      monitors: [
        { id: 'm1', type: 'browser', cost: 1, currentAgentId: 'a' },
        { id: 'm2', type: 'http', cost: browser, currentAgentId: 'a' },
      ],
      assignment: new Map(),
      healthyAgentIds: ['a'],
    });

    expect(result.browserMonitors).toBe(1);
  });
});
