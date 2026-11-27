/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ActivityStep,
  ProcessRecord,
  ProcessStep,
  ToolCallStep,
} from '../../../../../entity_analytics/components/ai_security/activity/types';
import { buildActivityRows, getRootCommandLabel } from './activity_rows';

const processStep = (
  overrides: Partial<ProcessRecord> & { entityId: string },
  timestamp = '2026-11-26T10:00:00.000Z'
): ProcessStep => ({
  kind: 'process',
  timestamp,
  isAgentProcess: false,
  isSetup: false,
  process: {
    timestamp,
    ancestry: [],
    unorderedArgs: [],
    isDescendant: true,
    hasExec: true,
    ...overrides,
  },
});

const toolCall = (commandLine: string, timestamp = '2026-11-26T10:00:05.000Z'): ToolCallStep => ({
  kind: 'tool_call',
  timestamp,
  toolName: 'Bash',
  commandLine,
  isMock: false,
});

const toolShell = (command: string) =>
  `bash -c source /home/ec2-user/.claude/shell-snapshots/snapshot.sh && eval '${command}' < /dev/null && pwd -P >| /tmp/cwd`;

const summary = (steps: readonly ActivityStep[], headlessPrompt?: string) =>
  buildActivityRows(steps, headlessPrompt).map((row) =>
    row.kind === 'tool_call'
      ? `tool:${row.step.commandLine} [${row.children.map((c) => c.process.entityId).join(',')}]`
      : row.step.kind === 'process'
      ? `process:${row.step.process.entityId}`
      : row.step.kind
  );

describe('buildActivityRows', () => {
  it('nests the processes a tool call ran under it and drops the matching tool shell', () => {
    expect(
      summary([
        processStep({ entityId: 'shell', commandLine: toolShell('npm test') }),
        processStep({ entityId: 'npm', parentEntityId: 'shell', commandLine: 'npm test' }),
        processStep({ entityId: 'node', parentEntityId: 'npm', commandLine: 'node test.js' }),
        processStep({ entityId: 'git', commandLine: 'git status' }),
        toolCall('npm test'),
      ])
    ).toEqual(['process:git', 'tool:npm test [npm,node]']);
  });

  it('nests a process whose own command matches when there is no tool shell', () => {
    expect(
      summary([
        processStep({ entityId: 'sudo', commandLine: 'sudo systemctl restart nginx' }),
        toolCall('sudo systemctl restart nginx'),
      ])
    ).toEqual(['tool:sudo systemctl restart nginx [sudo]']);
  });

  it('matches repeated commands to the newest run at or before each call', () => {
    expect(
      summary([
        processStep({ entityId: 'ls-1', commandLine: 'ls' }, '2026-11-26T10:00:00.000Z'),
        toolCall('ls', '2026-11-26T10:00:01.000Z'),
        processStep({ entityId: 'ls-2', commandLine: 'ls' }, '2026-11-26T10:00:02.000Z'),
        toolCall('ls', '2026-11-26T10:00:03.000Z'),
      ])
    ).toEqual(['tool:ls [ls-1]', 'tool:ls [ls-2]']);
  });

  it('keeps a tool shell no tool call matches', () => {
    expect(
      summary([processStep({ entityId: 'shell', commandLine: toolShell('make build') })])
    ).toEqual(['process:shell']);
  });

  it("hides an OTel prompt that repeats the run's headless prompt", () => {
    const prompt = (text: string): ActivityStep => ({
      kind: 'prompt',
      timestamp: '2026-11-26T10:00:01.000Z',
      text,
      isMock: false,
    });
    expect(
      summary([prompt('Restart nginx'), prompt('Then check the logs')], 'Restart nginx')
    ).toEqual(['prompt']);
  });
});

describe('getRootCommandLabel', () => {
  it('replaces the headless prompt with an ellipsis and keeps the flags', () => {
    expect(
      getRootCommandLabel('claude -p Restart nginx --output-format json', 'Restart nginx')
    ).toBe('claude -p … --output-format json');
  });

  it('cuts after -p when the prompt is unknown', () => {
    expect(getRootCommandLabel('claude -p Restart nginx', undefined)).toBe('claude -p …');
  });

  it('leaves a command line without a prompt as it is', () => {
    expect(getRootCommandLabel('claude --continue', undefined)).toBe('claude --continue');
    expect(getRootCommandLabel(undefined, undefined)).toBeUndefined();
  });
});
