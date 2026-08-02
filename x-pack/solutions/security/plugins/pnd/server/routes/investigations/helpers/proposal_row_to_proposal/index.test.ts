/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Proposal,
  type PndProposalRow,
  SYSTEM_SECURITY_WATCH_FLOOR_ID,
  TEMPLATE_ID_PROPOSAL,
} from '@kbn/pnd-common';

import { proposalRowToProposal } from '.';

const PARENT_CONVERSATION_ID = 'a1f4c2e8-6b3d-4f9a-8c7e-2d5b9f0a1c34';

const row = (overrides: Partial<PndProposalRow> = {}): PndProposalRow => ({
  alwaysGate: false,
  correlationId: 'ad-1',
  createdAt: '2026-08-02T00:05:00.000Z',
  gateId: 'open_investigation',
  inputSchema: { type: 'object' },
  message: 'Open an investigation for ad-1?',
  reasoning: 'High-confidence lateral movement detected',
  recommendedAction: 'investigate',
  reversible: true,
  sourceId: 'src-1',
  stepExecutionId: 'step-exec-1',
  stepId: 'await_open_investigation',
  threadConversationId: 'a1c2022a-57ea-5afa-a7fa-c85ff30b0001',
  title: 'Open investigation',
  workflowId: SYSTEM_SECURITY_WATCH_FLOOR_ID,
  workflowRunId: 'run-1',
  ...overrides,
});

const project = (overrides: Partial<PndProposalRow> = {}) =>
  proposalRowToProposal({ parentConversationId: PARENT_CONVERSATION_ID, row: row(overrides) });

describe('proposalRowToProposal', () => {
  it('produces a payload that validates against the Proposal contract', () => {
    expect(() => Proposal.parse(project())).not.toThrow();
  });

  it('maps the fields that mean the same thing in both types', () => {
    expect(project()).toEqual(
      expect.objectContaining({
        approvalRequired: true,
        id: 'src-1',
        parentConversationId: PARENT_CONVERSATION_ID,
        reasoning: 'High-confidence lateral movement detected',
        recommendation: 'Open an investigation for ad-1?',
        sourceWatchId: SYSTEM_SECURITY_WATCH_FLOOR_ID,
        template_id: TEMPLATE_ID_PROPOSAL,
        type: 'investigate',
      })
    );
  });

  // `id` is how a client addresses the proposal in this contract; `sourceId` is how `_respond`
  // addresses the parked gate. They are the same value, so a client that only knows `Proposal`
  // can still answer the gate.
  it('addresses the gate under both id and sourceId', () => {
    const proposal = project();

    expect(proposal.id).toBe('src-1');
    expect(proposal.sourceId).toBe('src-1');
  });

  it('carries the gate projection this contract had no field for', () => {
    expect(project()).toEqual(
      expect.objectContaining({
        alwaysGate: false,
        correlationId: 'ad-1',
        createdAt: '2026-08-02T00:05:00.000Z',
        gateId: 'open_investigation',
        inputSchema: { type: 'object' },
        reversible: true,
        threadConversationId: 'a1c2022a-57ea-5afa-a7fa-c85ff30b0001',
      })
    );
  });

  it('cites the correlated discovery as evidence rather than inlining it', () => {
    expect(project().evidenceRefs).toEqual([{ id: 'ad-1', type: 'attack_discovery' }]);
  });

  it('cites no evidence for an uncorrelated gate', () => {
    expect(project({ correlationId: '' }).evidenceRefs).toEqual([]);
  });

  // Absent, never blank — the same rule the row itself follows, so a surface can tell "no
  // discovery" from "a discovery at id ''".
  it('omits correlationId rather than blanking it for an uncorrelated gate', () => {
    expect(project({ correlationId: '' })).not.toHaveProperty('correlationId');
  });

  // There is no measured confidence at a parked gate, and inventing one is the failure mode
  // `security.detectionChangeSignal` already made the same field optional to avoid.
  it('omits confidence rather than inventing one', () => {
    expect(project()).not.toHaveProperty('confidence');
  });

  it('reports a pending gate as pending', () => {
    expect(project().status).toBe('pending');
  });

  it.each([
    ['approve', 'approved'],
    ['dismiss', 'dismissed'],
  ] as const)('reports a gate answered with %s as %s', (decision, status) => {
    expect(project({ decision }).status).toBe(status);
  });

  it('prefers the resolved thread title over the gate prompt title', () => {
    expect(project({ threadTitle: 'Lateral movement on host-7' }).summary).toBe(
      'Lateral movement on host-7'
    );
  });

  it('falls back to the gate prompt title when no thread has materialised', () => {
    expect(project({ threadTitle: undefined }).summary).toBe('Open investigation');
  });

  it('carries the anchored tuning backtest when the gate has one', () => {
    const preview = {
      after: { alertCount: 3, from: 'now-24h', to: 'now' },
      before: { alertCount: 41, from: 'now-24h', to: 'now' },
    };

    expect(project({ gateId: 'apply_tuning', preview }).preview).toEqual(preview);
  });

  it('omits the backtest when the gate has none', () => {
    expect(project()).not.toHaveProperty('preview');
  });

  // Nobody is assigned a parked gate and no deadline is attached to one, and both fields are
  // nullable rather than optional in the contract, so `null` is the honest value.
  it('reports no assignee and no sla rather than inventing either', () => {
    expect(project()).toEqual(expect.objectContaining({ assignee: null, events: [], sla: null }));
  });
});
