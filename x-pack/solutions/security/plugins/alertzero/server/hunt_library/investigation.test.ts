/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createConversationAlreadyExistsError,
  createConversationNotFoundError,
} from '@kbn/agent-builder-common';
import {
  deleteEmptyCreatedInvestigation,
  deriveAutomatedInvestigationId,
  deriveManualInvestigationId,
  findOrCreateHuntInvestigation,
} from './investigation';

const ID = 'inv-1';

describe('Investigation ids', () => {
  const manual = { spaceId: 'default', definitionId: 'hunt_a', sessionId: 'session-1' };

  it('derives the same manual id for the same space, hunt and session', () => {
    expect(deriveManualInvestigationId(manual)).toBe(deriveManualInvestigationId({ ...manual }));
  });

  it.each([
    ['space', { spaceId: 'other' }],
    ['hunt definition', { definitionId: 'hunt_b' }],
    ['session', { sessionId: 'session-2' }],
  ])('derives another manual id for another %s', (_label, change) => {
    expect(deriveManualInvestigationId({ ...manual, ...change })).not.toBe(
      deriveManualInvestigationId(manual)
    );
  });

  it('derives automated ids from the space and occurrence group only', () => {
    const group = { spaceId: 'default', groupId: 'v1:abc' };

    expect(deriveAutomatedInvestigationId(group)).toBe(deriveAutomatedInvestigationId(group));
    expect(deriveAutomatedInvestigationId({ ...group, groupId: 'v1:def' })).not.toBe(
      deriveAutomatedInvestigationId(group)
    );
    expect(deriveAutomatedInvestigationId(group)).not.toBe(
      deriveManualInvestigationId({ spaceId: 'default', definitionId: 'v1', sessionId: 'abc' })
    );
  });
});

describe('findOrCreateHuntInvestigation', () => {
  it('creates a public Investigation with the chosen id and reports created', async () => {
    const conversations = { create: jest.fn().mockResolvedValue({}), get: jest.fn() };

    const result = await findOrCreateHuntInvestigation({
      conversations: conversations as never,
      investigationId: ID,
      title: 'Hunt',
    });

    expect(result).toEqual({ investigationId: ID, created: true });
    expect(conversations.create).toHaveBeenCalledWith(
      expect.objectContaining({
        id: ID,
        title: 'Hunt',
        templateId: 'investigation',
        accessControl: expect.objectContaining({ access_mode: 'public' }),
      })
    );
    expect(conversations.get).not.toHaveBeenCalled();
  });

  it('reads an existing Investigation back and reports it was not created', async () => {
    const conversations = {
      create: jest
        .fn()
        .mockRejectedValue(createConversationAlreadyExistsError({ conversationId: ID } as never)),
      get: jest.fn().mockResolvedValue({}),
    };

    const result = await findOrCreateHuntInvestigation({
      conversations: conversations as never,
      investigationId: ID,
      title: 'Hunt',
    });

    expect(result).toEqual({ investigationId: ID, created: false });
    expect(conversations.get).toHaveBeenCalledWith(ID);
  });

  it('fails when the existing Investigation cannot be read back', async () => {
    const conversations = {
      create: jest
        .fn()
        .mockRejectedValue(createConversationAlreadyExistsError({ conversationId: ID } as never)),
      get: jest.fn().mockRejectedValue(new Error('forbidden')),
    };

    await expect(
      findOrCreateHuntInvestigation({
        conversations: conversations as never,
        investigationId: ID,
        title: 'Hunt',
      })
    ).rejects.toThrow('forbidden');
  });

  it('rethrows other create failures', async () => {
    const conversations = {
      create: jest.fn().mockRejectedValue(new Error('boom')),
      get: jest.fn(),
    };

    await expect(
      findOrCreateHuntInvestigation({
        conversations: conversations as never,
        investigationId: ID,
        title: 'Hunt',
      })
    ).rejects.toThrow('boom');
  });
});

describe('deleteEmptyCreatedInvestigation', () => {
  const run = (
    conversation: unknown,
    { createdByThisRequest = true }: { createdByThisRequest?: boolean } = {}
  ) => {
    const conversations = {
      get: jest.fn().mockResolvedValue(conversation),
      delete: jest.fn().mockResolvedValue(true),
    };
    return {
      conversations,
      result: deleteEmptyCreatedInvestigation({
        conversations: conversations as never,
        investigationId: ID,
        createdByThisRequest,
      }),
    };
  };

  it('deletes an Investigation this request created that is still empty', async () => {
    const { conversations, result } = run({ rounds: [], attachments: [] });

    await expect(result).resolves.toBe('deleted');
    expect(conversations.delete).toHaveBeenCalledWith(ID);
  });

  it('ignores deleted attachments when checking for emptiness', async () => {
    const { result } = run({ rounds: [], attachments: [{ active: false }] });

    await expect(result).resolves.toBe('deleted');
  });

  it('never touches an Investigation this request did not create', async () => {
    const { conversations, result } = run(
      { rounds: [], attachments: [] },
      { createdByThisRequest: false }
    );

    await expect(result).resolves.toBe('not_created_here');
    expect(conversations.get).not.toHaveBeenCalled();
    expect(conversations.delete).not.toHaveBeenCalled();
  });

  it.each([
    ['has rounds', { rounds: [{}], attachments: [] }],
    ['has an active attachment', { rounds: [], attachments: [{ active: true }] }],
    ['has an attachment with no active flag', { rounds: [], attachments: [{}] }],
  ])('does not delete an Investigation that %s', async (_label, conversation) => {
    const { conversations, result } = run(conversation);

    await expect(result).resolves.toBe('not_empty');
    expect(conversations.delete).not.toHaveBeenCalled();
  });

  it('reports an Investigation that is already gone', async () => {
    const conversations = {
      get: jest
        .fn()
        .mockRejectedValue(createConversationNotFoundError({ conversationId: ID } as never)),
      delete: jest.fn(),
    };

    await expect(
      deleteEmptyCreatedInvestigation({
        conversations: conversations as never,
        investigationId: ID,
        createdByThisRequest: true,
      })
    ).resolves.toBe('not_found');
    expect(conversations.delete).not.toHaveBeenCalled();
  });
});
