/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PND_GATE_IDS, SYSTEM_SECURITY_WATCH_FLOOR_ID } from '@kbn/pnd-common';
import type { PndProposalRow } from '@kbn/pnd-common';

import { decisionToastTitle } from '.';

const createProposal = (gateId: string): PndProposalRow => ({
  alwaysGate: false,
  correlationId: 'alert-1',
  createdAt: '2026-08-17T12:00:00.000Z',
  gateId,
  inputSchema: {},
  message: 'Gate message',
  reasoning: 'Reasoning',
  recommendedAction: 'investigate',
  reversible: false,
  sourceId: `${SYSTEM_SECURITY_WATCH_FLOOR_ID}:run-1:step-1`,
  stepExecutionId: 'step-1',
  stepId: 'await_open_investigation',
  title: 'Gate message',
  workflowId: SYSTEM_SECURITY_WATCH_FLOOR_ID,
  workflowRunId: 'run-1',
});

describe('decisionToastTitle', () => {
  it('names the investigation continuing when that gate is approved', () => {
    expect(
      decisionToastTitle({
        answer: { decision: 'approve' },
        proposal: createProposal(PND_GATE_IDS.openInvestigation),
      })
    ).toBe('Approved: The investigation will continue');
  });

  it('names the incident being created when the promote gate is approved', () => {
    expect(
      decisionToastTitle({
        answer: { decision: 'approve' },
        proposal: createProposal(PND_GATE_IDS.promoteIncident),
      })
    ).toBe('Approved: Incident created');
  });

  it('names containment when that gate is approved', () => {
    expect(
      decisionToastTitle({
        answer: { decision: 'approve' },
        proposal: createProposal(PND_GATE_IDS.incidentContained),
      })
    ).toBe('Approved: The incident is contained');
  });

  it.each(Object.values(PND_GATE_IDS))(
    'says the run stops when the %s gate is dismissed',
    (gateId) => {
      expect(
        decisionToastTitle({
          answer: { decision: 'dismiss' },
          proposal: createProposal(gateId),
        })
      ).toBe('Dismissed. The run stops here.');
    }
  );

  it('falls back to the generic approval toast for a gate that does not open a container', () => {
    expect(
      decisionToastTitle({
        answer: { decision: 'approve' },
        proposal: createProposal(PND_GATE_IDS.applyTuning),
      })
    ).toBe('Approved. The run has moved on.');
  });

  it('falls back to the generic approval toast for a gate id outside the registry', () => {
    expect(
      decisionToastTitle({
        answer: { decision: 'approve' },
        proposal: createProposal('not_a_gate'),
      })
    ).toBe('Approved. The run has moved on.');
  });

  it('falls back to the generic approval toast when the answer carries no decision', () => {
    expect(
      decisionToastTitle({
        answer: { rationale: 'Confirmed.' },
        proposal: createProposal(PND_GATE_IDS.openInvestigation),
      })
    ).toBe('Approved. The run has moved on.');
  });
});
