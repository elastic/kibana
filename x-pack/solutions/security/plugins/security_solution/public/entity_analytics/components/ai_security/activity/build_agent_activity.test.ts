/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildAgentActivity,
  buildRunReach,
  getRunAlertIds,
  getRunStatus,
  hasPermissionBypass,
  isInsideDirectory,
  isSetupProcess,
  mergeProcessEvents,
  parseHeadlessPrompt,
  toEndedProcessIds,
  toOtelRecord,
  toProcessEvent,
  toRunAlert,
} from './build_agent_activity';
import type { OtelRecord, ProcessRecord, ProcessStep, SideEffects } from './types';
import type { AgentIdentity } from '../types';

const identity: AgentIdentity = {
  entityId: 'ai_agent:claude_code@host-1@ec2-user',
  agentName: 'claude_code',
  hostId: 'host-1',
  userName: 'ec2-user',
};

const proc = (overrides: Partial<ProcessRecord> & { entityId: string }): ProcessRecord => ({
  timestamp: '2026-11-26T10:00:00.000Z',
  ancestry: [],
  unorderedArgs: [],
  isDescendant: true,
  hasExec: true,
  userName: 'ec2-user',
  ...overrides,
});

const build = (
  params: Partial<Parameters<typeof buildAgentActivity>[0]> & {
    ownEvents: ProcessRecord[];
  }
) =>
  buildAgentActivity({
    identity,
    descendantEvents: [],
    sideEffects: new Map(),
    otelEvents: [],
    otelMatch: 'session',
    ...params,
  });

const processSteps = (steps: ReadonlyArray<{ kind: string }>): ProcessStep[] =>
  steps.filter((step): step is ProcessStep => step.kind === 'process');

