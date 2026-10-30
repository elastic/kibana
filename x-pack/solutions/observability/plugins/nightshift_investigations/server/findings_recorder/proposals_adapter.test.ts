/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { createRecorderProposals } from './proposals_adapter';

const request = httpServerMock.createKibanaRequest();

const setup = ({ canRead = true } = {}) => {
  const list = jest.fn().mockResolvedValue({
    proposals: [{ title: 'Restore the secrets' }, { title: 'Roll back the image' }],
    total: 2,
  });
  const createProposal = jest.fn().mockResolvedValue({ workflowExecutionId: 'e1' });
  const assertCanRead = jest.fn(async () => {
    if (!canRead) throw new Error('Forbidden');
  });
  const adapter = createRecorderProposals({
    proposals: {
      getProposalsService: () => ({ list }),
      getProposalPrivileges: () => ({ assertCanRead }),
      createProposal,
    } as never,
    getSpaceId: () => 'space-a',
  });
  return { adapter, list, createProposal, assertCanRead };
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

  it('proposes as nightshift, in the todo category the analyst marks applied', async () => {
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
      },
    });
  });
});
