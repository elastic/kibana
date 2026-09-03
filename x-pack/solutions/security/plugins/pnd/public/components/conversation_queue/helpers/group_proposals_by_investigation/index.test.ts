/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  PND_GATE_IDS,
  SYSTEM_SECURITY_WATCH_FLOOR_ID,
  SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID,
  type PndProposalGroup,
  type PndProposalRow,
  type RecommendedAction,
} from '@kbn/pnd-common';

import { NO_INVESTIGATION_GROUP_KEY, groupProposalsByInvestigation } from '.';
import type { PndInvestigationGroup } from '.';

const ALERT_A = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';
const ALERT_B = 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb';

const createProposal = ({
  correlationId = ALERT_A,
  createdAt = '2026-08-18T12:00:00.000Z',
  gateId = PND_GATE_IDS.incidentContained,
  recommendedAction = 'contain',
  sourceId,
  workflowId = SYSTEM_SECURITY_WATCH_FLOOR_ID,
}: {
  correlationId?: string;
  createdAt?: string;
  gateId?: string;
  recommendedAction?: RecommendedAction;
  sourceId: string;
  workflowId?: string;
}): PndProposalRow => ({
  alwaysGate: false,
  correlationId,
  createdAt,
  gateId,
  inputSchema: {},
  message: `Gate message for ${sourceId}`,
  reasoning: `Reasoning for ${sourceId}`,
  recommendedAction,
  reversible: false,
  sourceId,
  stepExecutionId: `step-${sourceId}`,
  stepId: `await_${recommendedAction}`,
  title: `Gate message for ${sourceId}`,
  workflowId,
  workflowRunId: `run-${sourceId}`,
});

/** One bucket of the sparse, action-grouped payload the route really sends. */
const bucket = (
  recommendedAction: RecommendedAction,
  proposals: PndProposalRow[]
): PndProposalGroup => ({ proposals, recommendedAction });

/** Two gates of one discovery: containment on the floor, tuning on the post-incident watch. */
const containA = createProposal({ sourceId: 'contain-a' });
const tuneA = createProposal({
  gateId: PND_GATE_IDS.applyTuning,
  recommendedAction: 'tune',
  sourceId: 'tune-a',
  workflowId: SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID,
});

/** A second discovery, one gate. */
const containB = createProposal({
  correlationId: ALERT_B,
  sourceId: 'contain-b',
});

/** The lane's first gate: parked before its investigation exists. */
const openInvestigationA = createProposal({
  gateId: PND_GATE_IDS.openInvestigation,
  recommendedAction: 'investigate',
  sourceId: 'open-a',
});

const keysOf = (groups: readonly PndInvestigationGroup[]): string[] => groups.map(({ key }) => key);

const sourceIdsOf = (proposals: readonly PndProposalRow[]): string[] =>
  proposals.map(({ sourceId }) => sourceId);

