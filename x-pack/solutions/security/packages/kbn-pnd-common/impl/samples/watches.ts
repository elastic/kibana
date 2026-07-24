/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SYSTEM_SECURITY_WATCH_DARK_ID,
  SYSTEM_SECURITY_WATCH_DEEP_ID,
  SYSTEM_SECURITY_WATCH_FLOOR_ID,
  SYSTEM_SECURITY_WATCH_OFFICER_ID,
  WATCH_DARK_TAG,
  WATCH_DEEP_TAG,
  WATCH_FLOOR_TAG,
  WATCH_OFFICER_TAG,
  WATCH_TAG,
} from '../../constants';
import type { Watch } from '../schemas/components/watch.gen';

const floorWatchBase: Watch = {
  id: SYSTEM_SECURITY_WATCH_FLOOR_ID,
  name: 'Watch Floor',
  tags: [WATCH_TAG, WATCH_FLOOR_TAG],
  color: '#16b3a6',
  icon: 'alert',
  enabled: true,
  draft: false,
  managed: true,
  sortOrder: 10,
  mandate: 'Frontline triage',
  description:
    'Tier-1 Security Watch. Triages alerts via the alert-analysis skill. Full Alert Analysis managed-workflow wrap is the next Floor spike.',
  schedule: {
    set: true,
    mode: 'always',
    from: 0,
    to: 23,
    onDemand: false,
    cadence: 'stream',
    every: 60,
    handoff: 'officer',
  },
  triggers: [
    { type: 'event', summary: 'On alert' },
    { type: 'manual', summary: 'Manual / on demand' },
  ],
  coverage: [[0, 24]],
  scopeSummary: 'Security indices · APM · logs',
  scopes: [
    { name: 'Security indices', access: 'full', label: 'Read' },
    { name: 'APM · logs · SLOs', access: 'full', label: 'Read' },
    { name: 'Finance PII', access: 'masked', label: 'Masked' },
  ],
  callables: [
    {
      id: 'alert-analysis',
      name: 'Alert analysis',
      kind: 'skill',
      summary: 'On alert · classifies FP / TP / inconclusive',
      gated: false,
      enabled: true,
      lastRun: '2026-07-20T14:02:00Z',
    },
  ],
  autonomyLevel: 3,
  metrics: {
    runs7d: 847,
    acceptedPct: 91,
    timeSaved: '42h',
    lastRun: '2026-07-20T14:02:00Z',
  },
  recentRuns: [
    {
      executionId: 'exec-floor-20260720-1402',
      startedAt: '2026-07-20T14:02:00Z',
      status: 'completed',
      triggerType: 'alert',
      steps: [
        { name: 'triage_alerts', type: 'ai.agent', status: 'completed' },
        { name: 'record_reasoning', type: 'data.set', status: 'completed' },
      ],
      summary: 'true_positive · confidence 0.87',
      action: 'draft',
    },
    {
      executionId: 'exec-floor-20260720-1358',
      startedAt: '2026-07-20T13:58:00Z',
      status: 'completed',
      triggerType: 'alert',
      steps: [{ name: 'triage_alerts', type: 'ai.agent', status: 'completed' }],
      summary: 'false_positive · confidence 0.94',
      action: 'read',
    },
  ],
};

const officerWatchBase: Watch = {
  id: SYSTEM_SECURITY_WATCH_OFFICER_ID,
  name: 'Watch Officer',
  tags: [WATCH_TAG, WATCH_OFFICER_TAG],
  color: '#3b82f6',
  icon: 'bell',
  enabled: true,
  draft: false,
  managed: true,
  sortOrder: 20,
  mandate: 'Escalation & briefs',
  description:
    'Tier-2 Security Watch. Escalates criticals, drafts briefs, and stages gated response proposals for human approval.',
  schedule: {
    set: true,
    mode: 'always',
    from: 0,
    to: 23,
    onDemand: false,
    cadence: 'stream',
    every: 60,
    handoff: 'oncall',
  },
  triggers: [{ type: 'manual', summary: 'Manual / on demand' }],
  coverage: [[0, 24]],
  scopeSummary: 'Open threads · on-call · deploys',
  scopes: [
    { name: 'Open threads · cases', access: 'full', label: 'Read' },
    { name: 'On-call schedule', access: 'full', label: 'Read' },
    { name: 'Deploy history', access: 'full', label: 'Read' },
  ],
  callables: [],
  autonomyLevel: 4,
  metrics: {
    runs7d: 23,
    acceptedPct: 78,
    timeSaved: '8h',
    lastRun: '2026-07-20T11:30:00Z',
  },
  recentRuns: [
    {
      executionId: 'exec-officer-20260720-1130',
      startedAt: '2026-07-20T11:30:00Z',
      status: 'waiting',
      triggerType: 'manual',
      steps: [
        { name: 'draft_proposal', type: 'data.set', status: 'completed' },
        { name: 'await_approval', type: 'waitForInput', status: 'waiting' },
      ],
      summary: 'Awaiting approval · gated proposal staged',
      action: 'gated',
    },
  ],
};

