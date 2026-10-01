/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionCatalogEntry } from '@kbn/alertzero-common';
import { buildProposalSubjectKey, decidePackageReport } from './decide_package_report';
import type { CurrentRunState } from './types';

const isolateHost: ActionCatalogEntry = {
  workflowId: 'system-security-action-isolate-host',
  name: 'Isolate host',
  category: 'respond',
  impact: 'high',
  inputSchema: {
    type: 'object',
    properties: {
      endpoint_ids: { type: 'array', items: { type: 'string' } },
    },
    required: ['endpoint_ids'],
  },
};

const killProcess: ActionCatalogEntry = {
  workflowId: 'system-security-action-kill-process',
  name: 'Kill process',
  category: 'respond',
  impact: 'high',
  inputSchema: {
    type: 'object',
    properties: {
      endpoint_ids: { type: 'array', items: { type: 'string' } },
      parameters: { type: 'object' },
    },
    required: ['endpoint_ids', 'parameters'],
  },
};

const suspendProcess: ActionCatalogEntry = {
  workflowId: 'system-security-action-suspend-process',
  name: 'Suspend process',
  category: 'respond',
  impact: 'high',
  inputSchema: {
    type: 'object',
    properties: {
      endpoint_ids: { type: 'array', items: { type: 'string' } },
      parameters: { type: 'object' },
    },
    required: ['endpoint_ids', 'parameters'],
  },
};

const configureAction: ActionCatalogEntry = {
  workflowId: 'system-security-action-configure-something',
  name: 'Configure',
  category: 'configure',
  inputSchema: {
    type: 'object',
    properties: {
      endpoint_ids: { type: 'array', items: { type: 'string' } },
    },
    required: ['endpoint_ids'],
  },
};

const baseHitState = (overrides: Partial<CurrentRunState> = {}): CurrentRunState => ({
  runId: 'run-1',
  reportId: 'rpt-1',
  hasConfirmedHit: true,
  titles: ['Shadow admin AssumeRole'],
  evidenceLines: ['Tier 1 hits in cloudtrail'],
  techniques: ['T1078.004'],
  hosts: [{ name: 'host-a', enrolled: true, agentId: 'agent-a' }],
  processSelectors: [],
  // Fully-covered defaults: no recommendation trigger fires unless a test overrides one.
  hasNonHostEntity: false,
  hasIocIndicator: false,
  allEventsActionable: true,
  hasProcessBearingEvent: false,
  manualRemediation: [],
  evidence: { tier1HitCount: 4, tier2Confirmed: [] },
  ...overrides,
});

