/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ACTIVITY_MAX_PROCESS_EVENTS } from '../../../../../common/entity_analytics/ai_security/activity/constants';
import { groupOwnEventsByAgent, toAgentIdentity } from './read_activity_events';

const agentA = {
  entityId: 'ai_agent:claude_code@h1@ec2-user',
  agentName: 'claude_code',
  hostId: 'h1',
  userName: 'ec2-user',
};
const agentB = {
  entityId: 'ai_agent:claude_code@h1@root',
  agentName: 'claude_code',
  hostId: 'h1',
  userName: 'root',
};

const row = (entityId: string, userName: string, timestamp: string) => ({
  '@timestamp': timestamp,
  'event.action': ['exec'],
  'process.entity_id': entityId,
  'process.ai_agent.name': 'claude_code',
  'host.id': 'h1',
  'user.name': userName,
});

describe('read_activity_events', () => {
  it('reads an agent identity from the fields API and skips incomplete rows', () => {
    expect(
      toAgentIdentity({
        'entity.id': [agentA.entityId],
        'process.ai_agent.name': ['claude_code'],
        'host.id': ['h1'],
        'user.name': ['ec2-user'],
      })
    ).toEqual(agentA);
    expect(toAgentIdentity({ 'entity.id': [agentA.entityId] })).toBeUndefined();
    expect(toAgentIdentity(undefined)).toBeUndefined();
  });

  it('splits a batched read by agent, newest first, with an empty list for an idle agent', () => {
    const idle = { ...agentB, entityId: 'ai_agent:cursor@h1@root', agentName: 'cursor' };
    const events = groupOwnEventsByAgent(
      [agentA, agentB, idle],
      [
        row('a-old', 'ec2-user', '2026-11-01T00:00:00.000Z'),
        row('b-1', 'root', '2026-11-02T00:00:00.000Z'),
        row('a-new', 'ec2-user', '2026-11-03T00:00:00.000Z'),
        row('other', 'nobody', '2026-11-03T00:00:00.000Z'),
      ]
    );

    expect(events.get(agentA.entityId)?.map(({ entityId }) => entityId)).toEqual([
      'a-new',
      'a-old',
    ]);
    expect(events.get(agentB.entityId)?.map(({ entityId }) => entityId)).toEqual(['b-1']);
    expect(events.get(idle.entityId)).toEqual([]);
  });

  it("keeps each agent's newest events up to the flyout's limit", () => {
    const rows = Array.from({ length: ACTIVITY_MAX_PROCESS_EVENTS + 1 }, (_, i) =>
      row(`p-${i}`, 'ec2-user', new Date(Date.UTC(2026, 10, 1) + i * 1000).toISOString())
    );
    const events = groupOwnEventsByAgent([agentA], rows).get(agentA.entityId) ?? [];

    expect(events).toHaveLength(ACTIVITY_MAX_PROCESS_EVENTS);
    expect(events[0].entityId).toBe(`p-${ACTIVITY_MAX_PROCESS_EVENTS}`);
    expect(events.some(({ entityId }) => entityId === 'p-0')).toBe(false);
  });
});
