/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERT_DEDUPE_WINDOW_MS,
  CHAIN_GAP_MS,
  CORRELATION_WINDOW_MS,
  SESSION_GAP_MS,
  assignChainDepth,
  buildTimelineModel,
  dedupeAlerts,
  groupTimelineSteps,
  isNotableOutbound,
  isNotableProcess,
  isSensitivePath,
  scoreEvent,
} from './timeline_model';
import type { TimelineAlertInput, TimelineEventInput, TimelineStep } from './timeline_model';

const T0 = new Date('2026-07-11T04:00:00.000Z').getTime();
const min = (n: number) => n * 60 * 1000;

const alert = (over: Partial<TimelineAlertInput> = {}): TimelineAlertInput => ({
  id: 'a1',
  index: '.internal.alerts-security.alerts-default-000001',
  ruleName: 'Credential Dumping via LSASS Memory Access',
  severity: 'critical',
  timestamp: T0 + min(30),
  host: 'LAPTOP-FIN03',
  user: 'alex.chen',
  tacticName: 'Credential Access',
  riskScore: 88,
  processName: 'rundll32.exe',
  ...over,
});

const event = (over: Partial<TimelineEventInput> = {}): TimelineEventInput => ({
  id: 'e1',
  index: '.ds-logs-hunt_seed-default-2026.07.17-000001',
  category: 'process',
  action: 'start',
  timestamp: T0 + min(31),
  host: 'LAPTOP-FIN03',
  user: 'alex.chen',
  processName: 'powershell.exe',
  parentProcessName: 'winword.exe',
  destinationIp: undefined,
  destinationPort: undefined,
  destinationDomain: undefined,
  sourceIp: undefined,
  filePath: undefined,
  networkDirection: undefined,
  ...over,
});

describe('timeline_model pivot predicates', () => {
  it('recognizes notable processes case-insensitively', () => {
    expect(isNotableProcess('PowerShell.exe')).toBe(true);
    expect(isNotableProcess('sudo')).toBe(true);
    expect(isNotableProcess('notepad.exe')).toBe(false);
    expect(isNotableProcess(undefined)).toBe(false);
    expect(isNotableProcess('')).toBe(false);
  });

  it('recognizes sensitive file paths by fragment', () => {
    expect(isSensitivePath('C:\\Users\\Public\\lsass.dmp')).toBe(true);
    expect(isSensitivePath('/root/.docker/config.json')).toBe(true);
    expect(isSensitivePath('/home/user/notes.txt')).toBe(false);
    expect(isSensitivePath(undefined)).toBe(false);
  });

  it('treats outbound network to routable IPs as notable, private as not', () => {
    expect(isNotableOutbound(event({ category: 'network', destinationIp: '185.220.101.5' }))).toBe(
      true
    );
    expect(isNotableOutbound(event({ category: 'network', destinationIp: '10.0.5.10' }))).toBe(
      false
    );
    expect(isNotableOutbound(event({ category: 'network', destinationIp: '172.16.0.1' }))).toBe(
      false
    );
    expect(
      isNotableOutbound(
        event({ category: 'network', destinationIp: '8.8.8.8', networkDirection: 'inbound' })
      )
    ).toBe(false);
    expect(isNotableOutbound(event({ category: 'process' }))).toBe(false);
  });
});

