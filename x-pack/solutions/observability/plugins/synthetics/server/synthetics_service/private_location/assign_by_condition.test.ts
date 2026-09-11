/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  agentIdCondition,
  agentIdFromCondition,
  assignedAgentIdForMonitorLocation,
  assignAgentById,
  balanceAgentsByCost,
  countMonitorsByAssignedAgent,
  isConditionShardedLocation,
  isEqlSafeLiteral,
  UNASSIGNED_CONDITION,
} from './assign_by_condition';
import { assignShard, BROWSER_COST_MIB, LIGHTWEIGHT_COST_MIB } from './assign_shards';

describe('isConditionShardedLocation', () => {
  it('is true only when the flag is on', () => {
    expect(isConditionShardedLocation({ isAgentSharding: true })).toBe(true);
    expect(isConditionShardedLocation({ isAgentSharding: false })).toBe(false);
    expect(isConditionShardedLocation({})).toBe(false);
  });
});

describe('isEqlSafeLiteral', () => {
  it('accepts ordinary agent ids', () => {
    for (const value of ['02f5bda4-1844-4d71-ae49-32b82df0390c', 'agent-id', 'agent_1']) {
      expect(isEqlSafeLiteral(value)).toBe(true);
    }
  });

  it('rejects empty, quoted, backslash or control-char values (EQL has no escapes)', () => {
    for (const value of ['', "o'brien", 'a\\b', 'line\nbreak', 'tab\tx']) {
      expect(isEqlSafeLiteral(value)).toBe(false);
    }
  });
});

describe('agentIdCondition', () => {
  it('builds an EQL equality against agent.id', () => {
    expect(agentIdCondition('agent-123')).toBe("${agent.id} == 'agent-123'");
  });

  it('throws on an agent id that is not representable as an EQL literal', () => {
    expect(() => agentIdCondition("bad'id")).toThrow();
    expect(() => agentIdCondition('')).toThrow();
  });
});

describe('agentIdFromCondition', () => {
  it('reads back the agent id stamped by agentIdCondition', () => {
    for (const agentId of ['agent-1', '02f5bda4-1844-4d71-ae49-32b82df0390c']) {
      expect(agentIdFromCondition(agentIdCondition(agentId))).toBe(agentId);
    }
  });

  it('returns undefined for empty, sentinel or unrecognised conditions', () => {
    expect(agentIdFromCondition(undefined)).toBeUndefined();
    expect(agentIdFromCondition(null)).toBeUndefined();
    expect(agentIdFromCondition('')).toBeUndefined();
    expect(agentIdFromCondition(UNASSIGNED_CONDITION)).toBeUndefined();
    expect(agentIdFromCondition("${host.id} == 'host-1'")).toBeUndefined();
    expect(agentIdFromCondition("not (${agent.id} == 'agent-1')")).toBeUndefined();
  });
});

describe('assignAgentById', () => {
  const agentIds = ['agent-a', 'agent-b', 'agent-c'];

  it('returns undefined when no agents are enrolled', () => {
    expect(assignAgentById('monitor-1', [])).toBeUndefined();
  });

  it('assigns to one enrolled agent and returns its matching condition', () => {
    const result = assignAgentById('monitor-1', agentIds)!;
    expect(agentIds).toContain(result.agentId);
    expect(result.condition).toBe(agentIdCondition(result.agentId));
  });

  it('reuses rendezvous placement over the agent ids', () => {
    for (let i = 0; i < 100; i++) {
      const id = `monitor-${i}`;
      expect(assignAgentById(id, agentIds)!.agentId).toBe(assignShard(id, agentIds));
    }
  });

  it('is deterministic and order-independent', () => {
    const reversed = [...agentIds].reverse();
    for (let i = 0; i < 100; i++) {
      const id = `monitor-${i}`;
      expect(assignAgentById(id, agentIds)!.agentId).toBe(assignAgentById(id, reversed)!.agentId);
    }
  });

  it('moves only the departed agent’s monitors when an agent leaves', () => {
    const ids = Array.from({ length: 500 }, (_, i) => `monitor-${i}`);
    const before = new Map(ids.map((id) => [id, assignAgentById(id, agentIds)!.agentId]));
    const survivors = ['agent-a', 'agent-b'];

    for (const id of ids) {
      const now = assignAgentById(id, survivors)!.agentId;
      if (before.get(id) !== 'agent-c') {
        expect(now).toBe(before.get(id));
      }
    }
  });
});

