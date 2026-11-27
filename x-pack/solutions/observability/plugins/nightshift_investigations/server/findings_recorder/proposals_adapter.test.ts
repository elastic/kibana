/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { ProposalConflictError, ProposalNotFoundError } from '@kbn/proposals-plugin/server';
import {
  createRecorderProposals,
  MAX_RECORDER_ACTIONS,
  MAX_RECORDER_ACTION_DESCRIPTION_LENGTH,
  MAX_RECORDER_ACTION_SCHEMA_LENGTH,
} from './proposals_adapter';

const request = httpServerMock.createKibanaRequest();

const pendingRollback = {
  id: 'p-pending',
  title: 'Roll back the image',
  comment: 'Roll back to git-8c16.',
  status: 'pending',
  impact: 'medium',
  confidence: 'high',
};
const appliedSecrets = {
  id: 'p-applied',
  title: 'Restore the secrets',
  comment: 'Re-create the four secret ids.',
  status: 'no_action',
  decision: 'approved',
  impact: 'low',
  confidence: 'medium',
};

const setup = ({
  canRead = true,
  canManage = true,
  createProposal = jest.fn().mockResolvedValue({ workflowExecutionId: 'e1' }),
} = {}) => {
  // Newest first, as `order: 'newest'` returns them. The unfiltered page also holds the pending one.
  const list = jest.fn(async ({ status }: { status?: string }) =>
    status === 'pending'
      ? { proposals: [pendingRollback], total: 1 }
      : { proposals: [pendingRollback, appliedSecrets], total: 2 }
  );
  const revise = jest.fn().mockResolvedValue({ proposalId: 'p-rev-2', revision: 2 });
  const listActions = jest.fn().mockResolvedValue({
    actions: Array.from({ length: 25 }, (_, i) => ({
      workflowId: `wf-${i}`,
      name: `wf-${i}`,
      approvalPolicy: 'always-gate',
    })),
    total: 25,
  });
  const assertCanRead = jest.fn(async () => {
    if (!canRead) throw new Error('Forbidden');
  });
  const assertCanManage = jest.fn(async () => {
    if (!canManage) throw new Error('Forbidden');
  });
  const adapter = createRecorderProposals({
    proposals: {
      getProposalsService: () => ({ list, revise }),
      getProposalPrivileges: () => ({ assertCanRead, assertCanManage }),
      createProposal,
      listActions,
    } as never,
    getSpaceId: () => 'space-a',
  });
  return { adapter, list, revise, createProposal, assertCanRead, assertCanManage, listActions };
};

