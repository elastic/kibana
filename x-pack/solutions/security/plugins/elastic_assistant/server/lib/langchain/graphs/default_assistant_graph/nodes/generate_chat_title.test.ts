/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FakeListChatModel } from '@langchain/core/utils/testing';
import { HumanMessage } from '@langchain/core/messages';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { analyticsServiceMock } from '@kbn/core-analytics-server-mocks';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { newContentReferencesStoreMock } from '@kbn/elastic-assistant-common/impl/content_references/content_references_store/__mocks__/content_references_store.mock';
import { generateChatTitle } from './generate_chat_title';
import type { GenerateChatTitleParams } from './generate_chat_title';
import { NEW_CHAT } from '../../../../../routes/helpers';
import { conversationsDataClientMock } from '../../../../../__mocks__/data_clients.mock';
import { getConversationMock } from '../../../../../__mocks__/conversations_schema.mock';
import type { AIAssistantConversationsDataClient } from '../../../../../ai_assistant_data_clients/conversations';
import { getPrompt } from '../../../../prompt';

jest.mock('../../../../prompt', () => ({
  ...jest.requireActual('../../../../prompt'),
  getPrompt: jest.fn(),
}));

describe('generateChatTitle', () => {
  const conversationsDataClient = conversationsDataClientMock.create();

  const getParams = (model: FakeListChatModel): GenerateChatTitleParams => ({
    getInferenceConnectorById: jest.fn(),
    contentReferencesStore: newContentReferencesStoreMock(),
    logger: loggingSystemMock.createLogger(),
    savedObjectsClient: savedObjectsClientMock.create(),
    conversationsDataClient:
      conversationsDataClient as unknown as AIAssistantConversationsDataClient,
    telemetry: analyticsServiceMock.createAnalyticsServiceSetup(),
    state: {
      connectorId: 'connector-1',
      conversationId: 'conversation-1',
      llmType: 'openai',
      responseLanguage: 'English',
      isStream: false,
    },
    newMessages: [new HumanMessage('Hello')],
    model,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (getPrompt as jest.Mock).mockResolvedValue('Generate a title for this conversation.');
    conversationsDataClient.getConversation.mockResolvedValue(
      getConversationMock({ id: 'conversation-1', title: NEW_CHAT })
    );
  });

  it('writes the generated title only if the conversation is still untitled at write time', async () => {
    await generateChatTitle(getParams(new FakeListChatModel({ responses: ['Generated title'] })));

    expect(conversationsDataClient.updateConversationTitleIfUnset).toHaveBeenCalledWith({
      id: 'conversation-1',
      title: 'Generated title',
      placeholderTitle: NEW_CHAT,
    });
    expect(conversationsDataClient.updateConversation).not.toHaveBeenCalled();
  });

  it('writes the error title only if the conversation is still untitled at write time', async () => {
    const model = new FakeListChatModel({ responses: ['Generated title'] });
    jest.spyOn(model, '_generate').mockRejectedValue(new Error('socket hang up'));

    await generateChatTitle(getParams(model));

    expect(conversationsDataClient.updateConversationTitleIfUnset).toHaveBeenCalledWith({
      id: 'conversation-1',
      title: 'Error',
      placeholderTitle: NEW_CHAT,
    });
    expect(conversationsDataClient.updateConversation).not.toHaveBeenCalled();
  });

  it('does not generate a title for a conversation the user has already titled', async () => {
    conversationsDataClient.getConversation.mockResolvedValue(
      getConversationMock({ id: 'conversation-1', title: 'Lucky title' })
    );
    const model = new FakeListChatModel({ responses: ['Generated title'] });
    const generateSpy = jest.spyOn(model, '_generate');

    await generateChatTitle(getParams(model));

    expect(generateSpy).not.toHaveBeenCalled();
    expect(conversationsDataClient.updateConversationTitleIfUnset).not.toHaveBeenCalled();
    expect(conversationsDataClient.updateConversation).not.toHaveBeenCalled();
  });
});