describe('countMonitorsByAssignedAgent', () => {
  const locationId = 'loc-1';

  it('counts unique monitors per stamped agent id and skips unassigned', () => {
    const counts = countMonitorsByAssignedAgent(
      [
        { id: `mon-a-${locationId}`, condition: agentIdCondition('agent-a') },
        { id: `mon-b-${locationId}`, condition: agentIdCondition('agent-a') },
        { id: `mon-c-${locationId}`, condition: agentIdCondition('agent-b') },
        { id: `mon-d-${locationId}`, condition: UNASSIGNED_CONDITION },
        { id: `mon-e-${locationId}`, condition: null },
      ],
      locationId
    );

    expect(counts.get('agent-a')).toBe(2);
    expect(counts.get('agent-b')).toBe(1);
    expect(counts.has('__synthetics_unassigned__')).toBe(false);
    expect(counts.size).toBe(2);
  });

  it('counts a new-format policy and its leftover legacy twin as one monitor', () => {
    const counts = countMonitorsByAssignedAgent(
      [
        { id: `mon-1-${locationId}`, condition: agentIdCondition('agent-a') },
        { id: `mon-1-${locationId}-default`, condition: agentIdCondition('agent-a') },
        { id: `mon-2-${locationId}`, condition: agentIdCondition('agent-b') },
      ],
      locationId
    );

    expect(counts.get('agent-a')).toBe(1);
    expect(counts.get('agent-b')).toBe(1);
    expect(counts.size).toBe(2);
  });

  it('prefers the new-format policy when a twin is pinned to a different agent', () => {
    const counts = countMonitorsByAssignedAgent(
      [
        { id: `mon-1-${locationId}-default`, condition: agentIdCondition('legacy-agent') },
        { id: `mon-1-${locationId}`, condition: agentIdCondition('new-agent') },
      ],
      locationId
    );

    expect(counts.get('new-agent')).toBe(1);
    expect(counts.has('legacy-agent')).toBe(false);
  });
});

describe('assignedAgentIdForMonitorLocation', () => {
  it('prefers the new-format package policy over a legacy space-suffixed id', () => {
    const agentId = assignedAgentIdForMonitorLocation(
      [
        { id: 'mon-1-loc-1-default', condition: agentIdCondition('legacy-agent') },
        { id: 'mon-1-loc-1', condition: agentIdCondition('new-agent') },
      ],
      'mon-1',
      'loc-1',
      'default'
    );

    expect(agentId).toBe('new-agent');
  });

  it('falls back to a legacy space-suffixed policy when the new id is absent', () => {
    const agentId = assignedAgentIdForMonitorLocation(
      [{ id: 'mon-1-loc-1-default', condition: agentIdCondition('legacy-agent') }],
      'mon-1',
      'loc-1',
      'default'
    );

    expect(agentId).toBe('legacy-agent');
  });

  it('does not treat a prefix-matching unrelated policy as the legacy twin', () => {
    expect(
      assignedAgentIdForMonitorLocation(
        [{ id: 'mon-1-loc-1-other-space', condition: agentIdCondition('other-agent') }],
        'mon-1',
        'loc-1',
        'default'
      )
    ).toBeUndefined();
  });

  it('returns undefined when no matching policy is assigned', () => {
    expect(assignedAgentIdForMonitorLocation([], 'mon-1', 'loc-1', 'default')).toBeUndefined();
    expect(
      assignedAgentIdForMonitorLocation(
        [{ id: 'mon-1-loc-1', condition: UNASSIGNED_CONDITION }],
        'mon-1',
        'loc-1',
        'default'
      )
    ).toBeUndefined();
  });
});

describe('balanceAgentsByCost', () => {
  const agentIds = ['agent-a', 'agent-b', 'agent-c'];

  it('assigns every monitor to an enrolled agent with a matching condition', () => {
    const monitors = Array.from({ length: 30 }, (_, i) => ({
      id: `monitor-${i}`,
      cost: i % 5 === 0 ? BROWSER_COST_MIB : LIGHTWEIGHT_COST_MIB,
    }));
    const result = balanceAgentsByCost(monitors, agentIds);

    expect(result.size).toBe(monitors.length);
    for (const { agentId, condition } of result.values()) {
      expect(agentIds).toContain(agentId);
      expect(condition).toBe(agentIdCondition(agentId));
    }
  });

  it('spreads browser monitors across agents rather than piling them on one', () => {
    const monitors = Array.from({ length: 9 }, (_, i) => ({
      id: `browser-${i}`,
      cost: BROWSER_COST_MIB,
    }));
    const byAgentId: Record<string, number> = {};
    for (const { agentId } of balanceAgentsByCost(monitors, agentIds).values()) {
      byAgentId[agentId] = (byAgentId[agentId] ?? 0) + 1;
    }
    for (const agentId of agentIds) {
      expect(byAgentId[agentId]).toBe(3);
    }
  });
});
