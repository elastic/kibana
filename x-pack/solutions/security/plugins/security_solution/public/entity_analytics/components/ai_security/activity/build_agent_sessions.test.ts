/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment-timezone';
import {
  buildAgentSessions,
  buildSessionDays,
  buildSessionDetail,
  getSessionsWindow,
  getSessionWindow,
  summariseSessions,
} from './build_agent_sessions';
import type { BuildAgentSessionsParams } from './build_agent_sessions';
import type { ProcessRecord, RunAlertRecord } from './types';
import type { AgentIdentity } from '../types';

const identity: AgentIdentity = {
  entityId: 'ai_agent:claude_code@host-1@ec2-user',
  agentName: 'claude_code',
  hostId: 'host-1',
  userName: 'ec2-user',
};

const NOW = new Date('2026-11-27T12:00:00.000Z').getTime();
const WINDOW = getSessionsWindow(NOW);

const own = (overrides: Partial<ProcessRecord> & { entityId: string }): ProcessRecord => ({
  timestamp: '2026-11-27T10:00:00.000Z',
  ancestry: [],
  unorderedArgs: [],
  isDescendant: false,
  hasExec: true,
  userName: 'ec2-user',
  ...overrides,
});

const descendant = (overrides: Partial<ProcessRecord> & { entityId: string }): ProcessRecord =>
  own({ isDescendant: true, ...overrides });

const alert = (overrides: Partial<RunAlertRecord> & { id: string }): RunAlertRecord => ({
  timestamp: '2026-11-27T11:00:00.000Z',
  ancestry: [],
  ...overrides,
});

const build = (params: Partial<BuildAgentSessionsParams> & { ownEvents: ProcessRecord[] }) =>
  buildAgentSessions({ identity, window: WINDOW, now: NOW, ...params });

describe('getSessionsWindow', () => {
  it('covers the last 30 days ending now, whatever the agent was first seen', () => {
    expect(WINDOW).toEqual({
      from: '2026-10-28T12:00:00.000Z',
      to: '2026-11-27T12:00:00.000Z',
    });
  });
});

describe('buildAgentSessions', () => {
  it('makes one session per launch, with its re-execs, newest first', () => {
    const { sessions } = build({
      ownEvents: [
        own({ entityId: 'launch-1', timestamp: '2026-11-26T09:00:00.000Z' }),
        own({
          entityId: 'reexec-1',
          parentEntityId: 'launch-1',
          timestamp: '2026-11-26T09:00:01.000Z',
        }),
        own({
          entityId: 'launch-2',
          parentEntityId: 'bash',
          timestamp: '2026-11-27T09:00:00.000Z',
        }),
      ],
    });
    expect(sessions.map(({ id }) => id)).toEqual(['launch-2', 'launch-1']);
  });

  it('reads launch mode, headless and permission prompts off from the launch', () => {
    const [session] = build({
      ownEvents: [
        own({
          entityId: 'launch',
          entryMetaType: 'init',
          commandLine: 'claude -p fix the build --dangerously-skip-permissions',
        }),
      ],
    }).sessions;
    expect(session).toMatchObject({
      launchMode: 'scheduled',
      isHeadless: true,
      permissionPromptsOff: true,
    });
  });

  it('ends a session at the last end event of its own processes', () => {
    const [session] = build({
      ownEvents: [
        own({ entityId: 'launch' }),
        own({ entityId: 'reexec', parentEntityId: 'launch' }),
      ],
      endTimes: new Map([
        ['launch', '2026-11-27T10:04:00.000Z'],
        ['reexec', '2026-11-27T10:05:00.000Z'],
      ]),
    }).sessions;
    expect(session.status).toEqual({ kind: 'ended' });
    expect(session.end).toBe('2026-11-27T10:05:00.000Z');
  });

  it('marks a session running without an end event, and stale after a day', () => {
    const { sessions } = build({
      ownEvents: [
        own({ entityId: 'recent', timestamp: '2026-11-27T11:00:00.000Z' }),
        own({ entityId: 'old', timestamp: '2026-11-20T11:00:00.000Z' }),
      ],
      endTimes: new Map(),
    });
    expect(sessions.map(({ status }) => status)).toEqual([
      { kind: 'running' },
      { kind: 'stale', since: '2026-11-20T11:00:00.000Z' },
    ]);
    expect(sessions.every(({ end }) => end === undefined)).toBe(true);
  });

  it('leaves the status unknown when end events could not be read', () => {
    const [session] = build({ ownEvents: [own({ entityId: 'launch' })] }).sessions;
    expect(session.status).toBeUndefined();
  });

  it('ties alerts on its own processes and their children by ID', () => {
    const [session] = build({
      ownEvents: [own({ entityId: 'launch' })],
      endTimes: new Map([['launch', '2026-11-27T10:10:00.000Z']]),
      alerts: [
        alert({ id: 'on-launch', processEntityId: 'launch' }),
        alert({ id: 'on-child', processEntityId: 'curl', parentEntityId: 'launch' }),
      ],
    }).sessions;
    expect(session.alertIds).toEqual(['on-launch', 'on-child']);
  });

  it('ties an alert on a deeper descendant by terminal session and event time', () => {
    const { sessions } = build({
      ownEvents: [
        own({
          entityId: 'night',
          timestamp: '2026-11-26T02:00:00.000Z',
          entryLeaderEntityId: 'cron-1',
        }),
        own({
          entityId: 'today',
          timestamp: '2026-11-27T10:00:00.000Z',
          entryLeaderEntityId: 'cron-2',
        }),
      ],
      endTimes: new Map([
        ['night', '2026-11-26T02:10:00.000Z'],
        ['today', '2026-11-27T10:10:00.000Z'],
      ]),
      alerts: [
        alert({
          id: 'deep',
          processEntityId: 'grandchild',
          parentEntityId: 'child',
          eventTime: '2026-11-27T10:03:00.000Z',
          entryLeaderEntityId: 'cron-2',
        }),
        alert({
          id: 'outside',
          processEntityId: 'other',
          parentEntityId: 'child',
          eventTime: '2026-11-26T05:00:00.000Z',
        }),
      ],
    });
    expect(sessions.map(({ id, alertIds }) => [id, alertIds])).toEqual([
      ['today', ['deep']],
      ['night', []],
    ]);
  });

  it('leaves out an alert that two overlapping sessions could both own', () => {
    const { sessions } = build({
      ownEvents: [own({ entityId: 'a' }), own({ entityId: 'b' })],
      endTimes: new Map([
        ['a', '2026-11-27T10:10:00.000Z'],
        ['b', '2026-11-27T10:10:00.000Z'],
      ]),
      alerts: [alert({ id: 'deep', processEntityId: 'x', eventTime: '2026-11-27T10:05:00.000Z' })],
    });
    expect(sessions.flatMap(({ alertIds }) => alertIds)).toEqual([]);
  });
});

