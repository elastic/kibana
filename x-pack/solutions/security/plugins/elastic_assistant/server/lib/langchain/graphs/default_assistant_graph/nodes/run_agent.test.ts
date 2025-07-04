/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { runAgent, RunAgentParams } from './run_agent';
import { actionsClientMock } from '@kbn/actions-plugin/server/mocks';
import { AgentState } from '../types';
import { loggerMock } from '@kbn/logging-mocks';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { AIMessage } from '@langchain/core/messages';
import { INCLUDE_CITATIONS } from '../../../../prompt/prompts';
import { newContentReferencesStoreMock } from '@kbn/elastic-assistant-common/impl/content_references/content_references_store/__mocks__/content_references_store.mock';

jest.mock('../../../../prompt', () => ({
  getPrompt: jest.fn(),
  promptDictionary: {},
}));

const agentState = {
  messages: [new AIMessage({ content: 'This message contains a reference {reference(1234)}' })],
  formattedTime: 'mockFormattedTime',
} as unknown as AgentState;

const invokeMock = jest.fn().mockResolvedValue({});

const testParams = {
  actionsClient: actionsClientMock.create(),
  logger: loggerMock.create(),
  savedObjectsClient: savedObjectsClientMock.create(),
  state: agentState,
  agentRunnable: {
    withConfig: jest.fn().mockReturnValue({
      invoke: invokeMock,
    }),
  },
  config: undefined,
  kbDataClient: {
    getRequiredKnowledgeBaseDocumentEntries: jest
      .fn()
      .mockResolvedValue([{ text: 'foobar', id: 1234 }]),
  },
  contentReferencesStore: newContentReferencesStoreMock(),
} as unknown as RunAgentParams;

describe('runAgent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('invoked with formattedTime placeholder', async () => {
    await runAgent(testParams);
    expect(invokeMock).toHaveBeenCalledTimes(1);
    expect(invokeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        formattedTime: 'mockFormattedTime',
      }),
      undefined
    );
  });

  it('invoked with knowledgeHistory', async () => {
    await runAgent(testParams);
    expect(invokeMock).toHaveBeenCalledTimes(1);
    expect(invokeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        knowledge_history:
          'Knowledge History:\n["Citation: {reference(exampleContentReferenceId)}\\nfoobar"]',
      }),
      undefined
    );
  });

  it('invoked with knowledgeHistory placeholder', async () => {
    await runAgent({
      ...testParams,
      kbDataClient: {
        getRequiredKnowledgeBaseDocumentEntries: jest.fn().mockResolvedValue([]),
      },
    } as unknown as RunAgentParams);
    expect(invokeMock).toHaveBeenCalledTimes(1);
    expect(invokeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        knowledge_history: 'Knowledge History:\n[No existing knowledge history]',
      }),
      undefined
    );
  });

  it('invoked with sanitized chat history', async () => {
    await runAgent(testParams);
    expect(invokeMock).toHaveBeenCalledTimes(1);
    expect(invokeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        chat_history: expect.arrayContaining([
          expect.objectContaining({
            content: 'This message contains a reference',
          }),
        ]),
      }),
      undefined
    );
  });

  it('invoked with citations prompt', async () => {
    await runAgent(testParams);
    expect(invokeMock).toHaveBeenCalledTimes(1);
    expect(invokeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        citations_prompt: INCLUDE_CITATIONS,
      }),
      undefined
    );
  });

  it('invoked without citations prompt', async () => {
    await runAgent({
      ...testParams,
      contentReferencesStore: newContentReferencesStoreMock({ disabled: true }),
    });
    expect(invokeMock).toHaveBeenCalledTimes(1);
    expect(invokeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        citations_prompt: '',
      }),
      undefined
    );
  });
});
