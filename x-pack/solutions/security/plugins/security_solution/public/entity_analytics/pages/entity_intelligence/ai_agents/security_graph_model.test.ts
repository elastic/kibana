/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildSecurityGraphNodes,
  securityGraphHeight,
  securityFindingKey,
  findingMatchesToolEvent,
  securityInvocationCommand,
  securityInvocationReferenceKey,
} from './security_graph_model';
import type { SecurityFinding } from '../security_findings/types';
import type { CodexToolEvent } from './codex_types';

const finding = (step: number): SecurityFinding => ({
  id: `finding-${step}`,
  timestamp: `2026-10-13T12:00:0${step}Z`,
  title: 'Protected file',
  severity: 'high',
  status: 'open',
  kind: 'guardrail',
  outcome: 'blocked',
  rule: { name: 'Protected file rule' },
  source: { index: 'alerts', id: `source-${step}` },
  ancestors: [],
  entityIds: [],
  scenario: { id: 'exercise', step, kind: 'controlled' },
  agent: { id: 'installation', provider: 'codex', sessionId: 'session' },
});

it('orders unique source events without converting scenario order into call causality', () => {
  const first = finding(2);
  const second = finding(3);
  const third = finding(4);
  const nodes = buildSecurityGraphNodes([third, second, first, second]);
  expect(nodes).toHaveLength(3);
  expect(nodes.map((node) => node.finding)).toEqual([first, second, third]);
  expect(nodes.map((node) => node.key)).toEqual([first, second, third].map(securityFindingKey));
  expect(nodes.every((node) => !('previousKey' in node))).toBe(true);
});

it('does not infer sequence from matching sessions, tools, or conflicting recorded steps', () => {
  const sameSession = [finding(2), finding(3)].map((item) => ({ ...item, scenario: undefined }));
  expect(buildSecurityGraphNodes(sameSession).every((node) => !('previousKey' in node))).toBe(true);
  const conflicting = [finding(2), { ...finding(3), scenario: finding(2).scenario }];
  expect(buildSecurityGraphNodes(conflicting).every((node) => !('previousKey' in node))).toBe(true);
});

it('does not connect different principals or scenarios and bounds canvas height to six events', () => {
  expect(
    buildSecurityGraphNodes([
      finding(2),
      { ...finding(3), agent: { id: 'other', provider: 'codex', sessionId: 'session' } },
    ]).every((node) => !('previousKey' in node))
  ).toBe(true);
  expect(securityGraphHeight(100)).toBe(securityGraphHeight(6));
  expect(securityGraphHeight(0)).toBe(0);
});

const event: CodexToolEvent = {
  id: 'native-call',
  agentId: 'installation',
  sessionId: 'session',
  provider: 'codex',
  timestamp: '2026-10-13T12:00:00Z',
  toolName: 'exec_command',
  outcome: 'failure',
  observationType: 'native_tool_completion',
  recordHash: 'hash',
  turnId: 'native-turn',
  exitCode: 77,
  source: { index: 'native-index', id: 'native-id' },
};
const boundFinding: SecurityFinding = {
  ...finding(1),
  invocation: {
    requestId: 'request-a',
    toolCallId: event.id,
    toolName: event.toolName,
    turnId: 'native-turn',
    source: event.source,
    inputRecordHash: 'hash',
    inputSource: 'native.command',
    correlation: 'exact_request_id',
    input: 'cat fixture.txt',
    inputRedacted: false,
    inputTruncated: false,
    processExitCode: 77,
  },
};

it('matches the native source, call, tool, installation, session and provider together', () => {
  expect(findingMatchesToolEvent(boundFinding, event)).toBe(true);
  expect(findingMatchesToolEvent({ ...boundFinding, invocation: undefined }, event)).toBe(false);
});

it.each<Partial<CodexToolEvent>>([
  { id: 'other-call' },
  { source: { ...event.source, index: 'other-index' } },
  { source: { ...event.source, id: 'other-id' } },
  { agentId: 'other-agent' },
  { sessionId: 'other-session' },
  { provider: 'cursor' },
  { toolName: 'other-tool' },
  { observationType: 'model_tool_call' },
  { observationType: undefined },
  { recordHash: 'changed-record' },
  { recordHash: undefined },
  { exitCode: 0 },
  { exitCode: undefined },
  { turnId: 'different-turn' },
  { turnId: undefined },
])('rejects a partial or mismatched invocation reference: %o', (change) => {
  expect(findingMatchesToolEvent(boundFinding, { ...event, ...change })).toBe(false);
});