describe('getSessionWindow', () => {
  it('reaches past an ended session, to now for a running one and a day for a stale one', () => {
    expect(
      getSessionWindow({ start: '2026-11-27T10:00:00.000Z', end: '2026-11-27T10:10:00.000Z' }, NOW)
    ).toEqual({ from: '2026-11-27T10:00:00.000Z', to: '2026-11-27T10:15:00.000Z' });
    expect(getSessionWindow({ start: '2026-11-27T10:00:00.000Z' }, NOW).to).toBe(
      '2026-11-27T12:00:00.000Z'
    );
    expect(getSessionWindow({ start: '2026-11-20T10:00:00.000Z' }, NOW).to).toBe(
      '2026-11-21T10:00:00.000Z'
    );
  });
});

describe('buildSessionDays', () => {
  beforeAll(() => moment.tz.setDefault('UTC'));
  afterAll(() => moment.tz.setDefault());

  it('counts sessions per day across the window, keeping days with none as zero', () => {
    const { sessions } = build({
      ownEvents: [
        own({ entityId: 'a', timestamp: '2026-11-25T02:00:00.000Z' }),
        own({ entityId: 'b', timestamp: '2026-11-27T02:00:00.000Z' }),
        own({ entityId: 'c', timestamp: '2026-11-27T09:00:00.000Z' }),
      ],
      alerts: [alert({ id: 'x', processEntityId: 'c' })],
    });
    const days = buildSessionDays(sessions, {
      from: '2026-11-25T12:00:00.000Z',
      to: '2026-11-27T12:00:00.000Z',
    });
    expect(days).toEqual([
      { day: Date.parse('2026-11-25T00:00:00.000Z'), sessions: 1, sessionsWithAlerts: 0 },
      { day: Date.parse('2026-11-26T00:00:00.000Z'), sessions: 0, sessionsWithAlerts: 0 },
      { day: Date.parse('2026-11-27T00:00:00.000Z'), sessions: 2, sessionsWithAlerts: 1 },
    ]);
  });

  it('has a bar for every day of the 30-day window', () => {
    expect(buildSessionDays([], WINDOW)).toHaveLength(31);
  });
});

describe('summariseSessions', () => {
  it('splits sessions by launch mode and counts the flags', () => {
    const { sessions } = build({
      ownEvents: [
        own({ entityId: 'cron', entryMetaType: 'init', commandLine: 'claude -p nightly' }),
        own({ entityId: 'tty', interactive: true }),
        own({
          entityId: 'ssh',
          entryMetaType: 'sshd',
          commandLine: 'claude -p go --dangerously-skip-permissions',
        }),
      ],
      alerts: [alert({ id: 'x', processEntityId: 'ssh' })],
    });
    expect(summariseSessions(sessions)).toEqual({
      byLaunchMode: { scheduled: 1, interactive: 1, scripted: 1, unknown: 0 },
      headless: 2,
      permissionPromptsOff: 1,
      withAlerts: 1,
    });
  });
});

describe('buildSessionDetail', () => {
  it("builds one session's run and places a concurrent session's commands there, not here", () => {
    const sessions = build({
      ownEvents: [own({ entityId: 'mine' }), own({ entityId: 'theirs' })],
      endTimes: new Map([
        ['mine', '2026-11-27T10:10:00.000Z'],
        ['theirs', '2026-11-27T10:10:00.000Z'],
      ]),
      alerts: [alert({ id: 'deep', processEntityId: 'rm', ancestry: ['npm', 'mine'] })],
    });
    const [mine] = sessions.sessions.filter(({ id }) => id === 'mine');
    const detail = buildSessionDetail({
      identity,
      sessions,
      session: mine,
      descendantEvents: [
        descendant({ entityId: 'npm', parentEntityId: 'mine', commandLine: 'npm test' }),
        descendant({ entityId: 'git', parentEntityId: 'theirs', commandLine: 'git push' }),
      ],
      sideEffects: new Map(),
      otelEvents: [],
      otelMatch: 'none',
    });
    const commands = detail.run?.sections.flatMap(({ steps }) =>
      steps.flatMap((step) => (step.kind === 'process' ? [step.process.commandLine] : []))
    );
    expect(commands).toEqual(['npm test']);
    expect(detail.unplacedSteps).toEqual([]);
    expect(detail.run?.alertIds).toEqual(['deep']);
  });
});
