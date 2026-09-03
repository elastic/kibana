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

import { comparePendingProposals } from '.';

const createProposal = ({
  correlationId = 'alert-1',
  createdAt = '2026-08-18T12:00:00.000Z',
  recommendedAction = 'contain',
  sourceId,
}: {
  correlationId?: string;
  createdAt?: string;
  recommendedAction?: RecommendedAction;
  sourceId: string;
}): PndProposalRow => ({
  alwaysGate: false,
  correlationId,
  createdAt,
  gateId: PND_GATE_IDS.incidentContained,
  inputSchema: {},
  message: `Gate message for ${sourceId}`,
  reasoning: `Reasoning for ${sourceId}`,
  recommendedAction,
  reversible: false,
  sourceId,
  stepExecutionId: 'step-1',
  stepId: 'await_incident_contained',
  title: `Gate message for ${sourceId}`,
  workflowId: SYSTEM_SECURITY_WATCH_FLOOR_ID,
  workflowRunId: 'run-1',
});

/** Sorts with the comparator and reports the resulting `sourceId` order. */
const order = ({
  proposals,
  riskScoreByDiscovery,
}: {
  proposals: PndProposalRow[];
  riskScoreByDiscovery?: ReadonlyMap<string, number>;
}): string[] =>
  [...proposals]
    .sort(comparePendingProposals({ riskScoreByDiscovery }))
    .map(({ sourceId }) => sourceId);

describe('comparePendingProposals', () => {
  it('leads with the riskiest discovery', () => {
    const proposals = [
      createProposal({ correlationId: 'alert-quiet', sourceId: 'quiet' }),
      createProposal({ correlationId: 'alert-loud', sourceId: 'loud' }),
    ];

    expect(
      order({
        proposals,
        riskScoreByDiscovery: new Map([
          ['alert-loud', 91],
          ['alert-quiet', 12],
        ]),
      })
    ).toEqual(['loud', 'quiet']);
  });

  /**
   * A real `0` is a measurement and an absent score is silence (D5), so a scored zero outranks a row
   * nothing could be derived for. Sorting them together would say the two are the same claim.
   */
  it('ranks a scored zero above a row with no score at all', () => {
    const proposals = [
      createProposal({ correlationId: 'alert-unscored', sourceId: 'unscored' }),
      createProposal({ correlationId: 'alert-zero', sourceId: 'zero' }),
    ];

    expect(order({ proposals, riskScoreByDiscovery: new Map([['alert-zero', 0]]) })).toEqual([
      'zero',
      'unscored',
    ]);
  });

  it('falls back to the incident-response phase order for two gates of one discovery', () => {
    const proposals = [
      createProposal({ recommendedAction: 'tune', sourceId: 'tune' }),
      createProposal({ recommendedAction: 'investigate', sourceId: 'investigate' }),
      createProposal({ recommendedAction: 'contain', sourceId: 'contain' }),
      createProposal({ recommendedAction: 'escalate', sourceId: 'escalate' }),
    ];

    expect(order({ proposals })).toEqual(['contain', 'escalate', 'investigate', 'tune']);
  });

  /** Risk is the outer key: a lower-priority phase on a riskier discovery still leads. */
  it('ranks risk above the phase', () => {
    const proposals = [
      createProposal({
        correlationId: 'alert-quiet',
        recommendedAction: 'contain',
        sourceId: 'quiet-contain',
      }),
      createProposal({
        correlationId: 'alert-loud',
        recommendedAction: 'tune',
        sourceId: 'loud-tune',
      }),
    ];

    expect(
      order({
        proposals,
        riskScoreByDiscovery: new Map([
          ['alert-loud', 91],
          ['alert-quiet', 12],
        ]),
      })
    ).toEqual(['loud-tune', 'quiet-contain']);
  });

  it('puts the gate that has been waiting longest first', () => {
    const proposals = [
      createProposal({ createdAt: '2026-08-18T15:00:00.000Z', sourceId: 'newer' }),
      createProposal({ createdAt: '2026-08-18T09:00:00.000Z', sourceId: 'older' }),
    ];

    expect(order({ proposals })).toEqual(['older', 'newer']);
  });

  /**
   * The `sourceId` tiebreaker is what makes this a *total* order, so a poll cannot reshuffle the queue
   * under the analyst's cursor: two rows that agree on every other key still have one answer.
   */
  it('orders two otherwise identical rows by their source id', () => {
    const proposals = [createProposal({ sourceId: 'b' }), createProposal({ sourceId: 'a' })];

    expect(order({ proposals })).toEqual(['a', 'b']);
  });

  it('reaches the same order from either input order', () => {
    const proposals = [
      createProposal({ correlationId: 'alert-2', sourceId: 'two' }),
      createProposal({ correlationId: 'alert-1', sourceId: 'one' }),
      createProposal({ correlationId: 'alert-3', sourceId: 'three' }),
    ];
    const riskScoreByDiscovery = new Map([
      ['alert-1', 50],
      ['alert-2', 50],
      ['alert-3', 50],
    ]);

    expect(order({ proposals, riskScoreByDiscovery })).toEqual(
      order({ proposals: [...proposals].reverse(), riskScoreByDiscovery })
    );
  });

  it('ties nothing, so every pair has an answer', () => {
    const a = createProposal({ sourceId: 'a' });
    const b = createProposal({ sourceId: 'b' });

    expect(comparePendingProposals()(a, b)).not.toBe(0);
  });

  it('compares a row with itself as equal', () => {
    const proposal = createProposal({ sourceId: 'a' });

    expect(comparePendingProposals()(proposal, proposal)).toBe(0);
  });
});
