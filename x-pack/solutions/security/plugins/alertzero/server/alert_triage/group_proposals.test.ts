/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProposalConflictError } from '@kbn/proposals-plugin/server';
import {
  GROUPED_PROPOSAL_JOIN_CONCURRENCY,
  GROUPED_PROPOSAL_JOIN_MARGIN_MS,
  GROUPED_PROPOSAL_LIST_HEADS_TERMS,
  GROUPED_PROPOSAL_MAX_ALERTS,
  GROUPED_PROPOSAL_MAX_GENERATIONS,
  GROUPED_PROPOSAL_MAX_REVISIONS,
} from './constants';
import {
  generationIds,
  groupFpCandidates,
  HeadsTruncatedError,
  isJoinableHead,
  type GroupingDeps,
  type GroupingHead,
} from './group_proposals';

const SPACE = 'default';
const NOW = Date.parse('2026-10-26T12:00:00Z');
const HOUR = 60 * 60 * 1000;
const [GEN0, GEN1] = generationIds(SPACE, 'key-a');

const head = (overrides: Partial<GroupingHead> = {}): GroupingHead => ({
  proposalId: GEN0,
  rootProposalId: GEN0,
  revision: 1,
  status: 'pending',
  expiresAt: new Date(NOW + 60 * HOUR).toISOString(),
  conversationId: 'conv-owner',
  alertIds: ['old-1'],
  ...overrides,
});

const ids = (count: number, prefix = 'alert') =>
  Array.from({ length: count }, (_, i) => `${prefix}-${i}`);

const setup = (heads: GroupingHead[] = [], overrides: Partial<GroupingDeps> = {}) => {
  let next = 0;
  const deps = {
    listHeads: jest.fn().mockResolvedValue(heads),
    canJoin: jest.fn().mockResolvedValue(true),
    revise: jest.fn().mockResolvedValue({ proposalId: 'revision-id', revision: 2 }),
    newId: jest.fn(() => `random-${next++}`),
    onError: jest.fn(),
    ...overrides,
  } as jest.Mocked<GroupingDeps>;
  const run = (keys: Array<{ keyHash: string; alertIds: string[] }>, pool = false) =>
    groupFpCandidates({ keys, spaceId: SPACE, now: NOW, pool, deps });
  return { deps, run };
};

describe('isJoinableHead', () => {
  it('takes a pending head with room and time', () => {
    expect(isJoinableHead(head(), 1, NOW)).toBe(true);
  });

  it('refuses a head within the margin of its deadline, so a late alert keeps its review time', () => {
    const expiresAt = (offset: number) => new Date(NOW + offset).toISOString();
    expect(
      isJoinableHead(head({ expiresAt: expiresAt(GROUPED_PROPOSAL_JOIN_MARGIN_MS - HOUR) }), 1, NOW)
    ).toBe(false);
    expect(
      isJoinableHead(head({ expiresAt: expiresAt(GROUPED_PROPOSAL_JOIN_MARGIN_MS + HOUR) }), 1, NOW)
    ).toBe(true);
  });

  it.each([
    ['decided', { decision: 'approved' }],
    ['settled', { status: 'succeeded' }],
    ['failed before', { previousExecutionError: 'close failed' }],
    ['at the revision budget', { revision: GROUPED_PROPOSAL_MAX_REVISIONS }],
  ])('refuses a head that is %s', (_, overrides) => {
    expect(isJoinableHead(head(overrides), 1, NOW)).toBe(false);
  });

  it('refuses the alert that would pass the cap, and takes the one that reaches it', () => {
    const full = head({ alertIds: ids(GROUPED_PROPOSAL_MAX_ALERTS - 1) });
    expect(isJoinableHead(full, 1, NOW)).toBe(true);
    expect(isJoinableHead(full, 2, NOW)).toBe(false);
  });
});

