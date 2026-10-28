/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GROUPED_PROPOSAL_MAX_ALERTS, GROUPED_PROPOSAL_MAX_REVISIONS } from './constants';
import { groupFpCandidates, type GroupingHead } from './group_proposals';
import {
  REPLAY_PARITY_SCENARIOS,
  type ReplayParityScenario,
} from './grouping_replay_parity_fixture';
import { hashKey } from './key_tags';
import { buildPatternKeys } from './pattern_key';

const SPACE = 'default';
const HOUR_MS = 60 * 60 * 1000;
const OPEN_HOURS = 72;
const START = Date.parse('2026-10-01T00:00:00Z');

/**
 * The batches of a scenario, run through the planner over an in-memory proposal store: a proposal
 * is created for each mint, open for 72 hours, and every join is a revise of its head.
 */
const replay = async ({ docs, batches }: ReplayParityScenario) => {
  const heads = new Map<string, GroupingHead>();
  const created: Array<{ root: string; hours: number }> = [];
  let joined = 0;
  let ids = 0;

  for (const { hours, ids: alertIds } of batches) {
    const now = START + hours * HOUR_MS;
    const groups = new Map<string, string[]>();
    for (const id of alertIds) {
      const keyHash = hashKey(SPACE, buildPatternKeys(docs[id]).wide);
      groups.set(keyHash, [...(groups.get(keyHash) ?? []), id]);
    }
    const plan = await groupFpCandidates({
      keys: [...groups].map(([keyHash, members]) => ({ keyHash, alertIds: members })),
      spaceId: SPACE,
      now,
      pool: true,
      deps: {
        listHeads: async (rootIds) =>
          [...heads.values()].filter(({ rootProposalId }) => rootIds.includes(rootProposalId)),
        canJoin: async () => true,
        revise: async (head, union) => {
          const revision = head.revision + 1;
          heads.set(head.rootProposalId, { ...head, revision, alertIds: union });
          return { proposalId: head.proposalId, revision };
        },
        newId: () => `random-${(ids += 1)}`,
      },
    });
    joined += plan.joins.reduce((sum, { alertIds: added }) => sum + added.length, 0);
    for (const { proposalId, alertIds: members } of plan.mints) {
      heads.set(proposalId, {
        proposalId,
        rootProposalId: proposalId,
        revision: 1,
        status: 'pending',
        expiresAt: new Date(now + OPEN_HOURS * HOUR_MS).toISOString(),
        conversationId: `conv-${proposalId}`,
        alertIds: members,
      });
      created.push({ root: proposalId, hours });
    }
  }

  return {
    joined,
    proposals: created.map(({ root, hours }) => ({
      hours,
      size: heads.get(root)?.alertIds.length ?? 0,
      revisions: heads.get(root)?.revision ?? 0,
    })),
  };
};

// The fixture holds the output of an offline replay (see the fixture header). The planner has
// to make the proposals the investigation's numbers were computed with, so the replay's prediction
// (-81% proposals) is what this code does on the same batches. The scenarios' parameters are the
// ones the plan ships, and the constants below fail the test if either side changes them alone.
describe('the grouping planner matches the offline replay', () => {
  it('uses the caps the fixture was generated with', () => {
    expect(GROUPED_PROPOSAL_MAX_ALERTS).toBe(1000);
    expect(GROUPED_PROPOSAL_MAX_REVISIONS).toBe(20);
  });

  it.each(REPLAY_PARITY_SCENARIOS.map((scenario) => [scenario.name, scenario] as const))(
    '%s',
    async (_name, scenario) => {
      expect(await replay(scenario)).toEqual(scenario.expected);
    }
  );
});
