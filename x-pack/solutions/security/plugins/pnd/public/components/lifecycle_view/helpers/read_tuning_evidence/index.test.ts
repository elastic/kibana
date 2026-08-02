/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PND_GATE_IDS, RECOMMENDED_ACTIONS } from '@kbn/pnd-common';
import type { PndProposalRow } from '@kbn/pnd-common';

import { readTuningEvidence, selectTuningProposal, TUNING_EVIDENCE_GATE_ID } from '.';

const proposal = (overrides: Partial<PndProposalRow> = {}): PndProposalRow => ({
  alwaysGate: true,
  correlationId: 'ad-1',
  createdAt: '2026-08-03T10:00:00.000Z',
  gateId: PND_GATE_IDS.applyTuning,
  inputSchema: {},
  message: 'Apply this detection-rule tuning?',
  reasoning: 'Add an exception for the backup service account.',
  recommendedAction: RECOMMENDED_ACTIONS[3],
  reversible: false,
  sourceId: 'source-1',
  stepExecutionId: 'step-1',
  stepId: 'await_apply_tuning',
  title: 'Apply tuning',
  workflowId: 'system-security-watch-post-incident',
  workflowRunId: 'run-1',
  ...overrides,
});

describe('TUNING_EVIDENCE_GATE_ID', () => {
  it('is the apply-tuning gate, the only gate that carries tuning evidence', () => {
    expect(TUNING_EVIDENCE_GATE_ID).toBe(PND_GATE_IDS.applyTuning);
  });
});

describe('selectTuningProposal', () => {
  it('returns the pending apply-tuning gate for the discovery', () => {
    const match = proposal();

    expect(
      selectTuningProposal({
        correlationId: 'ad-1',
        groups: [{ proposals: [match], recommendedAction: RECOMMENDED_ACTIONS[3] }],
      })
    ).toEqual(match);
  });

  it('ignores a gate belonging to another discovery, so evidence never leaks across discoveries', () => {
    const other = proposal({ correlationId: 'ad-2' });

    expect(
      selectTuningProposal({
        correlationId: 'ad-1',
        groups: [{ proposals: [other], recommendedAction: RECOMMENDED_ACTIONS[3] }],
      })
    ).toBeUndefined();
  });

  it('ignores a gate that is not the apply-tuning gate', () => {
    const contain = proposal({ gateId: PND_GATE_IDS.incidentContained });

    expect(
      selectTuningProposal({
        correlationId: 'ad-1',
        groups: [{ proposals: [contain], recommendedAction: RECOMMENDED_ACTIONS[0] }],
      })
    ).toBeUndefined();
  });

  it('returns undefined when there are no groups', () => {
    expect(selectTuningProposal({ correlationId: 'ad-1', groups: [] })).toBeUndefined();
  });

  it('returns undefined for an empty discovery id, so an uncorrelated gate never matches', () => {
    const uncorrelated = proposal({ correlationId: '' });

    expect(
      selectTuningProposal({
        correlationId: '',
        groups: [{ proposals: [uncorrelated], recommendedAction: RECOMMENDED_ACTIONS[3] }],
      })
    ).toBeUndefined();
  });
});

describe('readTuningEvidence', () => {
  it('returns nothing for no proposal', () => {
    expect(readTuningEvidence(undefined)).toEqual({});
  });

  it('carries the reasoning the model wrote for the gate', () => {
    expect(readTuningEvidence(proposal()).reasoning).toBe(
      'Add an exception for the backup service account.'
    );
  });

  it('drops whitespace-only reasoning rather than rendering an empty block', () => {
    expect(readTuningEvidence(proposal({ reasoning: '   ' })).reasoning).toBeUndefined();
  });

  it('carries the backtest preview when the proposal has one', () => {
    const preview = { after: { alertCount: 1 }, before: { alertCount: 9 } };

    expect(readTuningEvidence(proposal({ preview })).preview).toEqual(preview);
  });

  it('leaves the preview undefined when the proposal has none, so the card says so explicitly', () => {
    expect(readTuningEvidence(proposal()).preview).toBeUndefined();
  });

  it('reads a structured change once the contract carries one', () => {
    const change = { note: 'Check the backup window first.' };

    expect(readTuningEvidence({ ...proposal(), change }).change).toEqual(change);
  });

  it('ignores a change that is not an object', () => {
    expect(readTuningEvidence({ ...proposal(), change: 'disable it' }).change).toBeUndefined();
  });

  it('ignores a change that is an array', () => {
    expect(readTuningEvidence({ ...proposal(), change: [] }).change).toBeUndefined();
  });

  it('reads a rule id once the contract carries one', () => {
    expect(readTuningEvidence({ ...proposal(), ruleId: 'rule-1' }).ruleId).toBe('rule-1');
  });

  it('ignores a rule id that is not a string', () => {
    expect(readTuningEvidence({ ...proposal(), ruleId: 7 }).ruleId).toBeUndefined();
  });
});
