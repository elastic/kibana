/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignalEntry, SignificantEvent } from '@kbn/significant-events-schema';
import { agentLifecycle } from './agent_lifecycle';

const latest = (status: SignificantEvent['status']): SignificantEvent =>
  ({ event_id: 'e1', status } as SignificantEvent);

const signal = (rule: string, verdict: SignalEntry['verdict']): SignalEntry =>
  ({
    type: 'detection',
    stream_name: 'logs',
    description: `${rule} ${verdict}`,
    verdict,
    metadata: { rule_uuid: rule, rule_name: rule },
  } as SignalEntry);

const breaching = [signal('a', 'confirms'), signal('b', 'confirms')];
const oneHealthy = [signal('a', 'refutes'), signal('b', 'confirms')];
const allHealthy = [signal('a', 'refutes'), signal('b', 'refutes')];

describe('agentLifecycle: the status comes from the members, never from the agent', () => {
  it('opens a new event as active on a breach', () => {
    expect(agentLifecycle({ latest: undefined, signals: breaching })).toEqual({
      write: true,
      status: 'active',
    });
  });

  it('does not open an event from healthy members', () => {
    expect(agentLifecycle({ latest: undefined, signals: allHealthy })).toEqual({
      write: false,
      reason: 'not_a_breach',
    });
  });

  it('keeps an active event active while any member still breaches', () => {
    expect(agentLifecycle({ latest: latest('active'), signals: oneHealthy })).toEqual({
      write: true,
      status: 'active',
    });
  });

  it('starts recovery when every member is healthy', () => {
    expect(agentLifecycle({ latest: latest('active'), signals: allHealthy })).toEqual({
      write: true,
      status: 'recovering',
    });
  });

  it('returns a recovering event to active when a member breaches again', () => {
    expect(
      agentLifecycle({
        latest: latest('recovering'),
        signals: [signal('a', 'refutes'), signal('b', 'refutes'), signal('c', 'confirms')],
      })
    ).toEqual({ write: true, status: 'active' });
  });

  it('keeps a recovering event recovering while members stay healthy', () => {
    expect(agentLifecycle({ latest: latest('recovering'), signals: allHealthy })).toEqual({
      write: true,
      status: 'recovering',
    });
  });

  it('reopens a closed event on a breach, and ignores healthy members of a closed one', () => {
    expect(agentLifecycle({ latest: latest('inactive'), signals: breaching })).toEqual({
      write: true,
      status: 'active',
    });
    expect(agentLifecycle({ latest: latest('inactive'), signals: allHealthy })).toEqual({
      write: false,
      reason: 'not_a_breach',
    });
  });

  it('holds the status when a member cannot be judged', () => {
    expect(
      agentLifecycle({
        latest: latest('active'),
        signals: [signal('a', 'refutes'), signal('b', 'inconclusive')],
      })
    ).toEqual({ write: true, status: 'active' });
  });
});
