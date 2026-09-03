/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PndProposalGroup, PndProposalRow } from '@kbn/pnd-common';
import { SYSTEM_SECURITY_WATCH_DEEP_ID, SYSTEM_SECURITY_WATCH_FLOOR_ID } from '@kbn/pnd-common';

import { filterGroupsByWatch } from '.';

const createProposal = ({
  sourceId,
  workflowId,
}: {
  sourceId: string;
  workflowId: string;
}): PndProposalRow => ({
  alwaysGate: false,
  correlationId: `alert-${sourceId}`,
  createdAt: '2026-08-06T12:00:00.000Z',
  gateId: `gate-${sourceId}`,
  inputSchema: {},
  message: `Gate message for ${sourceId}`,
  reasoning: `Reasoning for ${sourceId}`,
  recommendedAction: 'investigate',
  reversible: true,
  sourceId,
  stepExecutionId: 'step-1',
  stepId: 'await_investigate',
  title: `Gate message for ${sourceId}`,
  workflowId,
  workflowRunId: `run-${sourceId}`,
});

const deepGate = createProposal({ sourceId: 'deep-1', workflowId: SYSTEM_SECURITY_WATCH_DEEP_ID });

const floorGate = createProposal({
  sourceId: 'floor-1',
  workflowId: SYSTEM_SECURITY_WATCH_FLOOR_ID,
});

const otherFloorGate = createProposal({
  sourceId: 'floor-2',
  workflowId: SYSTEM_SECURITY_WATCH_FLOOR_ID,
});

const groups: PndProposalGroup[] = [
  { proposals: [deepGate, floorGate], recommendedAction: 'investigate' },
  { proposals: [otherFloorGate], recommendedAction: 'contain' },
];

describe('filterGroupsByWatch', () => {
  it('returns nothing for no groups at all', () => {
    expect(filterGroupsByWatch({ groups: [], watchFilter: null })).toEqual([]);
  });

  it('keeps every group when no watch is selected', () => {
    expect(filterGroupsByWatch({ groups, watchFilter: null })).toHaveLength(2);
  });

  it('keeps only the rows the selected watch raised', () => {
    const [investigate] = filterGroupsByWatch({
      groups,
      watchFilter: SYSTEM_SECURITY_WATCH_DEEP_ID,
    });

    expect(investigate.proposals).toEqual([deepGate]);
  });

  it('drops a bucket the selected watch raised nothing in', () => {
    expect(
      filterGroupsByWatch({ groups, watchFilter: SYSTEM_SECURITY_WATCH_DEEP_ID })
    ).toHaveLength(1);
  });

  it('keeps every bucket a watch raised rows in', () => {
    expect(
      filterGroupsByWatch({ groups, watchFilter: SYSTEM_SECURITY_WATCH_FLOOR_ID })
    ).toHaveLength(2);
  });

  it('returns nothing when the selected watch raised nothing at all', () => {
    expect(filterGroupsByWatch({ groups, watchFilter: 'a-watch-with-no-rows' })).toEqual([]);
  });

  it('drops a group that arrived empty, even unfiltered', () => {
    expect(
      filterGroupsByWatch({
        groups: [{ proposals: [], recommendedAction: 'tune' }],
        watchFilter: null,
      })
    ).toEqual([]);
  });

  it('leaves the groups it was given untouched', () => {
    filterGroupsByWatch({ groups, watchFilter: SYSTEM_SECURITY_WATCH_DEEP_ID });

    expect(groups[0].proposals).toEqual([deepGate, floorGate]);
  });
});
