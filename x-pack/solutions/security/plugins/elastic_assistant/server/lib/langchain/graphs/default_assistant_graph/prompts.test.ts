/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_ASSISTANT_GRAPH_PROMPT_TEMPLATE, chatPromptFactory } from './prompts';
import { AIMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { AIAssistantKnowledgeBaseDataClient } from '../../../../ai_assistant_data_clients/knowledge_base';
import type { PublicMethodsOf } from '@kbn/utility-types';
import { newContentReferencesStore } from '@kbn/elastic-assistant-common';
import { newContentReferencesStoreMock } from '@kbn/elastic-assistant-common/impl/content_references/content_references_store/__mocks__/content_references_store.mock';

jest.mock('../../../prompt', () => ({
  ...jest.requireActual('../../../prompt'),
  getPrompt: jest.fn().mockReturnValue('mocked user prompt'),
}));

describe('chatPromptFactory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  const mockKbClient = {
    getRequiredKnowledgeBaseDocumentEntries: jest.fn().mockResolvedValue([
      {
        text: 'test knowledge entry',
        id: 'test-id',
        name: 'test name',
        type: 'document',
      },
    ]),
  } as unknown as AIAssistantKnowledgeBaseDataClient;
  const mockActionsClient = {} as unknown as PublicMethodsOf<ActionsClient>;
  const mockSavedObjectsClient = {} as unknown as SavedObjectsClientContract;

  const baseInputs = {
    prompt: 'system prompt {citations_prompt} {formattedTime}',
    additionalPrompt: 'additional prompt',
    contentReferencesStore: newContentReferencesStoreMock(),
    kbClient: mockKbClient,
    conversationMessages: [
      new HumanMessage('test message'),
      new AIMessage('test response'),
      new HumanMessage('follow-up question'),
    ],
    logger: loggingSystemMock.createLogger(),
    formattedTime: '2023-10-01T00:00:00Z',
    actionsClient: mockActionsClient,
    savedObjectsClient: mockSavedObjectsClient,
    connectorId: 'test-connector-id',
    llmType: 'gemini',
  };

  it('produces correct prompt with all parameters', async () => {
    const result = await chatPromptFactory(DEFAULT_ASSISTANT_GRAPH_PROMPT_TEMPLATE, baseInputs);
    expect(result.messages).toEqual(
      expect.arrayContaining([
        new SystemMessage(`system prompt 

Annotate your answer with the provided citations. Here are some example responses with citations: 
1. \"Machine learning is increasingly used in cyber threat detection. {reference(prSit)}\" 
2. \"The alert has a risk score of 72. {reference(OdRs2)}\"

Only use the citations returned by tools

 2023-10-01T00:00:00Z

additional prompt

Knowledge History:
Citation: {reference(exampleContentReferenceId)}
test knowledge entry`),
        new HumanMessage('test message'),
        new AIMessage('test response'),
        new HumanMessage('mocked user prompt follow-up question'),
      ])
    );
  });

  it('produces correct prompt when citations are disabled', async () => {
    const result = await chatPromptFactory(DEFAULT_ASSISTANT_GRAPH_PROMPT_TEMPLATE, {
      ...baseInputs,
      contentReferencesStore: newContentReferencesStore({ disabled: true }),
    });
    expect(result.messages).toEqual(
      expect.arrayContaining([
        new SystemMessage(`system prompt  2023-10-01T00:00:00Z

additional prompt

Knowledge History:

test knowledge entry`),
        new HumanMessage('test message'),
        new AIMessage('test response'),
        new HumanMessage('mocked user prompt follow-up question'),
      ])
    );
  });

  it('produces correct prompt when there is no knowledge history', async () => {
    (mockKbClient.getRequiredKnowledgeBaseDocumentEntries as jest.Mock).mockResolvedValueOnce([]);
    const result = await chatPromptFactory(DEFAULT_ASSISTANT_GRAPH_PROMPT_TEMPLATE, baseInputs);
    expect(result.messages).toEqual(
      expect.arrayContaining([
        new SystemMessage(`system prompt 

Annotate your answer with the provided citations. Here are some example responses with citations: 
1. \"Machine learning is increasingly used in cyber threat detection. {reference(prSit)}\" 
2. \"The alert has a risk score of 72. {reference(OdRs2)}\"

Only use the citations returned by tools

 2023-10-01T00:00:00Z

additional prompt

[No existing knowledge history]`),
        new HumanMessage('test message'),
        new AIMessage('test response'),
        new HumanMessage('mocked user prompt follow-up question'),
      ])
    );
  });

  it('produces correct prompt when there is no user prompt', async () => {
    const result = await chatPromptFactory(DEFAULT_ASSISTANT_GRAPH_PROMPT_TEMPLATE, {
      ...baseInputs,
      llmType: undefined,
      connectorId: 'test-connector-id',
    });
    expect(result.messages).toEqual(
      expect.arrayContaining([
        new SystemMessage(`system prompt 

Annotate your answer with the provided citations. Here are some example responses with citations: 
1. \"Machine learning is increasingly used in cyber threat detection. {reference(prSit)}\" 
2. \"The alert has a risk score of 72. {reference(OdRs2)}\"

Only use the citations returned by tools

 2023-10-01T00:00:00Z

additional prompt

Knowledge History:
Citation: {reference(exampleContentReferenceId)}
test knowledge entry`),
        new HumanMessage('test message'),
        new AIMessage('test response'),
        new HumanMessage('follow-up question'),
      ])
    );
  });
});
