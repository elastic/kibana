/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProcessRecord } from '../../../../../common/entity_analytics/ai_security/activity/types';
import { computeAiAgentActivity } from './compute_ai_agent_activity';
import { buildAiAgentActivityUpdate } from '.';

const NOW = new Date('2026-11-27T12:00:00.000Z').getTime();

const own = (overrides: Partial<ProcessRecord> & { entityId: string }): ProcessRecord => ({
  timestamp: '2026-11-27T10:00:00.000Z',
  ancestry: [],
  unorderedArgs: [],
  isDescendant: false,
  hasExec: true,
  userName: 'ec2-user',
  ...overrides,
});

/** A cron launch: crond is the entry leader, which Defend reports as `init`. */
const nightly = (day: string, overrides: Partial<ProcessRecord> = {}): ProcessRecord =>
  own({
    entityId: `cron-${day}`,
    timestamp: `${day}T02:00:00.000Z`,
    parentEntityId: 'crond-shell',
    entryMetaType: 'init',
    interactive: false,
    unorderedArgs: ['-p', 'claude', 'run the nightly checks'],
    ...overrides,
  });

const activityOf = (ownEvents: ProcessRecord[], agentName = 'claude_code') =>
  computeAiAgentActivity({ agentName, ownEvents, now: NOW });

describe('computeAiAgentActivity', () => {
  it('counts sessions, active UTC days, unattended and permission bypass sessions', () => {
    expect(
      activityOf([
        nightly('2026-11-25'),
        nightly('2026-11-26'),
        nightly('2026-11-27', {
          unorderedArgs: ['--dangerously-skip-permissions', '-p', 'claude', 'fix the issue'],
        }),
        own({
          entityId: 'laptop',
          timestamp: '2026-11-27T09:00:00.000Z',
          entryMetaType: 'sshd',
          interactive: true,
        }),
      ])
    ).toEqual({
      sessions: 4,
      active_days: 3,
      unattended_sessions: 3,
      permission_bypass_sessions: 1,
      computed_at: '2026-11-27T12:00:00.000Z',
    });
  });

  it('counts a launch and its re-execs as one session, as the flyout does', () => {
    const root = own({ entityId: 'root', parentEntityId: 'shell', interactive: true });
    const reexec = own({
      entityId: 'reexec',
      parentEntityId: 'root',
      timestamp: '2026-11-27T10:00:01.000Z',
    });
    // Defend sends a fork and an exec for one process.
    const fork = { ...root, hasExec: false };

    expect(activityOf([reexec, root, fork])).toMatchObject({ sessions: 1, active_days: 1 });
  });

  it('treats scripted launches as unattended and interactive or unknown ones as attended', () => {
    expect(
      activityOf([
        own({ entityId: 'script', entryMetaType: 'container', interactive: false }),
        own({ entityId: 'person', entryMetaType: 'terminal', interactive: true }),
        own({ entityId: 'unknown' }),
      ])
    ).toMatchObject({ sessions: 3, unattended_sessions: 1 });
  });

  it("uses each product's own permission flags", () => {
    expect(
      activityOf(
        [
          own({ entityId: 'yolo', unorderedArgs: ['--yolo', 'cursor-agent'] }),
          own({ entityId: 'claude-flag', unorderedArgs: ['--dangerously-skip-permissions'] }),
        ],
        'cursor'
      )
    ).toMatchObject({ sessions: 2, permission_bypass_sessions: 1 });
  });

  it('writes zeros for an installed agent with no sessions in the window', () => {
    expect(activityOf([])).toEqual({
      sessions: 0,
      active_days: 0,
      unattended_sessions: 0,
      permission_bypass_sessions: 0,
      computed_at: '2026-11-27T12:00:00.000Z',
    });
  });

  it('writes the whole object on the agent row', () => {
    const activity = activityOf([]);
    expect(buildAiAgentActivityUpdate('ai_agent:claude_code@h1@ec2-user', activity)).toEqual({
      type: 'ai_agent',
      doc: {
        entity: {
          id: 'ai_agent:claude_code@h1@ec2-user',
          attributes: { ai_agent_activity: activity },
        },
      },
    });
  });
});
