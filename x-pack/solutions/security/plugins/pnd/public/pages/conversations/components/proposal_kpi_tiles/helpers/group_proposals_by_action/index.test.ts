/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SYSTEM_SECURITY_WATCH_DEEP_ID } from '@kbn/pnd-common';
import type { PndProposalGroup, PndProposalRow, RecommendedAction } from '@kbn/pnd-common';

import { groupProposalsByAction } from '.';

const createProposal = ({
  recommendedAction,
  suffix,
}: {
  recommendedAction: RecommendedAction;
  suffix: string;
}): PndProposalRow => ({
  alwaysGate: false,
  correlationId: `alert-${suffix}`,
  createdAt: '2026-08-05T12:00:00.000Z',
  gateId: `gate-${suffix}`,
  inputSchema: {},
  message: `Gate message ${suffix}`,
  reasoning: `Reasoning ${suffix}`,
  recommendedAction,
  reversible: true,
  sourceId: `${SYSTEM_SECURITY_WATCH_DEEP_ID}:run-${suffix}:step-${suffix}`,
  stepExecutionId: `step-${suffix}`,
  stepId: `await_${recommendedAction}`,
  title: `Gate message ${suffix}`,
  workflowId: SYSTEM_SECURITY_WATCH_DEEP_ID,
  workflowRunId: `run-${suffix}`,
});

const group = (recommendedAction: RecommendedAction, suffixes: string[]): PndProposalGroup => ({
  proposals: suffixes.map((suffix) => createProposal({ recommendedAction, suffix })),
  recommendedAction,
});

describe('groupProposalsByAction', () => {
  it('returns an entry for every action, including the ones the response omits', () => {
    const result = groupProposalsByAction([group('investigate', ['1'])]);

    expect(Object.keys(result).sort()).toEqual(['contain', 'escalate', 'investigate', 'tune']);
  });

  it('files a group’s rows under its own action', () => {
    const result = groupProposalsByAction([group('tune', ['1'])]);

    expect(result.tune.map(({ sourceId }) => sourceId)).toEqual([
      `${SYSTEM_SECURITY_WATCH_DEEP_ID}:run-1:step-1`,
    ]);
  });

  it('leaves an action the response omitted empty rather than absent', () => {
    const result = groupProposalsByAction([group('tune', ['1'])]);

    expect(result.contain).toEqual([]);
  });

  it('returns four empty buckets for an empty response', () => {
    const result = groupProposalsByAction([]);

    expect(result).toEqual({ contain: [], escalate: [], investigate: [], tune: [] });
  });

  it('keeps the order the server sent the rows in', () => {
    const result = groupProposalsByAction([group('contain', ['1', '2', '3'])]);

    expect(result.contain.map(({ gateId }) => gateId)).toEqual(['gate-1', 'gate-2', 'gate-3']);
  });

  it('concatenates two groups that share one action, so no row is silently dropped', () => {
    const result = groupProposalsByAction([group('escalate', ['1']), group('escalate', ['2'])]);

    expect(result.escalate.map(({ gateId }) => gateId)).toEqual(['gate-1', 'gate-2']);
  });

  it('does not mutate the groups it was given', () => {
    const groups = [group('escalate', ['1'])];
    const before = JSON.stringify(groups);

    groupProposalsByAction(groups);

    expect(JSON.stringify(groups)).toBe(before);
  });
});
