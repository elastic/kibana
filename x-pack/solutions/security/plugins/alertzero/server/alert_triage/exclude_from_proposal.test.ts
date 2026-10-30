/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProposalConflictError, ProposalNotFoundError } from '@kbn/proposals-plugin/server';
import {
  excludeFromProposals,
  groupExcludedAlerts,
  MAX_REVISE_ATTEMPTS,
  type ExclusionDeps,
  type ExclusionHead,
} from './exclude_from_proposal';

const ROOT = 'proposal-1';

const head = (overrides: Partial<ExclusionHead> = {}): ExclusionHead => ({
  proposalId: ROOT,
  rootProposalId: ROOT,
  revision: 1,
  status: 'pending',
  conversationId: 'conv-owner',
  alertIds: ['a', 'b', 'c'],
  comment: 'Close 3 alerts',
  ...overrides,
});

const proposalTag = `az:proposal:${ROOT}`;

describe('groupExcludedAlerts', () => {
  it('excludes an alert that has another verdict tag, even with az:false_positive still on it', () => {
    expect(
      groupExcludedAlerts([
        { id: 'a', tags: ['az:false_positive', 'az:true_positive', proposalTag] },
        { id: 'b', tags: ['az:false_positive', 'az:inconclusive', proposalTag] },
        { id: 'c', tags: ['az:false_positive', proposalTag] },
      ])
    ).toEqual([{ rootProposalId: ROOT, alertIds: ['a', 'b'], truePositiveIds: ['a'] }]);
  });

  it('excludes an alert that lost az:false_positive', () => {
    expect(groupExcludedAlerts([{ id: 'a', tags: [proposalTag] }])).toEqual([
      { rootProposalId: ROOT, alertIds: ['a'], truePositiveIds: [] },
    ]);
  });

  it('ignores an alert that is in no proposal', () => {
    expect(groupExcludedAlerts([{ id: 'a', tags: ['az:true_positive'] }])).toEqual([]);
  });

  it('groups the alerts by the proposal their tag names', () => {
    const groups = groupExcludedAlerts([
      { id: 'a', tags: ['az:inconclusive', 'az:proposal:one'] },
      { id: 'b', tags: ['az:inconclusive', 'az:proposal:two'] },
      { id: 'c', tags: ['az:inconclusive', 'az:proposal:one'] },
    ]);

    expect(groups.map(({ rootProposalId, alertIds }) => [rootProposalId, alertIds])).toEqual([
      ['one', ['a', 'c']],
      ['two', ['b']],
    ]);
  });
});