describe('createRecorderProposals', () => {
  it("lists the conversation's pending proposals, then its closed ones, oldest first", async () => {
    const { adapter, list } = setup();

    await expect(adapter.list({ request, conversationId: 'c1' })).resolves.toEqual([
      pendingRollback,
      appliedSecrets,
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

  it('reads the pending proposals on their own, so closed ones cannot push an old one out', async () => {
    const { adapter, list } = setup();
    const closed = Array.from({ length: 50 }, (_, i) => ({
      ...appliedSecrets,
      id: `p-closed-${i}`,
      title: `Closed ${i}`,
    }));
    list.mockImplementation(async ({ status }: { status?: string }) =>
      status === 'pending'
        ? { proposals: [pendingRollback], total: 1 }
        : { proposals: closed, total: 51 }
    );

    const listed = await adapter.list({ request, conversationId: 'c1' });

    expect(list).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'pending' }),
      'space-a',
      request
    );
    expect(listed[0]).toEqual(pendingRollback);
    expect(listed).toHaveLength(51);
  });

  it("keeps a gated proposal's workflow, input, deadline and release mark", async () => {
    const { adapter, list } = setup();
    const gated = {
      ...pendingRollback,
      id: 'p-gated',
      actionWorkflowId: 'wf-rollback',
      actionInput: { service: 'orders' },
      expiresAt: '2026-11-24T00:00:00.000Z',
      gateReleasedAt: '2026-11-23T00:00:00.000Z',
      workflowExecutionId: 'exec-1',
    };
    list.mockResolvedValue({ proposals: [gated], total: 1 });

    const [listed] = await adapter.list({ request, conversationId: 'c1' });

    expect(listed).toEqual({
      id: 'p-gated',
      title: pendingRollback.title,
      comment: pendingRollback.comment,
      status: 'pending',
      impact: 'medium',
      confidence: 'high',
      actionWorkflowId: 'wf-rollback',
      actionInput: { service: 'orders' },
      expiresAt: '2026-11-24T00:00:00.000Z',
      gateReleasedAt: '2026-11-23T00:00:00.000Z',
    });
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

  it('revises exactly the id it was given, after checking manage privileges', async () => {
    const { adapter, assertCanManage, revise } = setup();

    await expect(
      adapter.revise({
        request,
        proposalId: 'p-shown',
        proposal: {
          supersedes: 'P1',
          title: 'Add retry/backoff and error mapping for S3 SlowDown',
          comment: 'Retry 503 SlowDown with backoff and map terminal errors.',
          impact: 'low',
          confidence: 'high',
        },
      })
    ).resolves.toBe(true);

    expect(assertCanManage).toHaveBeenCalledWith(request);
    expect(revise).toHaveBeenCalledWith(
      {
        id: 'p-shown',
        title: 'Add retry/backoff and error mapping for S3 SlowDown',
        comment: 'Retry 503 SlowDown with backoff and map terminal errors.',
        impact: 'low',
        confidence: 'high',
      },
      'space-a',
      request
    );
  });

  it("passes a workflow proposal's input, which revise() merges over the stored one", async () => {
    const { adapter, revise } = setup();

    await adapter.revise({
      request,
      proposalId: 'p-gated',
      proposal: {
        title: 'Roll back orders',
        comment: 'Roll back to git-8c16.',
        action_workflow_id: 'wf-rollback',
        action_input: { env: 'prod' },
      },
    });

    expect(revise).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'p-gated', actionInput: { env: 'prod' } }),
      'space-a',
      request
    );
  });

  it('resolves false when a person decided, revised or removed the proposal first', async () => {
    const { adapter, revise } = setup();
    const proposal = { title: 'Updated', comment: 'Updated comment.' };

    revise.mockRejectedValueOnce(new ProposalConflictError('already superseded'));
    await expect(adapter.revise({ request, proposalId: 'p-1', proposal })).resolves.toBe(false);

    revise.mockRejectedValueOnce(new ProposalNotFoundError('gone'));
    await expect(adapter.revise({ request, proposalId: 'p-1', proposal })).resolves.toBe(false);

    revise.mockRejectedValueOnce(new Error('actionInput does not satisfy action workflow'));
    await expect(adapter.revise({ request, proposalId: 'p-1', proposal })).rejects.toThrow(
      'actionInput does not satisfy action workflow'
    );
  });

  it("lists only the space's own action workflows, capped for the prompt", async () => {
    const { adapter, listActions } = setup();

    const actions = await adapter.listActions({ request });

    expect(listActions).toHaveBeenCalledWith('space-a', request, { managedFilter: 'unmanaged' });
    expect(actions).toHaveLength(MAX_RECORDER_ACTIONS);
  });

  it('leaves out action workflows that could run without a person approving them', async () => {
    const { adapter, listActions } = setup();
    listActions.mockResolvedValue({
      actions: [
        { workflowId: 'gated', name: 'gated', approvalPolicy: 'always-gate' },
        { workflowId: 'autonomous', name: 'autonomous', approvalPolicy: 'autonomy-dependent' },
      ],
      total: 2,
    });

    const actions = await adapter.listActions({ request });

    expect(actions.map(({ workflowId }) => workflowId)).toEqual(['gated']);
  });

  it('cuts a long workflow description and leaves out a workflow whose input schema is too large', async () => {
    const { adapter, listActions } = setup();
    const huge = 'x'.repeat(MAX_RECORDER_ACTION_SCHEMA_LENGTH);
    listActions.mockResolvedValue({
      actions: [
        {
          workflowId: 'wordy',
          name: 'wordy',
          approvalPolicy: 'always-gate',
          description: 'd'.repeat(MAX_RECORDER_ACTION_DESCRIPTION_LENGTH + 100),
          inputSchema: { properties: { actionInput: { type: 'object' } } },
        },
        {
          workflowId: 'huge-schema',
          name: 'huge-schema',
          approvalPolicy: 'always-gate',
          inputSchema: { properties: { actionInput: { description: huge } } },
        },
      ],
      total: 2,
    });

    const actions = await adapter.listActions({ request });

    expect(actions.map(({ workflowId }) => workflowId)).toEqual(['wordy']);
    expect(actions[0].description).toBe(`${'d'.repeat(MAX_RECORDER_ACTION_DESCRIPTION_LENGTH)}…`);
    expect(actions[0].inputSchema).toEqual({ properties: { actionInput: { type: 'object' } } });
  });

  it('proposes an action workflow through the gate, with its input and no to-do category', async () => {
    const { adapter, createProposal } = setup();

    await adapter.propose({
      request,
      conversationId: 'c1',
      proposal: {
        title: 'Open an issue',
        comment: 'File the regression.',
        action_workflow_id: 'wf-open-issue',
        action_input: { repo: 'checkout', title: 'Pool exhausted' },
      },
    });

    expect(createProposal).toHaveBeenCalledTimes(1);
    const [{ proposal }] = createProposal.mock.calls[0];
    expect(proposal).toEqual(
      expect.objectContaining({
        origin: 'nightshift',
        actionWorkflowId: 'wf-open-issue',
        actionInput: { repo: 'checkout', title: 'Pool exhausted' },
      })
    );
    expect(proposal).not.toHaveProperty('category');
    expect(proposal).not.toHaveProperty('skipDiscardReason');
  });

  it('rejects when the workflow refuses the input, without proposing a to-do instead', async () => {
    const createProposal = jest
      .fn()
      .mockRejectedValueOnce(new Error('actionInput does not satisfy action workflow'));
    const { adapter } = setup({ createProposal });

    await expect(
      adapter.propose({
        request,
        conversationId: 'c1',
        proposal: {
          title: 'Open an issue',
          comment: 'File the regression.',
          action_workflow_id: 'wf-open-issue',
          action_input: {},
        },
      })
    ).rejects.toThrow('actionInput does not satisfy action workflow');
    expect(createProposal).toHaveBeenCalledTimes(1);
  });
});