describe('groupFpCandidates', () => {
  it('reads the heads of every key in one search when they fit one terms clause', async () => {
    const { deps, run } = setup();
    await run([
      { keyHash: 'key-a', alertIds: ['a1', 'a2'] },
      { keyHash: 'key-b', alertIds: ['b1', 'b2'] },
    ]);
    expect(deps.listHeads).toHaveBeenCalledTimes(1);
    expect(deps.listHeads.mock.calls[0][0]).toHaveLength(2 * GROUPED_PROPOSAL_MAX_GENERATIONS);
  });

  it("partitions the head lookup so one terms query stays under Elasticsearch's clause limit", async () => {
    const keysNeeded =
      Math.floor(GROUPED_PROPOSAL_LIST_HEADS_TERMS / GROUPED_PROPOSAL_MAX_GENERATIONS) + 1;
    const { deps, run } = setup();
    await run(
      Array.from({ length: keysNeeded }, (_, i) => ({ keyHash: `key-${i}`, alertIds: [`a${i}`] }))
    );
    expect(deps.listHeads.mock.calls.length).toBe(2);
    expect(deps.listHeads.mock.calls[0][0]).toHaveLength(GROUPED_PROPOSAL_LIST_HEADS_TERMS);
    expect(deps.listHeads.mock.calls[1][0]).toHaveLength(
      keysNeeded * GROUPED_PROPOSAL_MAX_GENERATIONS - GROUPED_PROPOSAL_LIST_HEADS_TERMS
    );
  });

  it('starts generation 0 for a key nothing is open for', async () => {
    const { run } = setup();
    const plan = await run([{ keyHash: 'key-a', alertIds: ['a1', 'a2'] }]);
    expect(plan).toEqual({
      mints: [{ proposalId: GEN0, alertIds: ['a1', 'a2'], kind: 'keyed' }],
      joins: [],
    });
  });

  it('joins the open proposal of the key and adds only the alerts it lacks', async () => {
    const { deps, run } = setup([head({ alertIds: ['a1'] })]);
    const plan = await run([{ keyHash: 'key-a', alertIds: ['a1', 'a2'] }]);
    expect(deps.revise).toHaveBeenCalledWith(expect.objectContaining({ proposalId: GEN0 }), [
      'a1',
      'a2',
    ]);
    expect(plan.mints).toEqual([]);
    expect(plan.joins).toEqual([
      {
        rootProposalId: GEN0,
        proposalId: 'revision-id',
        revision: 2,
        conversationId: 'conv-owner',
        alertIds: ['a2'],
      },
    ]);
  });

  it('does not reuse generation 0 once it has settled', async () => {
    const { run } = setup([head({ status: 'expired' })]);
    const plan = await run([{ keyHash: 'key-a', alertIds: ['a1', 'a2'] }]);
    expect(plan.mints).toEqual([{ proposalId: GEN1, alertIds: ['a1', 'a2'], kind: 'keyed' }]);
  });

  it('skips a full generation 0 and joins the open generation 1', async () => {
    const { run } = setup([
      head({ alertIds: ids(GROUPED_PROPOSAL_MAX_ALERTS) }),
      head({ proposalId: GEN1, rootProposalId: GEN1, conversationId: 'conv-1' }),
    ]);
    const plan = await run([{ keyHash: 'key-a', alertIds: ['a1', 'a2'] }]);
    expect(plan.joins.map(({ rootProposalId }) => rootProposalId)).toEqual([GEN1]);
  });

  it('starts the next generation when the 1,001st alert would not fit', async () => {
    const { run } = setup([head({ alertIds: ids(GROUPED_PROPOSAL_MAX_ALERTS) })]);
    const plan = await run([{ keyHash: 'key-a', alertIds: ['a1', 'a2'] }]);
    expect(plan.mints).toEqual([{ proposalId: GEN1, alertIds: ['a1', 'a2'], kind: 'keyed' }]);
  });

  it('starts the next generation after the 20th revision', async () => {
    const { run } = setup([head({ revision: GROUPED_PROPOSAL_MAX_REVISIONS })]);
    const plan = await run([{ keyHash: 'key-a', alertIds: ['a1', 'a2'] }]);
    expect(plan.mints[0].proposalId).toBe(GEN1);
  });

  it('mints under a random id when every generation exists', async () => {
    const all = generationIds(SPACE, 'key-a').map((id) =>
      head({ proposalId: id, rootProposalId: id, status: 'expired' })
    );
    const { run } = setup(all);
    const plan = await run([{ keyHash: 'key-a', alertIds: ['a1', 'a2'] }]);
    expect(plan.mints).toEqual([
      { proposalId: 'random-0', alertIds: ['a1', 'a2'], kind: 'overflow' },
    ]);
  });

  it('skips a head whose gate is no longer waiting or whose Investigation is closed', async () => {
    const { deps, run } = setup([head()], { canJoin: jest.fn().mockResolvedValue(false) });
    const plan = await run([{ keyHash: 'key-a', alertIds: ['a1', 'a2'] }]);
    expect(deps.revise).not.toHaveBeenCalled();
    expect(plan.mints[0].proposalId).toBe(GEN1);
  });

  describe('pooling', () => {
    it('puts lone alerts that join nothing into one pooled proposal under a random id', async () => {
      const { run } = setup();
      const plan = await run(
        [
          { keyHash: 'key-a', alertIds: ['a1'] },
          { keyHash: 'key-b', alertIds: ['b1'] },
          { keyHash: 'key-c', alertIds: ['c1', 'c2'] },
        ],
        true
      );
      expect(plan.mints).toEqual([
        { proposalId: generationIds(SPACE, 'key-c')[0], alertIds: ['c1', 'c2'], kind: 'keyed' },
        { proposalId: 'random-0', alertIds: ['a1', 'b1'], kind: 'pooled' },
      ]);
    });

    it('joins a lone alert to an open proposal instead of pooling it', async () => {
      const { run } = setup([head()]);
      const plan = await run([{ keyHash: 'key-a', alertIds: ['a1'] }], true);
      expect(plan.joins).toHaveLength(1);
      expect(plan.mints).toEqual([]);
    });
  });

  describe('when the head changes under the join', () => {
    it('keeps an analyst edit made after the read, because it revises the head it read again', async () => {
      const edited = head({
        proposalId: 'analyst-revision',
        revision: 2,
        alertIds: ['old-1', 'analyst-added'],
      });
      const revise = jest
        .fn()
        .mockRejectedValueOnce(new ProposalConflictError('superseded'))
        .mockResolvedValueOnce({ proposalId: 'revision-id', revision: 3 });
      const { deps, run } = setup([head()], { revise });
      deps.listHeads.mockResolvedValueOnce([head()]).mockResolvedValueOnce([edited]);
      const plan = await run([{ keyHash: 'key-a', alertIds: ['a1', 'a2'] }]);
      expect(revise).toHaveBeenLastCalledWith(edited, ['old-1', 'analyst-added', 'a1', 'a2']);
      expect(plan.joins).toHaveLength(1);
    });

    it('mints the next generation after a second conflict and keeps the alerts', async () => {
      const revise = jest.fn().mockRejectedValue(new ProposalConflictError('superseded'));
      const { run } = setup([head()], { revise });
      const plan = await run([{ keyHash: 'key-a', alertIds: ['a1', 'a2'] }]);
      expect(revise).toHaveBeenCalledTimes(2);
      expect(plan.joins).toEqual([]);
      expect(plan.mints).toEqual([{ proposalId: GEN1, alertIds: ['a1', 'a2'], kind: 'keyed' }]);
    });

    it('mints under a random id when the revise fails for another reason', async () => {
      const revise = jest.fn().mockRejectedValue(new Error('storage down'));
      const { deps, run } = setup([head()], { revise });
      const plan = await run([{ keyHash: 'key-a', alertIds: ['a1'] }], true);
      expect(deps.onError).toHaveBeenCalledWith(expect.stringContaining('storage down'));
      expect(plan.mints).toEqual([
        { proposalId: 'random-0', alertIds: ['a1'], kind: 'failed_join' },
      ]);
    });
  });

  describe('alerts the proposal already holds', () => {
    it('revises nothing and reports no join, since there is nothing to add or to say', async () => {
      const { deps, run } = setup([head({ alertIds: ['a1', 'a2'] })]);
      const plan = await run([{ keyHash: 'key-a', alertIds: ['a1', 'a2'] }]);
      expect(deps.revise).not.toHaveBeenCalled();
      expect(plan).toEqual({ mints: [], joins: [] });
    });

    it('still refuses a head that cannot take alerts, so the alerts are not claimed by a dead proposal', async () => {
      const { run } = setup([head({ alertIds: ['a1'], status: 'expired' })]);
      const plan = await run([{ keyHash: 'key-a', alertIds: ['a1'] }]);
      expect(plan.joins).toEqual([]);
      expect(plan.mints).toHaveLength(1);
    });
  });

  describe('when the heads cannot be read in full', () => {
    it('mints every key under a random id, joins nothing and says so', async () => {
      const listHeads = jest
        .fn()
        .mockRejectedValue(new HeadsTruncatedError('matched 12, returned 10'));
      const { deps, run } = setup([head()], { listHeads });
      const plan = await run(
        [
          { keyHash: 'key-a', alertIds: ['a1', 'a2'] },
          { keyHash: 'key-b', alertIds: ['b1'] },
        ],
        true
      );
      expect(deps.onError).toHaveBeenCalledWith('matched 12, returned 10');
      expect(deps.revise).not.toHaveBeenCalled();
      expect(plan.joins).toEqual([]);
      expect(plan.mints).toEqual([
        { proposalId: 'random-0', alertIds: ['a1', 'a2'], kind: 'overflow' },
        { proposalId: 'random-1', alertIds: ['b1'], kind: 'overflow' },
      ]);
    });

    it('passes any other lookup error on', async () => {
      const { run } = setup([], { listHeads: jest.fn().mockRejectedValue(new Error('down')) });
      await expect(run([{ keyHash: 'key-a', alertIds: ['a1'] }])).rejects.toThrow('down');
    });
  });

  describe('joins of many keys', () => {
    it('run a few at a time, not all at once', async () => {
      const keys = Array.from({ length: 12 }, (_, i) => `key-${i}`);
      const heads = keys.map((key) => {
        const [root] = generationIds(SPACE, key);
        return head({ proposalId: root, rootProposalId: root });
      });
      let running = 0;
      let peak = 0;
      const revise = jest.fn(async () => {
        running += 1;
        peak = Math.max(peak, running);
        await new Promise((resolve) => setTimeout(resolve, 5));
        running -= 1;
        return { proposalId: 'revision-id', revision: 2 };
      });
      const { run } = setup(heads, { revise });

      const plan = await run(keys.map((keyHash) => ({ keyHash, alertIds: [`${keyHash}-a`] })));

      expect(plan.joins).toHaveLength(12);
      expect(peak).toBeGreaterThan(1);
      expect(peak).toBeLessThanOrEqual(GROUPED_PROPOSAL_JOIN_CONCURRENCY);
    });

    it('keep the order of the keys in the plan', async () => {
      const { run } = setup();
      const plan = await run([
        { keyHash: 'key-a', alertIds: ['a1', 'a2'] },
        { keyHash: 'key-b', alertIds: ['b1', 'b2'] },
      ]);
      expect(plan.mints.map(({ alertIds }) => alertIds[0])).toEqual(['a1', 'b1']);
    });
  });
});