describe('groupProposalsByInvestigation', () => {
  it('groups several proposals of one investigation into one group', () => {
    const result = groupProposalsByInvestigation({
      groups: [bucket('contain', [containA]), bucket('tune', [tuneA])],
    });

    expect(result).toHaveLength(1);
  });

  it('keys that group by the investigation the proposals belong to', () => {
    const result = groupProposalsByInvestigation({
      groups: [bucket('contain', [containA]), bucket('tune', [tuneA])],
    });

    expect(result[0].correlationId).toBe(ALERT_A);
  });

  it('holds both of that investigation’s proposals', () => {
    const result = groupProposalsByInvestigation({
      groups: [bucket('contain', [containA]), bucket('tune', [tuneA])],
    });

    expect(sourceIdsOf(result[0].proposals)).toEqual(['contain-a', 'tune-a']);
  });

  it('puts a proposal with no investigation in the container-less group', () => {
    const result = groupProposalsByInvestigation({
      groups: [bucket('investigate', [openInvestigationA])],
    });

    expect(keysOf(result)).toEqual([NO_INVESTIGATION_GROUP_KEY]);
  });

  /** `undefined` means *no investigation*, never *an investigation with no id*. */
  it('leaves the container-less group without a discovery id', () => {
    const result = groupProposalsByInvestigation({
      groups: [bucket('investigate', [openInvestigationA])],
    });

    expect(result[0].correlationId).toBeUndefined();
  });

  it('puts an uncorrelated run in the container-less group too', () => {
    const uncorrelated = createProposal({ correlationId: '', sourceId: 'uncorrelated' });

    const result = groupProposalsByInvestigation({ groups: [bucket('contain', [uncorrelated])] });

    expect(keysOf(result)).toEqual([NO_INVESTIGATION_GROUP_KEY]);
  });

  it('draws an investigation and the container-less group side by side', () => {
    const result = groupProposalsByInvestigation({
      groups: [bucket('contain', [containA]), bucket('investigate', [openInvestigationA])],
    });

    expect(keysOf(result)).toEqual([ALERT_A, NO_INVESTIGATION_GROUP_KEY]);
  });

  /**
   * The same discovery on both sides of the divide, which is the case a naive "group by
   * `correlationId`" would get wrong: the containment gate sits inside the investigation and
   * the gate that *opens* it does not, even though the two name one discovery.
   */
  it('separates a discovery’s opening gate from its in-container gates', () => {
    const result = groupProposalsByInvestigation({
      groups: [bucket('contain', [containA]), bucket('investigate', [openInvestigationA])],
    });

    expect(result.map(({ proposals }) => sourceIdsOf(proposals))).toEqual([
      ['contain-a'],
      ['open-a'],
    ]);
  });

  it('gives every investigation its own group', () => {
    const result = groupProposalsByInvestigation({
      groups: [bucket('contain', [containA, containB])],
    });

    expect(keysOf(result)).toEqual([ALERT_A, ALERT_B]);
  });

  it('leads with the riskiest investigation', () => {
    const result = groupProposalsByInvestigation({
      groups: [bucket('contain', [containA, containB])],
      riskScoreByDiscovery: new Map([
        [ALERT_A, 12],
        [ALERT_B, 91],
      ]),
    });

    expect(keysOf(result)).toEqual([ALERT_B, ALERT_A]);
  });

  /**
   * The container-less group holds the *newest* discoveries, so it is ordered by the same rule as any
   * other group rather than pinned to an end — burying a critical new discovery under every
   * investigation already open would be the opposite of a priority queue.
   */
  it('ranks the container-less group by risk like any other', () => {
    const result = groupProposalsByInvestigation({
      groups: [bucket('contain', [containB]), bucket('investigate', [openInvestigationA])],
      riskScoreByDiscovery: new Map([
        [ALERT_A, 91],
        [ALERT_B, 12],
      ]),
    });

    expect(keysOf(result)).toEqual([NO_INVESTIGATION_GROUP_KEY, ALERT_B]);
  });

  it('orders a group’s own proposals by the incident-response phase', () => {
    const result = groupProposalsByInvestigation({
      groups: [bucket('tune', [tuneA]), bucket('contain', [containA])],
    });

    expect(sourceIdsOf(result[0].proposals)).toEqual(['contain-a', 'tune-a']);
  });

  it('reaches the same grouping from either payload order', () => {
    const groups = [bucket('contain', [containA, containB]), bucket('tune', [tuneA])];

    const forwards = groupProposalsByInvestigation({ groups });
    const backwards = groupProposalsByInvestigation({ groups: [...groups].reverse() });

    expect(keysOf(forwards)).toEqual(keysOf(backwards));
  });

  /** The contract is one bucket per action; losing rows from an approval queue must not be silent. */
  it('keeps every row of an action the response split across two buckets', () => {
    const result = groupProposalsByInvestigation({
      groups: [bucket('contain', [containA]), bucket('contain', [containB])],
    });

    expect(result.flatMap(({ proposals }) => sourceIdsOf(proposals)).sort()).toEqual([
      'contain-a',
      'contain-b',
    ]);
  });

  it('groups nothing into nothing', () => {
    expect(groupProposalsByInvestigation({ groups: [] })).toEqual([]);
  });

  it('draws no group for a bucket the response sent empty', () => {
    expect(groupProposalsByInvestigation({ groups: [bucket('contain', [])] })).toEqual([]);
  });

  it('never draws an empty group, because a group exists only because it has rows', () => {
    const result = groupProposalsByInvestigation({
      groups: [
        bucket('contain', [containA, containB]),
        bucket('investigate', [openInvestigationA]),
      ],
    });

    expect(result.every(({ proposals }) => proposals.length > 0)).toBe(true);
  });
});
