/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { ProposalConflictError, ProposalNotFoundError } from '@kbn/proposals-plugin/server';
import { createRecorderProposals } from './proposals_adapter';

const request = httpServerMock.createKibanaRequest();

const setup = ({ canRead = true, canManage = true } = {}) => {
  const list = jest.fn().mockResolvedValue({
    // Returned newest-first (`order: 'newest'`); adapter flips to oldest-first.
    proposals: [
      {
        id: 'p-newer',
        title: 'Roll back the image',
        comment: 'Roll back to git-8c16.',
        status: 'pending',
        impact: 'medium',
        confidence: 'high',
      },
      {
        id: 'p-older',
        title: 'Restore the secrets',
        comment: 'Re-create the four secret ids.',
        status: 'no_action',
        decision: 'approved',
        impact: 'low',
        confidence: 'medium',
      },
    ],
    total: 2,
  });
  const getLatestRevision = jest.fn().mockResolvedValue({
    proposalId: 'p-live',
    revision: 2,
    status: 'pending',
    decision: undefined,
    actionInput: undefined,
  });
  const revise = jest.fn().mockResolvedValue({ proposalId: 'p-rev-3', revision: 3 });
  const createProposal = jest.fn().mockResolvedValue({ workflowExecutionId: 'e1' });
  const assertCanRead = jest.fn(async () => {
    if (!canRead) throw new Error('Forbidden');
  });
  const assertCanManage = jest.fn(async () => {
    if (!canManage) throw new Error('Forbidden');
  });
  const adapter = createRecorderProposals({
    proposals: {
      getProposalsService: () => ({ list, getLatestRevision, revise }),
      getProposalPrivileges: () => ({ assertCanRead, assertCanManage }),
      createProposal,
    } as never,
    getSpaceId: () => 'space-a',
  });
  return {
    adapter,
    list,
    getLatestRevision,
    revise,
    createProposal,
    assertCanRead,
    assertCanManage,
  };
};

describe('createRecorderProposals', () => {
  it("lists the conversation's non-superseded proposals oldest-first in the request's space", async () => {
    const { adapter, list } = setup();

    await expect(adapter.list({ request, conversationId: 'c1' })).resolves.toEqual([
      {
        id: 'p-older',
        title: 'Restore the secrets',
        comment: 'Re-create the four secret ids.',
        status: 'no_action',
        decision: 'approved',
        impact: 'low',
        confidence: 'medium',
      },
      {
        id: 'p-newer',
        title: 'Roll back the image',
        comment: 'Roll back to git-8c16.',
        status: 'pending',
        impact: 'medium',
        confidence: 'high',
      },
    ]);

    expect(list).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: 'c1',
        origin: 'nightshift',
        excludeSuperseded: true,
        order: 'newest',
      }),
      'space-a',
      request
    );
  });

  it('shows no proposals to a user who may not read proposals, and does not read them', async () => {
    const { adapter, list, assertCanRead } = setup({ canRead: false });

    await expect(adapter.list({ request, conversationId: 'c1' })).resolves.toEqual([]);

    expect(assertCanRead).toHaveBeenCalledWith(request);
    expect(list).not.toHaveBeenCalled();
  });

  it('proposes as nightshift, in the todo category the analyst marks applied, waiving the discard reason', async () => {
    const { adapter, createProposal } = setup();

    await adapter.propose({
      request,
      conversationId: 'c1',
      proposal: { title: 'Roll back', comment: 'Roll back to git-8c16', impact: 'low' },
    });

    expect(createProposal).toHaveBeenCalledWith({
      request,
      spaceId: 'space-a',
      conversationId: 'c1',
      proposal: {
        title: 'Roll back',
        comment: 'Roll back to git-8c16',
        impact: 'low',
        origin: 'nightshift',
        category: 'todo',
        skipDiscardReason: true,
      },
    });
  });

  it('revises the live head of a proposal chain after checking manage privileges', async () => {
    const { adapter, assertCanManage, getLatestRevision, revise } = setup();

    await adapter.revise({
      request,
      proposalId: 'p-root',
      proposal: {
        title: 'Add retry/backoff and error mapping for S3 SlowDown',
        comment: 'Retry 503 SlowDown with backoff and map terminal errors.',
        impact: 'low',
        confidence: 'high',
      },
    });

    expect(assertCanManage).toHaveBeenCalledWith(request);
    expect(getLatestRevision).toHaveBeenCalledWith('p-root', 'space-a');
    expect(revise).toHaveBeenCalledWith(
      {
        id: 'p-live',
        title: 'Add retry/backoff and error mapping for S3 SlowDown',
        comment: 'Retry 503 SlowDown with backoff and map terminal errors.',
        impact: 'low',
        confidence: 'high',
      },
      'space-a',
      request
    );
  });

  it('treats a concurrent human decision or missing proposal as a no-op during revise', async () => {
    const { adapter, revise } = setup();
    revise.mockRejectedValueOnce(new ProposalConflictError('already decided'));
    await expect(
      adapter.revise({
        request,
        proposalId: 'p-root',
        proposal: { title: 'Updated', comment: 'Updated comment.' },
      })
    ).resolves.toBeUndefined();

    revise.mockRejectedValueOnce(new ProposalNotFoundError('gone'));
    await expect(
      adapter.revise({
        request,
        proposalId: 'p-root',
        proposal: { title: 'Updated', comment: 'Updated comment.' },
      })
    ).resolves.toBeUndefined();
  });
});
