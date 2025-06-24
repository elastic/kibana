/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { DeleteConversationParams, deleteConversation } from './delete_conversation';
import { getConversation } from './get_conversation';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { getConversationResponseMock } from '../../__mocks__/response';

jest.mock('./get_conversation', () => ({
  getConversation: jest.fn(),
}));

export const getDeleteConversationOptionsMock = (): DeleteConversationParams => ({
  esClient: elasticsearchClientMock.createScopedClusterClient().asCurrentUser,
  id: 'test',
  conversationIndex: '.kibana-elastic-ai-assistant-conversations',
  logger: loggingSystemMock.createLogger(),
});

describe('deleteConversation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('Delete returns a null if the conversation is also null', async () => {
    (getConversation as unknown as jest.Mock).mockResolvedValueOnce(null);
    const options = getDeleteConversationOptionsMock();
    const deletedConversation = await deleteConversation(options);
    expect(deletedConversation).toEqual(undefined);
  });

  test('Delete returns the conversation id if a conversation is returned from getConversation', async () => {
    const conversation = getConversationResponseMock();
    (getConversation as unknown as jest.Mock).mockResolvedValueOnce(conversation);
    const options = getDeleteConversationOptionsMock();
    options.esClient.deleteByQuery = jest.fn().mockResolvedValue({ deleted: 1 });
    const deletedConversations = await deleteConversation(options);
    expect(deletedConversations).toEqual(1);
  });

  test('Delete does not call data client if the conversation returns null', async () => {
    (getConversation as unknown as jest.Mock).mockResolvedValueOnce(null);
    const options = getDeleteConversationOptionsMock();
    await deleteConversation(options);
    expect(options.esClient.delete).not.toHaveBeenCalled();
  });

  test('throw error if no conversation was deleted', async () => {
    const conversation = getConversationResponseMock();
    (getConversation as unknown as jest.Mock).mockResolvedValueOnce(conversation);
    const options = getDeleteConversationOptionsMock();
    options.esClient.deleteByQuery = jest.fn().mockResolvedValue({ deleted: 0 });

    await expect(deleteConversation(options)).rejects.toThrow('No conversation has been deleted');
  });
});