describe('buildAgentActivity', () => {
  it('places a sudo child that runs as root under the agent that ran it, by ancestry', () => {
    const agent = proc({
      entityId: 'agent',
      parentEntityId: 'bash',
      isDescendant: false,
      commandLine: 'claude -p Restart nginx --output-format json',
    });
    const sudo = proc({
      entityId: 'sudo',
      parentEntityId: 'shell-not-collected',
      ancestry: ['agent', 'bash'],
      userName: 'root',
      name: 'sudo',
      timestamp: '2026-11-26T10:00:05.000Z',
    });
    const systemctl = proc({
      entityId: 'systemctl',
      parentEntityId: 'sudo',
      userName: 'root',
      name: 'systemctl',
      timestamp: '2026-11-26T10:00:06.000Z',
    });
    // Root's own install on the same host: its descendants must not land on the ec2-user agent.
    const rootAgentChild = proc({
      entityId: 'root-child',
      parentEntityId: 'root-agent',
      ancestry: ['root-agent'],
      userName: 'root',
      timestamp: '2026-11-26T10:09:00.000Z',
    });

    const activity = build({
      ownEvents: [agent],
      descendantEvents: [sudo, systemctl, rootAgentChild],
    });

    expect(activity.runs).toHaveLength(1);
    const steps = processSteps(activity.runs[0].sections.flatMap((section) => section.steps));
    expect(steps.map((step) => step.process.entityId)).toEqual(['sudo', 'systemctl']);
    expect(steps[0].ranAsOtherUser).toBe('root');
    expect(activity.unplacedSteps).toHaveLength(0);
  });

  it('keeps steps whose fields are missing instead of hiding them', () => {
    const activity = build({
      ownEvents: [proc({ entityId: 'agent', isDescendant: false })],
      descendantEvents: [proc({ entityId: 'bare', parentEntityId: 'agent', hasExec: false })],
    });

    const steps = processSteps(activity.runs[0].sections[0].steps);
    expect(steps).toHaveLength(1);
    expect(steps[0].process.name).toBeUndefined();
    expect(steps[0].process.commandLine).toBeUndefined();
  });

  it('reports every missing layer when only Defend events without session IDs exist', () => {
    const activity = build({
      ownEvents: [proc({ entityId: 'agent', isDescendant: false, interactive: true })],
    });

    expect(activity.layers).toEqual({
      defendRuns: true,
      sessionIds: false,
      headlessPrompts: false,
      otelEvents: false,
      otelToolCalls: false,
      otelPrompts: false,
    });
    expect(activity.runs[0].launchMode).toBe('interactive');
    expect(activity.otelMatch).toBe('none');
  });

  it('reports no Defend runs when the agent has no process events', () => {
    const activity = build({ ownEvents: [] });
    expect(activity.runs).toEqual([]);
    expect(activity.layers.defendRuns).toBe(false);
  });

  it('groups steps by session, keeping steps before the session ID in the session in progress', () => {
    const agent = proc({ entityId: 'agent', isDescendant: false, entryMetaType: 'sshd' });
    const activity = build({
      ownEvents: [agent],
      descendantEvents: [
        proc({ entityId: 'a', parentEntityId: 'agent', sessionId: 's1', timestamp: 'T1' }),
        proc({ entityId: 'b', parentEntityId: 'agent', timestamp: 'T2' }),
        proc({ entityId: 'c', parentEntityId: 'agent', sessionId: 's2', timestamp: 'T3' }),
      ],
    });

    const [run] = activity.runs;
    expect(run.launchMode).toBe('scripted');
    expect(run.sessionIds).toEqual(['s1', 's2']);
    expect(
      run.sections.map((section) => [
        section.sessionId,
        processSteps(section.steps).map((step) => step.process.entityId),
      ])
    ).toEqual([
      ['s1', ['a', 'b']],
      ['s2', ['c']],
    ]);
    expect(activity.layers.sessionIds).toBe(true);
  });

  it('falls back to the session ID, then keeps unplaced own-user steps, and drops other users', () => {
    const agent = proc({ entityId: 'agent', isDescendant: false });
    const activity = build({
      ownEvents: [agent],
      descendantEvents: [
        proc({ entityId: 'with-session', parentEntityId: 'agent', sessionId: 's1' }),
        proc({ entityId: 'orphan-same-session', parentEntityId: 'gone', sessionId: 's1' }),
        proc({ entityId: 'orphan-same-user', parentEntityId: 'gone' }),
        proc({ entityId: 'orphan-other-user', parentEntityId: 'gone', userName: 'other-user' }),
      ],
    });

    const placed = processSteps(activity.runs[0].sections.flatMap((section) => section.steps));
    expect(placed.map((step) => step.process.entityId).sort()).toEqual([
      'orphan-same-session',
      'with-session',
    ]);
    expect(processSteps(activity.unplacedSteps).map((step) => step.process.entityId)).toEqual([
      'orphan-same-user',
    ]);
  });

  it('treats the agent re-execs as part of the run that launched them', () => {
    const activity = build({
      ownEvents: [
        proc({ entityId: 'agent', parentEntityId: 'bash', isDescendant: false }),
        proc({ entityId: 'rg', parentEntityId: 'agent', isDescendant: false, name: 'rg' }),
      ],
      descendantEvents: [proc({ entityId: 'child-of-rg', parentEntityId: 'rg' })],
    });

    expect(activity.runs).toHaveLength(1);
    const steps = processSteps(activity.runs[0].sections[0].steps);
    expect(steps.map((step) => [step.process.entityId, step.isAgentProcess])).toEqual([
      ['rg', true],
      ['child-of-rg', false],
    ]);
  });

  it('merges OTel prompts and tool calls into the session that matches Defend', () => {
    const otel: OtelRecord[] = [
      {
        timestamp: 'T1',
        conversationId: 's1',
        eventName: 'user_prompt',
        prompt: 'Fix the tests',
        isMock: true,
      },
      { timestamp: 'T2', conversationId: 's1', eventName: 'api_request', model: 'm', isMock: true },
      {
        timestamp: 'T3',
        conversationId: 's1',
        eventName: 'tool_result',
        toolName: 'Bash',
        commandLine: 'npm test',
        isMock: true,
      },
      { timestamp: 'T4', conversationId: 'other-install', eventName: 'user_prompt', isMock: true },
    ];
    const activity = build({
      ownEvents: [proc({ entityId: 'agent', isDescendant: false })],
      descendantEvents: [proc({ entityId: 'npm', parentEntityId: 'agent', sessionId: 's1' })],
      otelEvents: otel,
    });

    const [section] = activity.runs[0].sections;
    expect(section.steps.map((step) => step.kind)).toEqual(['process', 'prompt', 'tool_call']);
    expect(section.modelUsage).toEqual({
      requests: 1,
      models: ['m'],
      inputTokens: 0,
      outputTokens: 0,
    });
    expect(activity.layers).toMatchObject({
      otelEvents: true,
      otelToolCalls: true,
      otelPrompts: true,
    });
    expect(activity.otelMatch).toBe('session');
  });

  it('says prompts are missing when OTel logs prompt events without text', () => {
    const activity = build({
      ownEvents: [proc({ entityId: 'agent', isDescendant: false, sessionId: 's1' })],
      otelEvents: [
        { timestamp: 'T1', conversationId: 's1', eventName: 'user_prompt', isMock: false },
      ],
    });
    expect(activity.layers.otelEvents).toBe(true);
    expect(activity.layers.otelPrompts).toBe(false);
  });

  it('places OTel matched by account into the run active at that time', () => {
    const activity = build({
      ownEvents: [
        proc({ entityId: 'agent', isDescendant: false, timestamp: '2026-11-26T10:00:00.000Z' }),
      ],
      otelEvents: [
        {
          timestamp: '2026-11-26T10:01:00.000Z',
          eventName: 'tool_result',
          toolName: 'Read',
          isMock: true,
        },
        { timestamp: '2026-11-27T10:00:00.000Z', eventName: 'tool_result', isMock: true },
      ],
      otelMatch: 'account',
    });
    expect(activity.runs[0].sections.flatMap((section) => section.steps)).toHaveLength(1);
    expect(activity.otelMatch).toBe('account');
  });

  it('reads the headless prompt from ordered arguments when the caller has them', () => {
    const activity = build({
      ownEvents: [proc({ entityId: 'agent', isDescendant: false, commandLine: 'claude -p x' })],
      rootArgs: new Map([['agent', ['claude', '-p', 'Restart nginx', '--output-format', 'json']]]),
    });
    expect(activity.runs[0]).toMatchObject({ isHeadless: true, headlessPrompt: 'Restart nginx' });
    expect(activity.layers.headlessPrompts).toBe(true);
  });
});