describe('excludeFromProposals', () => {
  const group = { rootProposalId: ROOT, alertIds: ['b'], truePositiveIds: ['b'] };

  // Each read returns the next list; once they run out, every read returns the last one.
  const setup = (heads: ExclusionHead[][], revise?: ExclusionDeps['revise']) => {
    const listHeads = jest.fn().mockResolvedValue(heads[heads.length - 1] ?? []);
    heads.forEach((result) => listHeads.mockResolvedValueOnce(result));
    const reviseFn: jest.MockedFunction<ExclusionDeps['revise']> = jest.fn(
      revise ?? (async () => ({ proposalId: 'revision-2', revision: 2 }))
    );
    const onError = jest.fn();
    const sleep = jest.fn().mockResolvedValue(undefined);
    return {
      listHeads,
      revise: reviseFn,
      onError,
      sleep,
      run: (groups = [group]) =>
        excludeFromProposals(groups, { listHeads, revise: reviseFn, onError, sleep }),
    };
  };

  it('revises the proposal without the excluded alerts', async () => {
    const { run, revise } = setup([[head()]]);

    expect(await run()).toEqual([
      {
        rootProposalId: ROOT,
        conversationId: 'conv-owner',
        revision: 2,
        excludedIds: ['b'],
        truePositiveCount: 1,
        remainingCount: 2,
        revised: true,
      },
    ]);
    expect(revise).toHaveBeenCalledWith(expect.objectContaining({ proposalId: ROOT }), ['a', 'c'], {
      count: 1,
      truePositiveCount: 1,
    });
  });

  it('does nothing for a proposal that is no longer pending', async () => {
    const { run, revise } = setup([[head({ status: 'succeeded' })]]);

    expect(await run()).toEqual([]);
    expect(revise).not.toHaveBeenCalled();
  });

  it('does nothing for a decided proposal', async () => {
    const { run, revise } = setup([[head({ decision: 'dismissed' })]]);

    expect(await run()).toEqual([]);
    expect(revise).not.toHaveBeenCalled();
  });

  it('does nothing for a proposal that was never created', async () => {
    const { run, revise } = setup([[]]);

    expect(await run()).toEqual([]);
    expect(revise).not.toHaveBeenCalled();
  });

  // The next event of a bulk exclusion, or the event of this workflow's own re-tag.
  it('does nothing when the proposal no longer holds the alert', async () => {
    const { run, revise } = setup([[head({ alertIds: ['a', 'c'] })]]);

    expect(await run()).toEqual([]);
    expect(revise).not.toHaveBeenCalled();
  });

  it('keeps the alerts a join added when a conflict makes it read the head again', async () => {
    const { run, revise } = setup([
      [head()],
      [head({ revision: 2, alertIds: ['a', 'b', 'c', 'd'] })],
    ]);
    revise.mockRejectedValueOnce(new ProposalConflictError('joined first'));

    const [result] = await run();

    expect(revise).toHaveBeenLastCalledWith(
      expect.objectContaining({ revision: 2 }),
      ['a', 'c', 'd'],
      { count: 1, truePositiveCount: 1 }
    );
    expect(result).toEqual(expect.objectContaining({ revised: true, remainingCount: 3 }));
  });

  it('gives up when the proposal was decided while it retried', async () => {
    const { run, revise } = setup([[head()], [head({ status: 'succeeded' })]]);
    revise.mockRejectedValueOnce(new ProposalConflictError('decided'));

    expect(await run()).toEqual([]);
  });

  it('leaves the alert listed, without retrying, when the revise fails for another reason', async () => {
    const { run, revise, onError } = setup([[head()]], async () => {
      throw new Error('missing privilege');
    });

    expect(await run()).toEqual([
      expect.objectContaining({ revised: false, excludedIds: ['b'], remainingCount: 3 }),
    ]);
    expect(revise).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(expect.stringContaining('missing privilege'));
  });

  it('reports the alert as still listed when every attempt conflicts', async () => {
    const { run, revise, onError } = setup([[head()], [head({ revision: 2 })]]);
    revise.mockRejectedValue(new ProposalConflictError('conflict'));

    expect(await run()).toEqual([expect.objectContaining({ revised: false, revision: 2 })]);
    expect(revise).toHaveBeenCalledTimes(MAX_REVISE_ATTEMPTS);
    expect(onError).toHaveBeenCalledWith(expect.stringContaining('conflict'));
  });

  it('retries when the head it read was a losing writer’s revision, retired since', async () => {
    const { run, revise } = setup([[head({ proposalId: 'orphan' })], [head({ revision: 2 })]]);
    revise.mockRejectedValueOnce(new ProposalNotFoundError('orphan'));

    expect(await run()).toEqual([expect.objectContaining({ revised: true })]);
    expect(revise).toHaveBeenLastCalledWith(
      expect.objectContaining({ revision: 2 }),
      ['a', 'c'],
      expect.anything()
    );
  });

  it('reports the alert as still listed when the chain has no live revision after a conflict', async () => {
    const { run, revise, onError } = setup([[head()], []]);
    revise.mockRejectedValueOnce(new ProposalConflictError('conflict'));

    expect(await run()).toEqual([expect.objectContaining({ revised: false, excludedIds: ['b'] })]);
    expect(onError).toHaveBeenCalled();
  });

  // The proposals service's two writes, with the race between them: the new revision is created,
  // then the old one is marked superseded under its sequence number, and a loser deletes its new
  // revision again. The lookup returns the latest live revision of the chain, as
  // `getLatestRevisions()` does. Every await yields, so concurrent exclusions interleave.
  describe('with several exclusions at once', () => {
    interface Stored {
      doc: ExclusionHead & { supersededBy?: string };
      seqNo: number;
    }
    const tick = () => new Promise<void>((resolve) => setImmediate(resolve));

    const createStore = (alertIds: string[]) => {
      const docs = new Map<string, Stored>([[ROOT, { doc: head({ alertIds }), seqNo: 0 }]]);
      let nextId = 2;
      const deps: ExclusionDeps = {
        listHeads: async () => {
          await tick();
          const [latest] = [...docs.values()]
            .filter(({ doc }) => doc.supersededBy === undefined)
            .sort((left, right) => right.doc.revision - left.doc.revision);
          return latest ? [{ ...latest.doc }] : [];
        },
        revise: async (current, remaining) => {
          await tick();
          const stored = docs.get(current.proposalId);
          if (!stored) throw new ProposalNotFoundError(current.proposalId);
          if (stored.doc.supersededBy) throw new ProposalConflictError('superseded');
          const { seqNo, doc } = stored;
          const id = `revision-${nextId++}`;
          const revision = doc.revision + 1;
          docs.set(id, {
            doc: {
              ...doc,
              proposalId: id,
              revision,
              alertIds: remaining,
            },
            seqNo: 0,
          });
          await tick();
          const latest = docs.get(current.proposalId);
          if (!latest || latest.seqNo !== seqNo) {
            docs.delete(id);
            throw new ProposalConflictError('modified by another actor first');
          }
          docs.set(current.proposalId, {
            doc: { ...latest.doc, supersededBy: id },
            seqNo: seqNo + 1,
          });
          return { proposalId: id, revision };
        },
        sleep: tick,
      };
      const liveHeads = () => [...docs.values()].filter(({ doc }) => !doc.supersededBy);
      return { deps, liveHeads };
    };

    it('takes every alert out, and the chain keeps one head', async () => {
      const excluded = ['b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'];
      const { deps, liveHeads } = createStore(['a', ...excluded]);

      const results = await Promise.all(
        excluded.map((id) =>
          excludeFromProposals(
            [{ rootProposalId: ROOT, alertIds: [id], truePositiveIds: [] }],
            deps
          )
        )
      );

      expect(results.flat().map(({ revised }) => revised)).toEqual(excluded.map(() => true));
      expect(liveHeads()).toHaveLength(1);
      expect(liveHeads()[0].doc.alertIds).toEqual(['a']);
    });
  });

  it('reads no heads when there is nothing excluded', async () => {
    const { run, listHeads } = setup([]);

    expect(await run([])).toEqual([]);
    expect(listHeads).not.toHaveBeenCalled();
  });
});
