/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CONVERSATION_QUEUE_CATEGORIES, SYSTEM_SECURITY_WATCH_DEEP_ID } from '@kbn/pnd-common';
import type { PndProposalGroup, PndProposalRow, RecommendedAction } from '@kbn/pnd-common';

import { visibleTypeSections } from '.';

const createProposal = (recommendedAction: RecommendedAction): PndProposalRow => ({
  alwaysGate: false,
  correlationId: `alert-${recommendedAction}`,
  createdAt: '2026-08-05T12:00:00.000Z',
  gateId: `gate-${recommendedAction}`,
  inputSchema: {},
  message: `Gate message ${recommendedAction}`,
  reasoning: `Reasoning ${recommendedAction}`,
  recommendedAction,
  reversible: true,
  sourceId: `${SYSTEM_SECURITY_WATCH_DEEP_ID}:run-${recommendedAction}:step-${recommendedAction}`,
  stepExecutionId: `step-${recommendedAction}`,
  stepId: `await_${recommendedAction}`,
  title: `Gate message ${recommendedAction}`,
  workflowId: SYSTEM_SECURITY_WATCH_DEEP_ID,
  workflowRunId: `run-${recommendedAction}`,
});

const group = (recommendedAction: RecommendedAction): PndProposalGroup => ({
  proposals: [createProposal(recommendedAction)],
  recommendedAction,
});

describe('visibleTypeSections', () => {
  it('renders only populated categories when no filter is active', () => {
    const result = visibleTypeSections({ groups: [group('investigate')], isFilterActive: false });

    expect(result.map(({ action }) => action)).toEqual(['investigate']);
  });

  it('renders all four categories, including zeroes, when a filter is active', () => {
    const result = visibleTypeSections({ groups: [group('investigate')], isFilterActive: true });

    expect(result.map(({ action, count }) => ({ action, count }))).toEqual(
      CONVERSATION_QUEUE_CATEGORIES.map(({ id }) => ({
        action: id,
        count: id === 'investigate' ? 1 : 0,
      }))
    );
  });

  it('renders four zero sections when a filter has left nothing pending', () => {
    const result = visibleTypeSections({ groups: [], isFilterActive: true });

    expect(result.map(({ count }) => count)).toEqual([0, 0, 0, 0]);
  });

  it('renders no sections when the queue is genuinely empty and no filter is active', () => {
    const result = visibleTypeSections({ groups: [], isFilterActive: false });

    expect(result).toEqual([]);
  });

  it('counts only pending rows in the header badge', () => {
    const result = visibleTypeSections({
      groups: [group('contain'), group('contain')],
      isFilterActive: false,
    });

    expect(result[0].count).toEqual(2);
  });

  it('keeps contain → escalate → investigate → tune order when every category is populated', () => {
    const result = visibleTypeSections({
      groups: [group('tune'), group('contain'), group('investigate'), group('escalate')],
      isFilterActive: false,
    });

    expect(result.map(({ action }) => action)).toEqual(
      CONVERSATION_QUEUE_CATEGORIES.map(({ id }) => id)
    );
  });
});