describe('setup steps', () => {
  it('treats the children of a setup command as setup', () => {
    const activity = build({
      ownEvents: [proc({ entityId: 'agent', isDescendant: false })],
      descendantEvents: [
        proc({
          entityId: 'snapshot',
          parentEntityId: 'agent',
          commandLine: 'bash -c -l SNAPSHOT_FILE=/tmp/x',
          timestamp: 'T1',
        }),
        proc({ entityId: 'sed', parentEntityId: 'snapshot', name: 'sed', timestamp: 'T2' }),
        proc({
          entityId: 'npm',
          parentEntityId: 'agent',
          commandLine: 'npm test',
          timestamp: 'T3',
        }),
      ],
    });
    const steps = processSteps(activity.runs[0].sections[0].steps);
    expect(steps.map((step) => [step.process.entityId, step.isSetup])).toEqual([
      ['snapshot', true],
      ['sed', true],
      ['npm', false],
    ]);
  });
});

describe('parseHeadlessPrompt', () => {
  it('reads the prompt after -p from arguments', () => {
    expect(parseHeadlessPrompt(['claude', '-p', 'Do it', '--x'], undefined)).toEqual({
      isHeadless: true,
      prompt: 'Do it',
    });
  });

  it('flags a headless run whose prompt is not next to -p', () => {
    expect(parseHeadlessPrompt(['claude', '-p', '--output-format', 'json'], undefined)).toEqual({
      isHeadless: true,
      prompt: undefined,
    });
  });

  it('falls back to the command line up to the next flag', () => {
    expect(
      parseHeadlessPrompt(undefined, 'claude -p Restart nginx and check it. --allowedTools Bash')
    ).toEqual({ isHeadless: true, prompt: 'Restart nginx and check it.' });
  });

  it('is not headless for an interactive launch', () => {
    expect(parseHeadlessPrompt(['claude'], 'claude')).toEqual({ isHeadless: false });
    expect(parseHeadlessPrompt(undefined, undefined)).toEqual({ isHeadless: false });
  });
});

describe('mergeProcessEvents', () => {
  it('prefers the exec event and keeps the earliest time and any session ID', () => {
    const merged = mergeProcessEvents([
      proc({ entityId: 'p', hasExec: false, timestamp: 'T1', sessionId: 's1' }),
      proc({ entityId: 'p', hasExec: true, timestamp: 'T2', commandLine: 'git status' }),
    ]);
    expect(merged.get('p')).toMatchObject({
      timestamp: 'T1',
      commandLine: 'git status',
      sessionId: 's1',
      hasExec: true,
    });
  });
});

