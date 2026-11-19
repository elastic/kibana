/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { createRecorderProposals, MAX_RECORDER_ACTIONS } from './proposals_adapter';

const request = httpServerMock.createKibanaRequest();

const setup = ({
  canRead = true,
  createProposal = jest.fn().mockResolvedValue({ workflowExecutionId: 'e1' }),
} = {}) => {
  const list = jest.fn().mockResolvedValue({
    proposals: [{ title: 'Restore the secrets' }, { title: 'Roll back the image' }],
    total: 2,
  });
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
  const adapter = createRecorderProposals({
    proposals: {
      getProposalsService: () => ({ list }),
      getProposalPrivileges: () => ({ assertCanRead }),
      createProposal,
      listActions,
    } as never,
    getSpaceId: () => 'space-a',
    logger: loggerMock.create(),
  });
  return { adapter, list, createProposal, assertCanRead, listActions };
};

describe('createRecorderProposals', () => {
  it("lists the titles of the conversation's own proposals, in the request's space", async () => {
    const { adapter, list } = setup();

    await expect(adapter.listTitles({ request, conversationId: 'c1' })).resolves.toEqual([
      'Restore the secrets',
      'Roll back the image',
    ]);

    expect(list).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: 'c1',
        origin: 'nightshift',
        excludeSuperseded: true,
      }),
      'space-a',
      request
    );
  });

  it('shows no titles to a user who may not read proposals, and does not read them', async () => {
    const { adapter, list, assertCanRead } = setup({ canRead: false });

    await expect(adapter.listTitles({ request, conversationId: 'c1' })).resolves.toEqual([]);

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

  it('falls back to a to-do when the workflow refuses the input', async () => {
    const createProposal = jest
      .fn()
      .mockRejectedValueOnce(new Error('actionInput does not satisfy action workflow'))
      .mockResolvedValue({});
    const { adapter } = setup({ createProposal });

    await adapter.propose({
      request,
      conversationId: 'c1',
      proposal: {
        title: 'Open an issue',
        comment: 'File the regression.',
        action_workflow_id: 'wf-open-issue',
        action_input: {},
      },
    });

    expect(createProposal).toHaveBeenCalledTimes(2);
    const [{ proposal }] = createProposal.mock.calls[1];
    expect(proposal).toEqual({
      title: 'Open an issue',
      comment: 'File the regression.',
      origin: 'nightshift',
      category: 'todo',
      skipDiscardReason: true,
    });
  });
});
