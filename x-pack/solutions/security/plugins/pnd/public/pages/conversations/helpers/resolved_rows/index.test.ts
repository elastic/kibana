/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SYSTEM_SECURITY_WATCH_DEEP_ID } from '@kbn/pnd-common';
import type { PndProposalGroup, PndProposalRow, RecommendedAction } from '@kbn/pnd-common';

import { resolvedRows } from '.';

const createAnswered = ({
  decision = 'approve',
  recommendedAction = 'investigate',
  respondedAt,
  suffix,
}: {
  decision?: 'approve' | 'dismiss';
  recommendedAction?: RecommendedAction;
  respondedAt?: string;
  suffix: string;
}): PndProposalRow => ({
  alwaysGate: false,
  correlationId: `alert-${suffix}`,
  createdAt: '2026-08-05T12:00:00.000Z',
  decision,
  gateId: `gate-${suffix}`,
  inputSchema: {},
  message: `Gate message ${suffix}`,
  reasoning: `Reasoning ${suffix}`,
  recommendedAction,
  respondedAt,
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
  proposals: PndProposalRow[]
): PndProposalGroup => ({ proposals, recommendedAction });

describe('resolvedRows', () => {
  it('returns an empty list when there are no groups', () => {
    expect(resolvedRows([])).toEqual([]);
  });

  it('flattens every bucket into one list, because the record is not grouped by action', () => {
    const result = resolvedRows([
      group('contain', [createAnswered({ respondedAt: '2026-08-05T12:00:00.000Z', suffix: '1' })]),
      group('tune', [createAnswered({ respondedAt: '2026-08-05T11:00:00.000Z', suffix: '2' })]),
    ]);

    expect(result.map(({ sourceId }) => sourceId)).toEqual([
      `${SYSTEM_SECURITY_WATCH_DEEP_ID}:run-1:step-1`,
      `${SYSTEM_SECURITY_WATCH_DEEP_ID}:run-2:step-2`,
    ]);
  });

  it('sorts newest first, across buckets', () => {
    const result = resolvedRows([
      group('contain', [
        createAnswered({ respondedAt: '2026-08-05T09:00:00.000Z', suffix: 'oldest' }),
        createAnswered({ respondedAt: '2026-08-05T15:00:00.000Z', suffix: 'newest' }),
      ]),
      group('escalate', [
        createAnswered({ respondedAt: '2026-08-05T12:00:00.000Z', suffix: 'middle' }),
      ]),
    ]);

    expect(result.map(({ workflowRunId }) => workflowRunId)).toEqual([
      'run-newest',
      'run-middle',
      'run-oldest',
    ]);
  });

  it('drops a row with no decision, which is what makes a row a record', () => {
    const pending = createAnswered({ respondedAt: '2026-08-05T15:00:00.000Z', suffix: 'pending' });

    const result = resolvedRows([
      group('investigate', [
        { ...pending, decision: undefined },
        createAnswered({ respondedAt: '2026-08-05T12:00:00.000Z', suffix: 'answered' }),
      ]),
    ]);

    expect(result.map(({ workflowRunId }) => workflowRunId)).toEqual(['run-answered']);
  });

  it('sorts a row with no respondedAt last, because an absent timestamp is unknown rather than new', () => {
    const result = resolvedRows([
      group('investigate', [
        createAnswered({ suffix: 'undated' }),
        createAnswered({ respondedAt: '2026-08-05T09:00:00.000Z', suffix: 'dated' }),
      ]),
    ]);

    expect(result.map(({ workflowRunId }) => workflowRunId)).toEqual(['run-dated', 'run-undated']);
  });

  it('keeps both rows when neither carries a respondedAt', () => {
    const result = resolvedRows([
      group('investigate', [
        createAnswered({ suffix: 'first' }),
        createAnswered({ suffix: 'second' }),
      ]),
    ]);

    expect(result.map(({ workflowRunId }) => workflowRunId)).toEqual(['run-first', 'run-second']);
  });

  it('does not mutate the groups it was given', () => {
    const proposals = [
      createAnswered({ respondedAt: '2026-08-05T09:00:00.000Z', suffix: 'oldest' }),
      createAnswered({ respondedAt: '2026-08-05T15:00:00.000Z', suffix: 'newest' }),
    ];
    const groups = [group('contain', proposals)];

    resolvedRows(groups);

    expect(proposals.map(({ workflowRunId }) => workflowRunId)).toEqual([
      'run-oldest',
      'run-newest',
    ]);
  });

  it('keeps a dismissal in the record, so a dismissal can never be dropped as a non-event', () => {
    const result = resolvedRows([
      group('tune', [
        createAnswered({
          decision: 'dismiss',
          respondedAt: '2026-08-05T12:00:00.000Z',
          suffix: 'dismissed',
        }),
      ]),
    ]);

    expect(result.map(({ decision }) => decision)).toEqual(['dismiss']);
  });
});
