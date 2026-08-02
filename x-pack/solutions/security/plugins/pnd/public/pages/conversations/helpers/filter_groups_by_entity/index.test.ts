/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SYSTEM_SECURITY_WATCH_DEEP_ID } from '@kbn/pnd-common';
import type { PndProposalGroup, PndProposalRow, RecommendedAction } from '@kbn/pnd-common';

import type { PndBlastRadiusEntity } from '../../../../components/filters/blast_radius';
import { filterGroupsByEntity } from '.';

const createProposal = ({
  correlationId,
  recommendedAction,
}: {
  correlationId: string;
  recommendedAction: RecommendedAction;
}): PndProposalRow => ({
  alwaysGate: false,
  correlationId,
  createdAt: '2026-08-06T12:00:00.000Z',
  gateId: `gate-${correlationId}`,
  inputSchema: {},
  message: `Gate message for ${correlationId}`,
  reasoning: `Reasoning for ${correlationId}`,
  recommendedAction,
  reversible: true,
  sourceId: `${SYSTEM_SECURITY_WATCH_DEEP_ID}:run-${correlationId}:step-1`,
  stepExecutionId: 'step-1',
  stepId: `await_${recommendedAction}`,
  title: `Gate message for ${correlationId}`,
  workflowId: SYSTEM_SECURITY_WATCH_DEEP_ID,
  workflowRunId: `run-${correlationId}`,
});

const containsAdOne = createProposal({
  correlationId: 'ad-1',
  recommendedAction: 'contain',
});

const escalatesAdTwo = createProposal({
  correlationId: 'ad-2',
  recommendedAction: 'escalate',
});

const escalatesUncorrelated = createProposal({
  correlationId: '',
  recommendedAction: 'escalate',
});

const groups: PndProposalGroup[] = [
  { proposals: [containsAdOne], recommendedAction: 'contain' },
  { proposals: [escalatesAdTwo, escalatesUncorrelated], recommendedAction: 'escalate' },
];

const entity = (correlationIds: string[]): PndBlastRadiusEntity => ({
  correlationIds,
  count: 3,
  field: 'host.name',
  id: 'host.name:host-1',
  value: 'host-1',
});

describe('filterGroupsByEntity', () => {
  it('returns the groups untouched when nothing is filtering them', () => {
    expect(filterGroupsByEntity({ entity: null, groups })).toBe(groups);
  });

  it('keeps a proposal whose discovery contributed the entity', () => {
    expect(filterGroupsByEntity({ entity: entity(['ad-1']), groups })).toEqual([
      { proposals: [containsAdOne], recommendedAction: 'contain' },
    ]);
  });

  it('keeps every proposal across the discoveries that contributed the entity', () => {
    expect(
      filterGroupsByEntity({ entity: entity(['ad-1', 'ad-2']), groups }).flatMap(
        ({ proposals }) => proposals
      )
    ).toEqual([containsAdOne, escalatesAdTwo]);
  });

  it('drops a group the filter emptied rather than sending an empty bucket on', () => {
    expect(
      filterGroupsByEntity({ entity: entity(['ad-2']), groups }).map(
        ({ recommendedAction }) => recommendedAction
      )
    ).toEqual(['escalate']);
  });

  it('drops an uncorrelated proposal, which no entity can vouch for', () => {
    expect(
      filterGroupsByEntity({ entity: entity(['ad-2']), groups }).flatMap(
        ({ proposals }) => proposals
      )
    ).toEqual([escalatesAdTwo]);
  });

  it('returns nothing when no visible proposal carries the entity', () => {
    expect(filterGroupsByEntity({ entity: entity(['ad-9']), groups })).toEqual([]);
  });

  it('leaves the groups it was given unmodified', () => {
    filterGroupsByEntity({ entity: entity(['ad-1']), groups });

    expect(groups[1].proposals).toHaveLength(2);
  });
});
