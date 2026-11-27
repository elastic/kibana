/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentSession, ProcessRecord } from './types';
import { summariseSessionCommands } from './session_commands';

const proc = (overrides: Partial<ProcessRecord> & { entityId: string }): ProcessRecord => ({
  timestamp: '2026-11-26T10:00:00.000Z',
  ancestry: [],
  unorderedArgs: [],
  isDescendant: true,
  hasExec: true,
  ...overrides,
});

const root = proc({ entityId: 'agent', isDescendant: false });
const reExec = proc({ entityId: 'agent-2', parentEntityId: 'agent', isDescendant: false });
const other = proc({ entityId: 'other-agent', isDescendant: false });
const session = (record: ProcessRecord) => ({ id: record.entityId, root: record } as AgentSession);
const input = { sessions: [session(root), session(other)], ownEvents: [root, reExec, other] };

describe('summariseSessionCommands', () => {
  it('names the commands under each session, most used first, without shell wrappers', () => {
    const result = summariseSessionCommands(input, [
      proc({
        entityId: 'sh',
        parentEntityId: 'agent-2',
        ancestry: ['agent-2', 'agent'],
        name: 'bash',
      }),
      proc({ entityId: 'g1', parentEntityId: 'sh', ancestry: ['sh', 'agent-2'], name: 'git' }),
      proc({ entityId: 'g2', parentEntityId: 'sh', ancestry: ['sh', 'agent-2'], name: 'git' }),
      proc({ entityId: 'c', parentEntityId: 'sh', ancestry: ['sh', 'agent-2'], name: 'curl' }),
      proc({ entityId: 'o', parentEntityId: 'other-agent', name: 'ls' }),
    ]);
    expect(result.get('agent')).toEqual({ count: 3, names: ['git', 'curl'] });
    expect(result.get('other-agent')).toEqual({ count: 1, names: ['ls'] });
  });

  it('leaves out commands whose parent the query dropped as setup', () => {
    const result = summariseSessionCommands(input, [
      proc({
        entityId: 'nvm-sed',
        parentEntityId: 'snapshot-shell',
        ancestry: ['snapshot-shell', 'agent'],
        name: 'sed',
      }),
      proc({ entityId: 'g', parentEntityId: 'agent', name: 'git' }),
    ]);
    expect(result.get('agent')).toEqual({ count: 1, names: ['git'] });
  });

  it('merges fork and exec events of one process', () => {
    const result = summariseSessionCommands(input, [
      proc({ entityId: 't', parentEntityId: 'agent', name: 'tar', hasExec: false }),
      proc({ entityId: 't', parentEntityId: 'agent', name: 'tar' }),
    ]);
    expect(result.get('agent')).toEqual({ count: 1, names: ['tar'] });
  });
});