const darkWatchBase: Watch = {
  id: SYSTEM_SECURITY_WATCH_DARK_ID,
  name: 'Dark Watch',
  tags: [WATCH_TAG, WATCH_DARK_TAG],
  color: '#f59e0b',
  icon: 'bolt',
  enabled: true,
  draft: false,
  managed: true,
  sortOrder: 30,
  mandate: 'Continuous, technology-aware hunting for relevant threats and coverage gaps',
  description:
    'Dark Watch skeleton. Continuous, technology-aware hunting with overnight UTC sweeps and reviewable findings.',
  schedule: {
    set: true,
    mode: 'window',
    from: 22,
    to: 6,
    onDemand: true,
    cadence: 'sweep',
    every: 60,
    handoff: 'brief',
  },
  triggers: [
    { type: 'schedule', summary: 'Schedule · hourly from 22:00–06:00 UTC' },
    { type: 'manual', summary: 'Manual / on demand' },
  ],
  coverage: [
    [22, 24],
    [0, 6],
  ],
  scopeSummary: 'Mail · IdP · edge / VPN',
  scopes: [
    { name: 'Mail · IdP', access: 'full', label: 'Read + monitor' },
    { name: 'Edge / VPN', access: 'full', label: 'Read + monitor' },
    { name: 'Customer data', access: 'denied', label: 'No access' },
  ],
  callables: [],
  autonomyLevel: 2,
  metrics: {
    runs7d: 56,
    acceptedPct: 65,
    timeSaved: '18h',
    lastRun: '2026-07-20T03:00:00Z',
  },
  recentRuns: [
    {
      executionId: 'exec-dark-20260720-0300',
      startedAt: '2026-07-20T03:00:00Z',
      status: 'completed',
      triggerType: 'schedule',
      steps: [{ name: 'hunt_stub', type: 'console', status: 'completed' }],
      summary: 'Beacon correlation · 2 hosts flagged',
      action: 'read',
    },
  ],
};

const deepWatchBase: Watch = {
  id: SYSTEM_SECURITY_WATCH_DEEP_ID,
  name: 'Deep Watch',
  tags: [WATCH_TAG, WATCH_DEEP_TAG],
  color: '#8b5cf6',
  icon: 'console',
  enabled: true,
  draft: false,
  managed: true,
  sortOrder: 40,
  mandate: 'Deep investigation & hunts',
  description:
    'Deep Watch skeleton. Specialist, on-demand depth — forensics, hunts, and draft-only conclusions under human review.',
  schedule: {
    set: true,
    mode: 'window',
    from: 8,
    to: 18,
    onDemand: true,
    cadence: 'manual',
    every: 60,
    handoff: 'records',
  },
  triggers: [{ type: 'manual', summary: 'Manual / on demand' }],
  coverage: [[8, 18]],
  scopeSummary: 'Security indices · EDR · DNS',
  scopes: [
    { name: 'Security indices', access: 'full', label: 'Read' },
    { name: 'EDR telemetry', access: 'full', label: 'Read' },
    { name: 'DNS · netflow', access: 'full', label: 'Read' },
  ],
  callables: [],
  autonomyLevel: 3,
  metrics: {
    runs7d: 4,
    acceptedPct: null,
    timeSaved: '6h',
    lastRun: '2026-07-19T16:45:00Z',
  },
  recentRuns: [
    {
      executionId: 'exec-deep-20260719-1645',
      startedAt: '2026-07-19T16:45:00Z',
      status: 'completed',
      triggerType: 'manual',
      steps: [{ name: 'specialist_stub', type: 'console', status: 'completed' }],
      summary: 'Forensic timeline draft · pending review',
      action: 'draft',
    },
  ],
};

export const MOCK_MANAGED_WATCHES: Watch[] = [
  floorWatchBase,
  officerWatchBase,
  darkWatchBase,
  deepWatchBase,
];

export const createMockWatch = (overrides: Partial<Watch> = {}): Watch => ({
  ...floorWatchBase,
  ...overrides,
  schedule: { ...floorWatchBase.schedule, ...overrides.schedule },
  metrics: { ...floorWatchBase.metrics, ...overrides.metrics },
});

export const getMockWatchById = (watchId: string): Watch | undefined =>
  MOCK_MANAGED_WATCHES.find((watch) => watch.id === watchId);