describe('scoreEvent', () => {
  it('scores alert-correlated events highest and records the reason', () => {
    const result = scoreEvent(event({ timestamp: T0 + min(31) }), [alert()]);
    expect(result.reasons).toContain('alert-correlated');
    expect(result.correlatedAlert?.id).toBe('a1');
    expect(result.score).toBeGreaterThanOrEqual(3);
  });

  it('does not correlate events outside the window', () => {
    const far = event({ timestamp: T0 + min(30) + CORRELATION_WINDOW_MS + min(5) });
    const result = scoreEvent(far, [alert()]);
    expect(result.correlatedAlert).toBeUndefined();
    expect(result.reasons).not.toContain('alert-correlated');
  });

  it('only correlates alerts for the same host or user', () => {
    const result = scoreEvent(event({ host: 'OTHER', user: 'someone.else' }), [alert()]);
    expect(result.correlatedAlert).toBeUndefined();
  });

  it('stacks intrinsic pivot signals', () => {
    const outbound = event({
      category: 'network',
      destinationIp: '185.220.101.5',
      timestamp: T0 + min(600),
    });
    const result = scoreEvent(outbound, [alert()]);
    expect(result.reasons).toEqual(['outbound-network']);
    expect(result.score).toBe(2);
  });

  it('scores auth logons and sensitive files', () => {
    const authResult = scoreEvent(
      event({ category: 'authentication', action: 'logon', timestamp: T0 + min(600) }),
      []
    );
    expect(authResult.reasons).toContain('auth-logon');

    const fileResult = scoreEvent(
      event({
        category: 'file',
        filePath: 'C:\\Users\\Public\\lsass.dmp',
        timestamp: T0 + min(600),
      }),
      []
    );
    expect(fileResult.reasons).toContain('sensitive-file');
  });
});

describe('dedupeAlerts', () => {
  it('collapses repeated firings of the same rule/entity within the window', () => {
    const repeated = Array.from({ length: 5 }, (_, i) =>
      alert({
        id: `dup${i}`,
        ruleName: 'Malicious Document Delivered via Email',
        timestamp: T0 + min(i * 7),
      })
    );
    const result = dedupeAlerts(repeated);
    expect(result).toHaveLength(1);
    expect(result[0].timestamp).toBe(T0);
  });

  it('keeps firings that are far enough apart', () => {
    const spaced = [
      alert({ id: 'x0', timestamp: T0 }),
      alert({ id: 'x1', timestamp: T0 + ALERT_DEDUPE_WINDOW_MS + min(5) }),
    ];
    expect(dedupeAlerts(spaced)).toHaveLength(2);
  });

  it('does not merge different rules or entities', () => {
    const mixed = [
      alert({ id: 'r1', ruleName: 'Rule A', timestamp: T0 }),
      alert({ id: 'r2', ruleName: 'Rule B', timestamp: T0 + min(1) }),
      alert({
        id: 'r3',
        ruleName: 'Rule A',
        host: 'OTHER-HOST',
        user: 'x',
        timestamp: T0 + min(1),
      }),
    ];
    expect(dedupeAlerts(mixed)).toHaveLength(3);
  });
});

describe('assignChainDepth', () => {
  const step = (over: Partial<TimelineStep>): TimelineStep => ({
    id: 'event:x',
    kind: 'event',
    category: 'process',
    timestamp: T0,
    host: 'LAPTOP-FIN03',
    user: 'alex.chen',
    severity: undefined,
    label: 'spawned process powershell.exe',
    detail: undefined,
    alertRuleName: undefined,
    contributedToAlertId: undefined,
    tacticName: undefined,
    reasons: [],
    significanceScore: 2,
    depth: 0,
    refId: 'x',
    refIndex: '.ds-logs-hunt_seed-default-2026.07.17-000001',
    ...over,
  });

  it('indents consecutive same-entity steps within the gap', () => {
    const result = assignChainDepth(
      [
        step({ id: 's0', timestamp: T0 }),
        step({ id: 's1', timestamp: T0 + min(1) }),
        step({ id: 's2', timestamp: T0 + min(2) }),
      ],
      CHAIN_GAP_MS,
      4
    );
    expect(result.map((s) => s.depth)).toEqual([0, 1, 2]);
  });

  it('resets depth on a large temporal gap', () => {
    const result = assignChainDepth(
      [
        step({ id: 's0', timestamp: T0 }),
        step({ id: 's1', timestamp: T0 + CHAIN_GAP_MS + min(5) }),
      ],
      CHAIN_GAP_MS,
      4
    );
    expect(result.map((s) => s.depth)).toEqual([0, 0]);
  });

  it('resets depth when the entity changes', () => {
    const result = assignChainDepth(
      [
        step({ id: 's0', timestamp: T0, host: 'LAPTOP-FIN03', user: 'alex.chen' }),
        step({ id: 's1', timestamp: T0 + min(1), host: 'jump-box-01', user: 'a.rodriguez' }),
      ],
      CHAIN_GAP_MS,
      4
    );
    expect(result.map((s) => s.depth)).toEqual([0, 0]);
  });

  it('clamps depth to maxDepth', () => {
    const steps = Array.from({ length: 8 }, (_, i) =>
      step({ id: `s${i}`, timestamp: T0 + min(i) })
    );
    const result = assignChainDepth(steps, CHAIN_GAP_MS, 3);
    expect(Math.max(...result.map((s) => s.depth))).toBe(3);
  });
});

