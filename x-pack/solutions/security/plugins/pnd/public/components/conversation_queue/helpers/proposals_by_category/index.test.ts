/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CONVERSATION_QUEUE_CATEGORIES, SYSTEM_SECURITY_WATCH_DEEP_ID } from '@kbn/pnd-common';
import type { PndProposalGroup, PndProposalRow, RecommendedAction } from '@kbn/pnd-common';

import { proposalsByCategory } from '.';

const createProposal = ({
  createdAt = '2026-08-05T12:00:00.000Z',
  recommendedAction,
  suffix,
}: {
  createdAt?: string;
  recommendedAction: RecommendedAction;
  suffix: string;
}): PndProposalRow => ({
  alwaysGate: false,
  correlationId: `alert-${suffix}`,
  createdAt,
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

const group = (
  recommendedAction: RecommendedAction,
  suffixes: string[],
  createdAt?: string
): PndProposalGroup => ({
  proposals: suffixes.map((suffix) => createProposal({ createdAt, recommendedAction, suffix })),
  recommendedAction,
});

describe('proposalsByCategory', () => {
  it('returns an entry for every category, in contain → escalate → investigate → tune order', () => {
    const result = proposalsByCategory({ groups: [group('tune', ['1'])] });

    expect(result.map(({ action }) => action)).toEqual(
      CONVERSATION_QUEUE_CATEGORIES.map(({ id }) => id)
    );
  });

  it('files a group’s rows under its own category', () => {
    const result = proposalsByCategory({ groups: [group('tune', ['1'])] });

    expect(
      result.find(({ action }) => action === 'tune')?.proposals.map(({ sourceId }) => sourceId)
    ).toEqual([`${SYSTEM_SECURITY_WATCH_DEEP_ID}:run-1:step-1`]);
  });

  it('leaves a category the response omitted empty rather than absent', () => {
    const result = proposalsByCategory({ groups: [group('tune', ['1'])] });

    expect(result.find(({ action }) => action === 'contain')?.proposals).toEqual([]);
  });

  it('returns four empty buckets for an empty response', () => {
    const result = proposalsByCategory({ groups: [] });

    expect(result.map(({ proposals }) => proposals)).toEqual([[], [], [], []]);
  });

  it('concatenates two groups that share one action, so no row is silently dropped', () => {
    const result = proposalsByCategory({
      groups: [group('escalate', ['1']), group('escalate', ['2'])],
    });

    expect(
      result.find(({ action }) => action === 'escalate')?.proposals.map(({ gateId }) => gateId)
    ).toEqual(['gate-1', 'gate-2']);
  });

  it('sorts rows inside a category by risk, then age, then id', () => {
    const older = createProposal({
      createdAt: '2026-08-01T12:00:00.000Z',
      recommendedAction: 'contain',
      suffix: 'older',
    });
    const newer = createProposal({
      createdAt: '2026-08-05T12:00:00.000Z',
      recommendedAction: 'contain',
      suffix: 'newer',
    });

    const result = proposalsByCategory({
      groups: [{ proposals: [newer, older], recommendedAction: 'contain' }],
    });

    expect(result[0].proposals.map(({ sourceId }) => sourceId)).toEqual([
      older.sourceId,
      newer.sourceId,
    ]);
  });

  it('does not mutate the groups it was given', () => {
    const groups = [group('escalate', ['1'])];
    const before = JSON.stringify(groups);

    proposalsByCategory({ groups });

    expect(JSON.stringify(groups)).toBe(before);
  });
});
