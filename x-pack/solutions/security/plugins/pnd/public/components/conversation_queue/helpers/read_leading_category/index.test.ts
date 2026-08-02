/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  PND_GATE_IDS,
  SYSTEM_SECURITY_WATCH_FLOOR_ID,
  type PndProposalRow,
  type RecommendedAction,
} from '@kbn/pnd-common';

import { readLeadingCategory } from '.';

const createProposal = (recommendedAction: RecommendedAction): PndProposalRow => ({
  alwaysGate: false,
  correlationId: 'alert-1',
  createdAt: '2026-08-18T12:00:00.000Z',
  gateId: PND_GATE_IDS.incidentContained,
  inputSchema: {},
  message: `Gate message for ${recommendedAction}`,
  reasoning: `Reasoning for ${recommendedAction}`,
  recommendedAction,
  reversible: false,
  sourceId: `${SYSTEM_SECURITY_WATCH_FLOOR_ID}:run-1:step-${recommendedAction}`,
  stepExecutionId: `step-${recommendedAction}`,
  stepId: `await_${recommendedAction}`,
  title: `Gate message for ${recommendedAction}`,
  workflowId: SYSTEM_SECURITY_WATCH_FLOOR_ID,
  workflowRunId: 'run-1',
});

describe('readLeadingCategory', () => {
  it('reads the only category a single-proposal group is waiting on', () => {
    expect(readLeadingCategory({ proposals: [createProposal('tune')] })).toBe('tune');
  });

  it('leads with containment over tuning, whatever order the rows arrive in', () => {
    const proposals = [createProposal('tune'), createProposal('contain')];

    expect(readLeadingCategory({ proposals })).toBe('contain');
  });

  it('leads with escalation over investigation', () => {
    const proposals = [createProposal('investigate'), createProposal('escalate')];

    expect(readLeadingCategory({ proposals })).toBe('escalate');
  });

  /** Expressed rather than asserted away, so a caller draws no accent instead of the wrong one. */
  it('reads no category from a group with no rows', () => {
    expect(readLeadingCategory({ proposals: [] })).toBeUndefined();
  });
});