describe('buildTimelineModel', () => {
  it('returns an empty, resilient model for no data', () => {
    const model = buildTimelineModel([], []);
    expect(model.steps).toEqual([]);
    expect(model.overflowCount).toBe(0);
    expect(model.totalSignificant).toBe(0);
  });

  it('keeps alerts even when there are no significant events', () => {
    const model = buildTimelineModel([alert()], []);
    expect(model.steps).toHaveLength(1);
    expect(model.steps[0].kind).toBe('alert');
    expect(model.steps[0].alertRuleName).toBe('Credential Dumping via LSASS Memory Access');
  });

  it('filters out insignificant events (private network, ordinary process)', () => {
    const noise = [
      event({ id: 'n1', category: 'network', destinationIp: '10.0.0.5', timestamp: T0 + min(600) }),
      event({
        id: 'n2',
        category: 'process',
        processName: 'explorer.exe',
        timestamp: T0 + min(600),
      }),
    ];
    const model = buildTimelineModel([], noise);
    expect(model.steps).toHaveLength(0);
  });

  it('builds the alex.chen chain: process -> alert -> outbound, indented', () => {
    const alerts = [alert({ id: 'lsass', timestamp: T0 + min(30) })];
    const events = [
      event({
        id: 'p1',
        category: 'process',
        processName: 'powershell.exe',
        timestamp: T0 + min(29),
      }),
      event({
        id: 'net1',
        category: 'network',
        destinationIp: '185.220.101.5',
        destinationPort: 443,
        timestamp: T0 + min(31),
      }),
    ];
    const model = buildTimelineModel(alerts, events);
    const labels = model.steps.map((s) => s.label);
    expect(labels).toContain('spawned process powershell.exe');
    expect(labels).toContain('Credential Dumping via LSASS Memory Access');
    expect(labels.some((l) => l.startsWith('reached 185.220.101.5'))).toBe(true);
    // Chronological order preserved.
    const times = model.steps.map((s) => s.timestamp);
    expect(times).toEqual([...times].sort((a, b) => a - b));
    // Later steps in the same chain are indented deeper than the first.
    expect(model.steps[model.steps.length - 1].depth).toBeGreaterThan(0);
  });

  it('links contributing events to the alert they correlate with', () => {
    const alerts = [alert({ id: 'lsass', timestamp: T0 + min(30) })];
    const events = [
      event({
        id: 'p1',
        category: 'process',
        processName: 'rundll32.exe',
        timestamp: T0 + min(30),
      }),
    ];
    const model = buildTimelineModel(alerts, events);
    const contributing = model.steps.find((s) => s.id === 'event:p1');
    expect(contributing?.contributedToAlertId).toBe('lsass');
  });

  it('dedupes triplicated telemetry within the same minute', () => {
    const events = [
      event({
        id: 'r1',
        category: 'network',
        destinationIp: '185.220.101.5',
        timestamp: T0 + min(600),
      }),
      event({
        id: 'r2',
        category: 'network',
        destinationIp: '185.220.101.5',
        timestamp: T0 + min(600) + 1000,
      }),
      event({
        id: 'r3',
        category: 'network',
        destinationIp: '185.220.101.5',
        timestamp: T0 + min(600) + 2000,
      }),
    ];
    const model = buildTimelineModel([], events);
    expect(model.steps).toHaveLength(1);
  });

  it('caps steps and reports overflow', () => {
    const alerts = Array.from({ length: 20 }, (_, i) =>
      alert({ id: `a${i}`, timestamp: T0 + min(i * 120) })
    );
    const model = buildTimelineModel(alerts, [], { stepCap: 5 });
    expect(model.steps).toHaveLength(5);
    expect(model.totalSignificant).toBe(20);
    expect(model.overflowCount).toBe(15);
  });

  it('orders an event and its alert at the same instant with the alert last', () => {
    const ts = T0 + min(30);
    const alerts = [alert({ id: 'a', timestamp: ts })];
    const events = [
      event({ id: 'p', category: 'process', processName: 'rundll32.exe', timestamp: ts }),
    ];
    const model = buildTimelineModel(alerts, events);
    const eventIdx = model.steps.findIndex((s) => s.kind === 'event');
    const alertIdx = model.steps.findIndex((s) => s.kind === 'alert');
    expect(eventIdx).toBeLessThan(alertIdx);
  });

  it('carries the document index + tactic through to steps for raw-log jumps', () => {
    const model = buildTimelineModel(
      [alert({ id: 'a', index: 'alerts-idx', tacticName: 'Credential Access' })],
      [
        event({
          id: 'p',
          index: 'events-idx',
          processName: 'rundll32.exe',
          timestamp: T0 + min(30),
        }),
      ]
    );
    const alertStep = model.steps.find((s) => s.kind === 'alert');
    const eventStep = model.steps.find((s) => s.kind === 'event');
    expect(alertStep?.refIndex).toBe('alerts-idx');
    expect(alertStep?.tacticName).toBe('Credential Access');
    expect(eventStep?.refIndex).toBe('events-idx');
    // A correlated event inherits the tactic of the alert it contributed to.
    expect(eventStep?.tacticName).toBe('Credential Access');
  });
});