describe('isSetupProcess', () => {
  it('flags the Bash tool preamble and git probes, not the commands the agent ran', () => {
    expect(isSetupProcess(proc({ entityId: 'e', name: 'env' }))).toBe(true);
    expect(
      isSetupProcess(proc({ entityId: 'g', commandLine: 'git -c core.hooksPath=/dev/null status' }))
    ).toBe(true);
    expect(
      isSetupProcess(proc({ entityId: 's', commandLine: 'sudo systemctl restart nginx' }))
    ).toBe(false);
    expect(isSetupProcess(proc({ entityId: 'a', name: 'env', isDescendant: false }))).toBe(false);
    expect(
      isSetupProcess(
        proc({ entityId: 'p', name: 'git', unorderedArgs: ['core.hooksPath=/dev/null', 'git'] })
      )
    ).toBe(true);
  });
});

describe('row readers', () => {
  it('reads an ES|QL process row whose session ID is unmapped', () => {
    expect(
      toProcessEvent({
        '@timestamp': 'T1',
        'process.entity_id': 'p',
        'process.ai_agent.session_id': null,
        'process.ai_agent.is_descendant': true,
        'event.action': ['exec', 'fork'],
        'process.Ext.ancestry': ['a', 'b'],
      })
    ).toMatchObject({ entityId: 'p', sessionId: undefined, hasExec: true, ancestry: ['a', 'b'] });
    expect(toProcessEvent({ '@timestamp': 'T1' })).toBeUndefined();
  });

  it('marks generated OTel as mock data', () => {
    expect(toOtelRecord({ '@timestamp': 'T1', tags: ['poc-mock'] })?.isMock).toBe(true);
    expect(toOtelRecord({ '@timestamp': 'T1', tags: null })?.isMock).toBe(false);
  });

  it('reads the pid and Defend agent ID, ended processes and run alerts', () => {
    expect(
      toProcessEvent({
        '@timestamp': 'T1',
        'process.entity_id': 'p',
        'process.pid': 16884,
        'agent.id': 'endpoint-1',
      })
    ).toMatchObject({ pid: 16884, endpointAgentId: 'endpoint-1' });
    expect(
      toEndedProcessIds([{ 'process.entity_id': 'a' }, { 'process.entity_id': null }])
    ).toEqual(new Set(['a']));
    expect(
      toRunAlert({ _id: 'alert-1', '@timestamp': 'T1', 'process.entity_id': 'p' })
    ).toMatchObject({ id: 'alert-1', processEntityId: 'p', ancestry: [] });
    expect(toRunAlert({ '@timestamp': 'T1' })).toBeUndefined();
  });
});

describe('run status', () => {
  const now = new Date('2026-11-27T12:00:00.000Z').getTime();
  const root = proc({ entityId: 'agent', isDescendant: false });

  it('is running when the root has no end event, ended when it has one', () => {
    const recent = { ...root, timestamp: '2026-11-27T11:00:00.000Z' };
    expect(getRunStatus(recent, new Set(), now)).toEqual({ kind: 'running' });
    expect(getRunStatus(recent, new Set(['agent']), now)).toEqual({ kind: 'ended' });
  });

  it('says "no end event since" past the cap instead of running', () => {
    const old = { ...root, timestamp: '2026-11-26T10:00:00.000Z' };
    expect(getRunStatus(old, new Set(), now)).toEqual({ kind: 'stale', since: old.timestamp });
  });

  it('has no status when end events could not be read', () => {
    expect(getRunStatus(root, undefined, now)).toBeUndefined();
  });

  it('is calculated for each run from the end events passed at read time', () => {
    const activity = build({
      ownEvents: [
        proc({ entityId: 'a', isDescendant: false, timestamp: '2026-11-27T11:00:00.000Z' }),
        proc({ entityId: 'b', isDescendant: false, timestamp: '2026-11-27T11:30:00.000Z' }),
      ],
      endedProcessIds: new Set(['a']),
      now,
    });
    expect(activity.runs.map((run) => run.status?.kind)).toEqual(['ended', 'running']);
  });
});

