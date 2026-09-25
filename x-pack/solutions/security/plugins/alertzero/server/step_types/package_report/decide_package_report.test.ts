/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionCatalogEntry } from '@kbn/alertzero-common';
import {
  buildProposalSubjectKey,
  decidePackageReport,
} from './decide_package_report';
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
  });

  it('does not drop or duplicate subject keys when catalog order changes', () => {
    const state = baseHitState({
      processSelectors: [{ pid: 4242, processKey: 'pid:4242' }],
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

  it('mints an actionless recommendation when the hit is hostless', () => {
    const result = decidePackageReport({
      conversationId,
      state: baseHitState({ hosts: [] }),
      catalog: { ok: true, actions: [isolateHost] },
    });
    expect(result.dismiss).toBe(false);
    expect(result.proposals).toHaveLength(1);
    expect(result.proposals[0].actionWorkflowId).toBeUndefined();
    expect(result.proposals[0].actionlessReason).toBe('hostless');
  });

  it('mints an actionless recommendation naming unenrolled hosts', () => {
    const result = decidePackageReport({
      conversationId,
      state: baseHitState({
        hosts: [{ name: 'ghost', enrolled: false }],
      }),
      catalog: { ok: true, actions: [isolateHost] },
    });
    expect(result.proposals).toHaveLength(1);
    expect(result.proposals[0].actionlessReason).toBe('unenrolled');
    expect(result.proposals[0].comment).toContain('ghost');
  });

  it('mints executable plus companion actionless when some hosts are unenrolled', () => {
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
    expect(result.proposals.some((p) => p.actionlessReason === 'unenrolled')).toBe(true);
  });

  it('returns actionless when the catalog errors', () => {
    const result = decidePackageReport({
      conversationId,
      state: baseHitState(),
      catalog: { ok: false, reason: 'catalog_error' },
    });
    expect(result.proposals).toHaveLength(1);
    expect(result.proposals[0].actionlessReason).toBe('catalog_error');
  });

  it('returns actionless when zero respond actions are installed', () => {
    const result = decidePackageReport({
      conversationId,
      state: baseHitState(),
      catalog: { ok: true, actions: [configureAction] },
    });
    expect(result.proposals).toHaveLength(1);
    expect(result.proposals[0].actionlessReason).toBe('catalog_empty');
  });

  it('skips kill/suspend when process fields are absent', () => {
    const result = decidePackageReport({
      conversationId,
      state: baseHitState({ processSelectors: [] }),
      catalog: { ok: true, actions: [killProcess, suspendProcess] },
    });
    expect(result.proposals).toHaveLength(1);
    expect(result.proposals[0].actionlessReason).toBe('no_fillable_action');
  });

  it('mints kill/suspend per process selector when process fields are present', () => {
    const result = decidePackageReport({
      conversationId,
      state: baseHitState({
        processSelectors: [
          { pid: 100, processKey: 'pid:100' },
          { entityId: 'ent-9', processKey: 'entity:ent-9' },
        ],
      }),
      catalog: { ok: true, actions: [killProcess] },
    });
    expect(result.proposals).toHaveLength(2);
    expect(result.proposals.every((p) => p.actionWorkflowId === killProcess.workflowId)).toBe(
      true
    );
    expect(result.proposals[0].actionInput?.parameters).toEqual({ pid: 100 });
    expect(result.proposals[1].actionInput?.parameters).toEqual({ entity_id: 'ent-9' });
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
