/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  assignAgentByHost,
  balanceAgentsByCost,
  hostFromCondition,
  hostNameCondition,
  isConditionShardedLocation,
} from './assign_by_condition';
import { assignShard, BROWSER_COST_MIB, LIGHTWEIGHT_COST_MIB } from './assign_shards';

describe('isConditionShardedLocation', () => {
  it('is true only when the flag is on', () => {
    expect(isConditionShardedLocation({ agentConditionSharding: true })).toBe(true);
    expect(isConditionShardedLocation({ agentConditionSharding: false })).toBe(false);
    expect(isConditionShardedLocation({})).toBe(false);
  });
});

describe('hostNameCondition', () => {
  it('builds an EQL equality against host.name', () => {
    expect(hostNameCondition('synth-agent-03')).toBe("${host.name} == 'synth-agent-03'");
  });

  it('escapes single quotes to keep the literal well-formed', () => {
    expect(hostNameCondition("o'brien-host")).toBe("${host.name} == 'o\\'brien-host'");
  });
});

describe('hostFromCondition', () => {
  it('reads back the host stamped by hostNameCondition', () => {
    for (const host of ['synth-agent-03', "o'brien-host', drop", 'a.b.c']) {
      expect(hostFromCondition(hostNameCondition(host))).toBe(host);
    }
  });

  it('returns undefined for empty or unrecognised conditions', () => {
    expect(hostFromCondition(undefined)).toBeUndefined();
    expect(hostFromCondition(null)).toBeUndefined();
    expect(hostFromCondition('')).toBeUndefined();
    expect(hostFromCondition("${host.ip} == '1.2.3.4'")).toBeUndefined();
  });
});

describe('assignAgentByHost', () => {
  const hosts = ['host-a', 'host-b', 'host-c'];

  it('returns undefined when no agents are enrolled', () => {
    expect(assignAgentByHost('monitor-1', [])).toBeUndefined();
  });

  it('assigns to one enrolled host and returns its matching condition', () => {
    const result = assignAgentByHost('monitor-1', hosts)!;
    expect(hosts).toContain(result.host);
    expect(result.condition).toBe(hostNameCondition(result.host));
  });

  it('reuses rendezvous placement (same result as assignShard over the hosts)', () => {
    for (let i = 0; i < 100; i++) {
      const id = `monitor-${i}`;
      expect(assignAgentByHost(id, hosts)!.host).toBe(assignShard(id, hosts));
    }
  });

  it('is deterministic and order-independent', () => {
    const reversed = [...hosts].reverse();
    for (let i = 0; i < 100; i++) {
      const id = `monitor-${i}`;
      expect(assignAgentByHost(id, hosts)!.host).toBe(assignAgentByHost(id, reversed)!.host);
    }
  });

  it('moves only the dead host’s monitors when a host leaves (rendezvous property)', () => {
    const ids = Array.from({ length: 500 }, (_, i) => `monitor-${i}`);
    const before = new Map(ids.map((id) => [id, assignAgentByHost(id, hosts)!.host]));

    const survivors = ['host-a', 'host-b'];
    let movedOffSurvivor = 0;
    for (const id of ids) {
      const now = assignAgentByHost(id, survivors)!.host;
      if (before.get(id) !== 'host-c' && before.get(id) !== now) {
        movedOffSurvivor++;
      }
    }
    expect(movedOffSurvivor).toBe(0);
  });
});

describe('balanceAgentsByCost', () => {
  const hosts = ['host-a', 'host-b', 'host-c'];

  it('assigns every monitor to an enrolled host with a matching condition', () => {
    const monitors = Array.from({ length: 30 }, (_, i) => ({
      id: `monitor-${i}`,
      cost: i % 5 === 0 ? BROWSER_COST_MIB : LIGHTWEIGHT_COST_MIB,
    }));
    const result = balanceAgentsByCost(monitors, hosts);

    expect(result.size).toBe(monitors.length);
    for (const { host, condition } of result.values()) {
      expect(hosts).toContain(host);
      expect(condition).toBe(hostNameCondition(host));
    }
  });

  it('spreads browser monitors across hosts rather than piling them on one', () => {
    const monitors = Array.from({ length: 9 }, (_, i) => ({
      id: `browser-${i}`,
      cost: BROWSER_COST_MIB,
    }));
    const byHost: Record<string, number> = {};
    for (const { host } of balanceAgentsByCost(monitors, hosts).values()) {
      byHost[host] = (byHost[host] ?? 0) + 1;
    }
    for (const host of hosts) {
      expect(byHost[host]).toBe(3);
    }
  });
});