describe('run reach', () => {
  const effects = (overrides: Partial<SideEffects>): SideEffects => ({
    fileEvents: 1,
    networkEvents: 0,
    files: [],
    domains: [],
    destinations: [],
    ...overrides,
  });

  it('flags permission prompts off from the root command line, by product', () => {
    const claude = proc({
      entityId: 'agent',
      commandLine: 'claude -p fix it --dangerously-skip-permissions',
    });
    expect(hasPermissionBypass('claude_code', claude)).toBe(true);
    expect(hasPermissionBypass('cursor', claude)).toBe(false);
    expect(
      hasPermissionBypass(
        'claude_code',
        proc({ entityId: 'a', args: ['claude', '--permission-mode', 'bypassPermissions'] })
      )
    ).toBe(true);
    expect(
      hasPermissionBypass(
        'cursor',
        proc({ entityId: 'c', unorderedArgs: ['--force', 'cursor-agent'] })
      )
    ).toBe(true);
    expect(hasPermissionBypass('claude_code', proc({ entityId: 'd', commandLine: 'claude' }))).toBe(
      false
    );
  });

  it('compares paths with the working directory, Windows paths without case', () => {
    expect(isInsideDirectory('/home/u/repo/src/a.ts', '/home/u/repo')).toBe(true);
    expect(isInsideDirectory('/home/u/repo-other/a.ts', '/home/u/repo')).toBe(false);
    expect(isInsideDirectory('C:\\Users\\U\\Repo\\a.py', 'c:\\users\\u\\repo\\')).toBe(true);
  });

  it("counts files outside the directory and every destination, without the agent's own state and service", () => {
    const root = proc({
      entityId: 'agent',
      isDescendant: false,
      workingDirectory: '/home/u/repo',
    });
    const curl = proc({ entityId: 'curl', parentEntityId: 'agent', commandLine: 'curl …' });
    const reach = buildRunReach(
      'claude_code',
      root,
      [root, curl],
      new Map([
        [
          'agent',
          effects({
            files: [
              '/home/u/.claude/sessions/1.json',
              '/home/u/.aws/credentials',
              '/home/u/repo/a',
            ],
            domains: ['api.anthropic.com', 'get.notes.example'],
            destinations: ['198.51.100.20'],
          }),
        ],
        [
          'curl',
          effects({
            files: [
              '/home/u/Downloads/kit.tar.gz',
              '/tmp/claude-ab12-cwd',
              '/home/u/.claude/shell-snapshots/snapshot-bash-1.sh',
              '/home/u/.claude/settings.json',
            ],
            domains: ['dl.kit.example'],
          }),
        ],
      ])
    );
    expect(reach).toEqual({
      permissionPromptsOff: false,
      workingDirectory: '/home/u/repo',
      filesOutside: [
        '/home/u/.aws/credentials',
        '/home/u/.claude/settings.json',
        '/home/u/Downloads/kit.tar.gz',
      ],
      destinations: ['dl.kit.example', 'get.notes.example'],
    });
  });

  it('counts addresses of a process that made no lookup, and no files without a directory', () => {
    const root = proc({ entityId: 'agent', isDescendant: false });
    const nc = proc({ entityId: 'nc', parentEntityId: 'agent' });
    const reach = buildRunReach(
      'claude_code',
      root,
      [root, nc],
      new Map([['nc', effects({ files: ['/etc/passwd'], destinations: ['203.0.113.9'] })]])
    );
    expect(reach.filesOutside).toEqual([]);
    expect(reach.destinations).toEqual(['203.0.113.9']);
  });
});

describe('run alerts', () => {
  it('ties an alert to the run by its process, its parent or its ancestry', () => {
    const alerts = [
      { id: 'own', timestamp: 'T3', processEntityId: 'helper', ancestry: [] },
      {
        id: 'child',
        timestamp: 'T2',
        processEntityId: 'x',
        parentEntityId: 'helper',
        ancestry: [],
      },
      { id: 'deep', timestamp: 'T1', processEntityId: 'y', ancestry: ['z', 'agent'] },
      { id: 'other', timestamp: 'T0', processEntityId: 'elsewhere', ancestry: [] },
    ];
    expect(getRunAlertIds(new Set(['agent', 'helper']), alerts)).toEqual(['own', 'child', 'deep']);
  });

  it('puts each run its own alerts', () => {
    const activity = build({
      ownEvents: [proc({ entityId: 'agent', isDescendant: false })],
      descendantEvents: [proc({ entityId: 'helper', parentEntityId: 'agent' })],
      alerts: [{ id: 'alert-1', timestamp: 'T1', processEntityId: 'helper', ancestry: [] }],
    });
    expect(activity.runs[0].alertIds).toEqual(['alert-1']);
  });
});