describe('groupTimelineSteps', () => {
  const gstep = (over: Partial<TimelineStep>): TimelineStep => ({
    id: 'event:g',
    kind: 'event',
    category: 'process',
    timestamp: T0,
    host: 'jump-box-01',
    user: 'a.rodriguez',
    severity: undefined,
    label: 'spawned process bash',
    detail: undefined,
    alertRuleName: undefined,
    contributedToAlertId: undefined,
    tacticName: undefined,
    reasons: [],
    significanceScore: 2,
    depth: 0,
    refId: 'g',
    refIndex: 'idx',
    ...over,
  });

  it('returns no groups for an empty timeline', () => {
    expect(groupTimelineSteps([])).toEqual([]);
  });

  it('keeps a tight burst of steps in a single session', () => {
    const groups = groupTimelineSteps([
      gstep({ id: 's0', timestamp: T0 }),
      gstep({ id: 's1', timestamp: T0 + min(5) }),
      gstep({ id: 's2', timestamp: T0 + min(20) }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].steps).toHaveLength(3);
    expect(groups[0].startTimestamp).toBe(T0);
    expect(groups[0].endTimestamp).toBe(T0 + min(20));
  });

  it('splits into a new session on a large temporal gap', () => {
    const groups = groupTimelineSteps([
      gstep({ id: 's0', timestamp: T0 }),
      gstep({ id: 's1', timestamp: T0 + SESSION_GAP_MS + min(5) }),
    ]);
    expect(groups).toHaveLength(2);
  });

  it('splits on a calendar-day boundary even within the gap window', () => {
    const dayKey = (ts: number) => new Date(ts).toISOString().slice(0, 10);
    const nearMidnight = new Date('2026-07-11T23:30:00.000Z').getTime();
    const afterMidnight = new Date('2026-07-12T00:15:00.000Z').getTime();
    const groups = groupTimelineSteps(
      [gstep({ id: 'd0', timestamp: nearMidnight }), gstep({ id: 'd1', timestamp: afterMidnight })],
      { dayKey }
    );
    expect(groups).toHaveLength(2);
  });

  it('summarizes worst severity, dominant tactic, and alert count per group', () => {
    const groups = groupTimelineSteps([
      gstep({ id: 'a1', kind: 'alert', severity: 'high', tacticName: 'Privilege Escalation' }),
      gstep({
        id: 'a2',
        kind: 'alert',
        severity: 'critical',
        tacticName: 'Privilege Escalation',
        timestamp: T0 + min(2),
      }),
      gstep({ id: 'e1', kind: 'event', tacticName: 'Execution', timestamp: T0 + min(3) }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].worstSeverity).toBe('critical');
    expect(groups[0].dominantTactic).toBe('Privilege Escalation');
    expect(groups[0].alertCount).toBe(2);
  });
});