it('extracts the actual shell command and credential-filters command previews', () => {
  expect(
    securityInvocationCommand(JSON.stringify(['/bin/zsh', '-lc', 'cat protected-fixture.txt']))
  ).toBe('cat protected-fixture.txt');
  expect(securityInvocationCommand(JSON.stringify({ cmd: 'echo test' }))).toBe('echo test');
  expect(securityInvocationCommand('not json')).toBe('not json');
  expect(securityInvocationCommand('{"unexpected":42}')).toBe('{"unexpected":42}');
  expect(
    securityInvocationCommand('echo sk-proj-abcdefghijklmnopqrstuvwxyz12345678901234567890')
  ).not.toContain('sk-proj-abcdefghijklmnopqrstuvwxyz12345678901234567890');
});

it('permits a missing turn only when the bound native snapshot did not record one', () => {
  const noTurn: SecurityFinding = {
    ...boundFinding,
    invocation: boundFinding.invocation && { ...boundFinding.invocation, turnId: undefined },
  };
  expect(findingMatchesToolEvent(noTurn, { ...event, turnId: undefined })).toBe(true);
});

it('presents one native invocation with both the monitor match and confirmed block evidence', () => {
  const monitor: SecurityFinding = {
    ...boundFinding,
    id: 'monitor',
    source: { index: 'alerts', id: 'monitor' },
    kind: 'detection',
    outcome: 'unknown',
  };
  const nodes = buildSecurityGraphNodes([monitor, boundFinding, monitor], { events: [event] });
  expect(nodes).toHaveLength(1);
  expect(nodes[0].finding).toBe(boundFinding);
  expect(nodes[0].event).toBe(event);
  expect(nodes[0].findings).toEqual(expect.arrayContaining([monitor, boundFinding]));
  expect(nodes[0].findings).toHaveLength(2);
});

it('keys complete immutable observation references across different policies, not names or time', () => {
  const reference = securityInvocationReferenceKey(boundFinding);
  expect(reference).toBeDefined();
  expect(
    securityInvocationReferenceKey({ ...boundFinding, source: { index: 'alerts', id: 'other' } })
  ).toBe(reference);
  expect(
    securityInvocationReferenceKey({ ...boundFinding, invocation: undefined })
  ).toBeUndefined();
  expect(securityInvocationReferenceKey({ ...boundFinding, agent: undefined })).toBeUndefined();
  expect(
    securityInvocationReferenceKey({
      ...boundFinding,
      invocation: boundFinding.invocation && { ...boundFinding.invocation, inputRecordHash: '' },
    })
  ).toBeUndefined();
  expect(
    securityInvocationReferenceKey({
      ...boundFinding,
      invocation: boundFinding.invocation && {
        ...boundFinding.invocation,
        toolCallId: 'other-call',
      },
    })
  ).not.toBe(reference);
  expect(
    securityInvocationReferenceKey({
      ...boundFinding,
      invocation: boundFinding.invocation && {
        ...boundFinding.invocation,
        inputRecordHash: 'changed',
      },
    })
  ).not.toBe(reference);
});

it('does not combine matching names, sessions or invocation IDs without matching native evidence', () => {
  const unverified: SecurityFinding = {
    ...boundFinding,
    source: { index: 'alerts', id: 'other' },
    invocation: boundFinding.invocation && {
      ...boundFinding.invocation,
      inputRecordHash: 'different-native-record',
    },
  };
  expect(buildSecurityGraphNodes([boundFinding, unverified], { events: [event] })).toHaveLength(2);
  expect(buildSecurityGraphNodes([boundFinding, unverified])).toHaveLength(2);
});

it('keeps distinct executions of the same tool separate even at the same time', () => {
  const secondEvent = { ...event, id: 'second-call' };
  const secondFinding: SecurityFinding = {
    ...boundFinding,
    source: { index: 'alerts', id: 'other' },
    invocation: boundFinding.invocation && {
      ...boundFinding.invocation,
      toolCallId: secondEvent.id,
    },
  };
  const nodes = buildSecurityGraphNodes([boundFinding, secondFinding], {
    events: [event, secondEvent],
  });
  expect(nodes).toHaveLength(2);
  expect(nodes.map((node) => node.event?.id)).toEqual(
    expect.arrayContaining([event.id, secondEvent.id])
  );
});
