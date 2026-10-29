/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProposalConflictError } from '@kbn/proposals-plugin/server';
import {
  excludeFromProposals,
  groupExcludedAlerts,
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

  const setup = (heads: ExclusionHead[][], revise?: ExclusionDeps['revise']) => {
    const listHeads = jest.fn();
    heads.forEach((result) => listHeads.mockResolvedValueOnce(result));
    const reviseFn: jest.MockedFunction<ExclusionDeps['revise']> = jest.fn(
      revise ?? (async () => ({ proposalId: 'revision-2', revision: 2 }))
    );
    return {
      listHeads,
      revise: reviseFn,
      run: (groups = [group]) =>
        excludeFromProposals(groups, { listHeads, revise: reviseFn, onError: jest.fn() }),
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

  it('leaves the alert listed when the revise fails for another reason', async () => {
    const { run } = setup([[head()]], async () => {
      throw new Error('missing privilege');
    });

    expect(await run()).toEqual([
      expect.objectContaining({ revised: false, excludedIds: ['b'], remainingCount: 3 }),
    ]);
  });

  it('leaves the alert listed when the revise conflicts twice', async () => {
    const { run, revise } = setup([[head()], [head({ revision: 2 })]]);
    revise.mockRejectedValue(new ProposalConflictError('conflict'));

    expect(await run()).toEqual([expect.objectContaining({ revised: false, revision: 2 })]);
  });

  it('reads no heads when there is nothing excluded', async () => {
    const { run, listHeads } = setup([]);

    expect(await run([])).toEqual([]);
    expect(listHeads).not.toHaveBeenCalled();
  });
});