describe('decidePackageReport', () => {
  const conversationId = 'conv-1';

  it('dismisses a clean run with no proposals', () => {
    const result = decidePackageReport({
      conversationId,
      state: baseHitState({ hasConfirmedHit: false, hosts: [] }),
      catalog: { ok: true, actions: [isolateHost] },
    });
    expect(result.dismiss).toBe(true);
    expect(result.proposals).toEqual([]);
    expect(result.closureSummary).toContain('No confirmed hits');
  });

  it('mints one proposal per eligible host × fillable respond action', () => {
    const result = decidePackageReport({
      conversationId,
      state: baseHitState({
        hosts: [
          { name: 'host-a', enrolled: true, agentId: 'agent-a' },
          { name: 'host-b', enrolled: true, agentId: 'agent-b' },
        ],
      }),
      catalog: { ok: true, actions: [isolateHost, configureAction] },
    });
    expect(result.dismiss).toBe(false);
    expect(result.proposals).toHaveLength(2);
    expect(result.proposals.map((p) => p.actionWorkflowId).sort()).toEqual([
      isolateHost.workflowId,
      isolateHost.workflowId,
    ]);
    expect(result.proposals.every((p) => p.actionInput?.endpoint_ids)).toBe(true);
    expect(new Set(result.proposals.map((p) => p.subjectKey)).size).toBe(2);
    expect(result.proposals.map((p) => p.title).sort()).toEqual([
      'Isolate host host-a',
      'Isolate host host-b',
    ]);
  });

  it('does not drop or duplicate subject keys when catalog order changes', () => {
    const state = baseHitState({
      processSelectors: [
        { pid: 4242, processKey: 'pid:4242', hostName: 'host-a', processName: 'proc.exe' },
      ],
    });
    const a = decidePackageReport({
      conversationId,
      state,
      catalog: { ok: true, actions: [isolateHost, killProcess] },
    });
    const b = decidePackageReport({
      conversationId,
      state,
      catalog: { ok: true, actions: [killProcess, isolateHost] },
    });
    expect(a.proposals.map((p) => p.subjectKey).sort()).toEqual(
      b.proposals.map((p) => p.subjectKey).sort()
    );
    expect(new Set(a.proposals.map((p) => p.subjectKey)).size).toBe(a.proposals.length);
  });

  it('mints a recommendation instead of an executable proposal when the hit is hostless', () => {
    const result = decidePackageReport({
      conversationId,
      state: baseHitState({ hosts: [] }),
      catalog: { ok: true, actions: [isolateHost] },
    });
    expect(result.dismiss).toBe(false);
    expect(result.proposals).toHaveLength(1);
    expect(result.proposals[0].actionWorkflowId).toBeUndefined();
    expect(result.proposals[0].title).toBe('Analyst recommendation');
    expect(result.proposals[0].confidence).toBe('medium');
    expect(result.proposals[0].comment).toContain('No respond action could be filled');
  });

  it('mints a recommendation naming unenrolled hosts', () => {
    const result = decidePackageReport({
      conversationId,
      state: baseHitState({
        hosts: [{ name: 'ghost', enrolled: false }],
      }),
      catalog: { ok: true, actions: [isolateHost] },
    });
    expect(result.proposals).toHaveLength(1);
    expect(result.proposals[0].title).toBe('Analyst recommendation');
    expect(result.proposals[0].comment).toContain('ghost');
  });

  it('mints executable plus a recommendation when some hosts are unenrolled (trigger: partial enrollment)', () => {
    const result = decidePackageReport({
      conversationId,
      state: baseHitState({
        hosts: [
          { name: 'host-a', enrolled: true, agentId: 'agent-a' },
          { name: 'ghost', enrolled: false },
        ],
      }),
      catalog: { ok: true, actions: [isolateHost] },
    });
    expect(result.proposals).toHaveLength(2);
    expect(result.proposals.some((p) => p.actionWorkflowId === isolateHost.workflowId)).toBe(true);
    expect(result.proposals.some((p) => p.title === 'Isolate host host-a')).toBe(true);
    const recommendation = result.proposals.find((p) => p.title === 'Analyst recommendation');
    expect(recommendation).toBeDefined();
    expect(recommendation?.comment).toContain('ghost');
    expect(recommendation?.comment).toContain('not enrolled');
  });

  it('mints a recommendation when the catalog errors (trigger: no executable proposal at all)', () => {
    const result = decidePackageReport({
      conversationId,
      state: baseHitState(),
      catalog: { ok: false, reason: 'catalog_error' },
    });
    expect(result.proposals).toHaveLength(1);
    expect(result.proposals[0].title).toBe('Analyst recommendation');
  });

  it('mints a recommendation when zero respond actions are installed (trigger: no executable proposal at all)', () => {
    const result = decidePackageReport({
      conversationId,
      state: baseHitState(),
      catalog: { ok: true, actions: [configureAction] },
    });
    expect(result.proposals).toHaveLength(1);
    expect(result.proposals[0].title).toBe('Analyst recommendation');
  });

  it('mints a recommendation when process fields are absent for the only fillable actions (trigger: no executable proposal at all)', () => {
    const result = decidePackageReport({
      conversationId,
      state: baseHitState({ processSelectors: [] }),
      catalog: { ok: true, actions: [killProcess, suspendProcess] },
    });
    expect(result.proposals).toHaveLength(1);
    expect(result.proposals[0].title).toBe('Analyst recommendation');
  });

  it('mints executable isolate-host plus a recommendation when a process-bearing finding has no selector (trigger: process uncovered)', () => {
    const result = decidePackageReport({
      conversationId,
      state: baseHitState({ hasProcessBearingEvent: true, processSelectors: [] }),
      catalog: { ok: true, actions: [isolateHost] },
    });
    expect(result.proposals).toHaveLength(2);
    expect(result.proposals.some((p) => p.actionWorkflowId === isolateHost.workflowId)).toBe(true);
    const recommendation = result.proposals.find((p) => p.title === 'Analyst recommendation');
    expect(recommendation?.comment).toContain('could not be resolved to a live process');
  });

  it('mints executable plus a recommendation when evidence is not host-scoped (trigger: not host-scoped)', () => {
    const result = decidePackageReport({
      conversationId,
      state: baseHitState({ allEventsActionable: false }),
      catalog: { ok: true, actions: [isolateHost] },
    });
    expect(result.proposals).toHaveLength(2);
    const recommendation = result.proposals.find((p) => p.title === 'Analyst recommendation');
    expect(recommendation?.comment).toContain('not host-scoped');
  });

  it('mints no recommendation when every host is enrolled, covered, and host-scoped', () => {
    const result = decidePackageReport({
      conversationId,
      state: baseHitState(),
      catalog: { ok: true, actions: [isolateHost] },
    });
    expect(result.proposals).toHaveLength(1);
    expect(result.proposals[0].actionWorkflowId).toBe(isolateHost.workflowId);
    expect(result.proposals.some((p) => p.title === 'Analyst recommendation')).toBe(false);
  });

  it('lifts manual_remediation lines into the recommendation comment', () => {
    const result = decidePackageReport({
      conversationId,
      state: baseHitState({ hosts: [], manualRemediation: ['Rotate credentials for role X.'] }),
      catalog: { ok: true, actions: [isolateHost] },
    });
    expect(result.proposals[0].comment).toContain('Rotate credentials for role X.');
  });

  it('mints the same recommendation subject key on a rerun of the same conversation', () => {
    const a = decidePackageReport({
      conversationId,
      state: baseHitState({ hosts: [] }),
      catalog: { ok: true, actions: [isolateHost] },
    });
    const b = decidePackageReport({
      conversationId,
      state: baseHitState({ hosts: [] }),
      catalog: { ok: true, actions: [isolateHost] },
    });
    expect(a.proposals[0].subjectKey).toBe(b.proposals[0].subjectKey);
  });

  it('mints kill/suspend per process selector when process fields are present', () => {
    const result = decidePackageReport({
      conversationId,
      state: baseHitState({
        processSelectors: [
          { pid: 100, processKey: 'pid:100', hostName: 'host-a', processName: 'a.exe' },
          {
            entityId: 'ent-9',
            processKey: 'entity:ent-9',
            hostName: 'host-a',
            processName: 'b.exe',
          },
        ],
      }),
      catalog: { ok: true, actions: [killProcess] },
    });
    expect(result.proposals).toHaveLength(2);
    expect(result.proposals.every((p) => p.actionWorkflowId === killProcess.workflowId)).toBe(true);
    expect(result.proposals[0].actionInput?.parameters).toEqual({ pid: 100 });
    expect(result.proposals[1].actionInput?.parameters).toEqual({ entity_id: 'ent-9' });
    // Distinct titles: each process gets its own title, so two kill-process proposals on the
    // same host read as distinct, not duplicates.
    expect(result.proposals[0].title).toBe('Kill a.exe (PID 100) on host-a');
    expect(result.proposals[1].title).toBe('Kill b.exe on host-a');
    expect(result.proposals[0].comment).toContain('a.exe');
    expect(result.proposals[1].comment).toContain('b.exe');
  });

  it('never applies a process selector observed on one host to a different host', () => {
    const result = decidePackageReport({
      conversationId,
      state: baseHitState({
        hosts: [
          { name: 'host-a', enrolled: true, agentId: 'agent-a' },
          { name: 'host-b', enrolled: true, agentId: 'agent-b' },
        ],
        processSelectors: [
          { pid: 100, processKey: 'pid:100', hostName: 'host-a', processName: 'a.exe' },
        ],
      }),
      catalog: { ok: true, actions: [killProcess] },
    });
    // host-a fills kill-process from its own selector; host-b, with no selector of its own,
    // mints nothing rather than borrowing host-a's.
    expect(result.proposals).toHaveLength(1);
    expect(result.proposals[0].hostName).toBe('host-a');
    expect(result.proposals[0].actionInput?.parameters).toEqual({ pid: 100 });
  });

  it('builds stable subject keys for the same host × action × process', () => {
    expect(
      buildProposalSubjectKey({
        conversationId: 'c',
        endpointId: 'e',
        actionWorkflowId: 'a',
        processKey: 'p',
      })
    ).toBe(
      buildProposalSubjectKey({
        conversationId: 'c',
        endpointId: 'e',
        actionWorkflowId: 'a',
        processKey: 'p',
      })
    );
  });
});
