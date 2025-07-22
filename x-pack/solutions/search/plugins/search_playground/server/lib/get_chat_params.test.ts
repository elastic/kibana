/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getChatParams } from './get_chat_params';
import {
  OPENAI_CONNECTOR_ID,
  BEDROCK_CONNECTOR_ID,
  GEMINI_CONNECTOR_ID,
  INFERENCE_CONNECTOR_ID,
} from '@kbn/stack-connectors-plugin/public/common';
import { Prompt, QuestionRewritePrompt } from '../../common/prompt';
import { loggerMock, MockedLogger } from '@kbn/logging-mocks';
import { httpServerMock } from '@kbn/core/server/mocks';
import { PluginStartContract as ActionsPluginStartContract } from '@kbn/actions-plugin/server';
import { inferenceMock } from '@kbn/inference-plugin/server/mocks';
import { elasticModelIds } from '@kbn/inference-common';

jest.mock('@kbn/langchain/server', () => {
  const original = jest.requireActual('@kbn/langchain/server');
  return {
    ...original,
    ActionsClientChatOpenAI: jest.fn(),
    ActionsClientSimpleChatModel: jest.fn(),
  };
});

jest.mock('../../common/prompt', () => ({
  Prompt: jest.fn((instructions) => instructions),
  QuestionRewritePrompt: jest.fn((instructions) => instructions),
}));

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid'),
}));

describe('getChatParams', () => {
  const mockActionsClient = {
    get: jest.fn(),
  };
  const actions = {
    getActionsClientWithRequest: jest.fn(() => Promise.resolve(mockActionsClient)),
  } as unknown as ActionsPluginStartContract;

  let logger: MockedLogger;
  let request: ReturnType<typeof httpServerMock.createKibanaRequest>;
  let inference: ReturnType<typeof inferenceMock.createStartContract>;

  beforeEach(() => {
    jest.clearAllMocks();
    logger = loggerMock.create();
    request = httpServerMock.createKibanaRequest();
    inference = inferenceMock.createStartContract();
  });

  it('returns the correct chat model and prompt for OPENAI_CONNECTOR_ID', async () => {
    mockActionsClient.get.mockResolvedValue({ id: '1', actionTypeId: OPENAI_CONNECTOR_ID });

    const result = await getChatParams(
      {
        connectorId: '1',
        model: 'text-davinci-003',
        prompt: 'Hello, world!',
        citations: true,
      },
      { actions, request, logger, inference }
    );
    expect(Prompt).toHaveBeenCalledWith('Hello, world!', {
      citations: true,
      context: true,
      type: 'openai',
    });
    expect(QuestionRewritePrompt).toHaveBeenCalledWith({
      type: 'openai',
    });
    expect(inference.getChatModel).toHaveBeenCalledWith({
      request,
      connectorId: '1',
      chatModelOptions: expect.objectContaining({
        model: 'text-davinci-003',
        maxRetries: 0,
      }),
    });
    expect(result.chatPrompt).toContain('Hello, world!');
  });

  it('returns the correct chat model and prompt for Gemeni', async () => {
    mockActionsClient.get.mockResolvedValue({ id: '1', actionTypeId: GEMINI_CONNECTOR_ID });

    const result = await getChatParams(
      {
        connectorId: '1',
        model: 'gemini-1.5-pro',
        prompt: 'Hello, world!',
        citations: true,
      },
      { actions, request, logger, inference }
    );
    expect(Prompt).toHaveBeenCalledWith('Hello, world!', {
      citations: true,
      context: true,
      type: 'gemini',
    });
    expect(QuestionRewritePrompt).toHaveBeenCalledWith({
      type: 'gemini',
    });
    expect(inference.getChatModel).toHaveBeenCalledWith({
      request,
      connectorId: '1',
      chatModelOptions: expect.objectContaining({
        model: 'gemini-1.5-pro',
        temperature: 0,
        maxRetries: 0,
      }),
    });
    expect(result.chatPrompt).toContain('Hello, world!');
  });

  it('returns the correct chat model and prompt for BEDROCK_CONNECTOR_ID', async () => {
    mockActionsClient.get.mockResolvedValue({ id: '2', actionTypeId: BEDROCK_CONNECTOR_ID });

    const result = await getChatParams(
      {
        connectorId: '2',
        model: 'custom-model',
        prompt: 'How does it work?',
        citations: false,
      },
      { actions, request, logger, inference }
    );

    expect(Prompt).toHaveBeenCalledWith('How does it work?', {
      citations: false,
      context: true,
      type: 'anthropic',
    });
    expect(QuestionRewritePrompt).toHaveBeenCalledWith({
      type: 'anthropic',
    });
    expect(inference.getChatModel).toHaveBeenCalledWith({
      request,
      connectorId: '2',
      chatModelOptions: expect.objectContaining({
        model: 'custom-model',
        temperature: 0,
        maxRetries: 0,
      }),
    });
    expect(result.chatPrompt).toContain('How does it work?');
  });

  it('throws an error for invalid connector type', async () => {
    mockActionsClient.get.mockResolvedValue({ id: '3', actionTypeId: 'unknown' });

    await expect(
      getChatParams(
        {
          connectorId: '3',
          prompt: 'This should fail.',
          citations: false,
        },
        { actions, request, logger, inference }
      )
    ).rejects.toThrow('Invalid connector type: unknown');
  });

  it('returns the correct chat model and uses the default model when not specified in the params', async () => {
    mockActionsClient.get.mockResolvedValue({
      id: '2',
      actionTypeId: OPENAI_CONNECTOR_ID,
      config: { defaultModel: 'local' },
    });

    const result = await getChatParams(
      {
        connectorId: '2',
        prompt: 'How does it work?',
        citations: false,
      },
      { actions, request, logger, inference }
    );

    expect(Prompt).toHaveBeenCalledWith('How does it work?', {
      citations: false,
      context: true,
      type: 'openai',
    });
    expect(QuestionRewritePrompt).toHaveBeenCalledWith({
      type: 'openai',
    });
    expect(inference.getChatModel).toHaveBeenCalledWith({
      request,
      connectorId: '2',
      chatModelOptions: expect.objectContaining({
        model: 'local',
        temperature: 0.2,
        maxRetries: 0,
      }),
    });
    expect(result.chatPrompt).toContain('How does it work?');
  });

  it('returns the correct chat model and uses the default model for inference connector', async () => {
    mockActionsClient.get.mockResolvedValue({
      id: '2',
      actionTypeId: INFERENCE_CONNECTOR_ID,
      config: { defaultModel: 'local' },
    });

    const result = await getChatParams(
      {
        connectorId: '2',
        prompt: 'How does it work?',
        citations: false,
      },
      { actions, request, logger, inference }
    );

    expect(Prompt).toHaveBeenCalledWith('How does it work?', {
      citations: false,
      context: true,
      type: 'openai',
    });
    expect(QuestionRewritePrompt).toHaveBeenCalledWith({
      type: 'openai',
    });
    expect(inference.getChatModel).toHaveBeenCalledWith({
      request,
      connectorId: '2',
      chatModelOptions: expect.objectContaining({
        model: 'local',
        maxRetries: 0,
      }),
    });
    expect(result.chatPrompt).toContain('How does it work?');
  });

  it('returns the correct params for the EIS connector', async () => {
    const mockConnector = {
      id: 'elastic-llm',
      actionTypeId: INFERENCE_CONNECTOR_ID,
      config: {
        providerConfig: {
          model_id: elasticModelIds.RainbowSprinkles,
        },
      },
    };
    mockActionsClient.get.mockResolvedValue(mockConnector);

    const result = await getChatParams(
      {
        connectorId: 'elastic-llm',
        prompt: 'How does it work?',
        citations: false,
      },
      { actions, request, logger, inference }
    );

    expect(result).toMatchObject({
      connector: mockConnector,
      summarizationModel: elasticModelIds.RainbowSprinkles,
    });

    expect(Prompt).toHaveBeenCalledWith('How does it work?', {
      citations: false,
      context: true,
      type: 'anthropic',
    });
    expect(QuestionRewritePrompt).toHaveBeenCalledWith({
      type: 'anthropic',
    });
    expect(inference.getChatModel).toHaveBeenCalledWith({
      request,
      connectorId: 'elastic-llm',
      chatModelOptions: expect.objectContaining({
        model: elasticModelIds.RainbowSprinkles,
        maxRetries: 0,
      }),
    });
  });

  it('it returns provided model with EIS connector', async () => {
    const mockConnector = {
      id: 'elastic-llm',
      actionTypeId: INFERENCE_CONNECTOR_ID,
      config: {
        providerConfig: {
          model_id: elasticModelIds.RainbowSprinkles,
        },
      },
    };
    mockActionsClient.get.mockResolvedValue(mockConnector);

    const result = await getChatParams(
      {
        connectorId: 'elastic-llm',
        model: 'foo-bar',
        prompt: 'How does it work?',
        citations: false,
      },
      { actions, request, logger, inference }
    );

    expect(result).toMatchObject({
      summarizationModel: 'foo-bar',
    });

    expect(inference.getChatModel).toHaveBeenCalledWith({
      request,
      connectorId: 'elastic-llm',
      chatModelOptions: expect.objectContaining({
        model: 'foo-bar',
        maxRetries: 0,
      }),
    });
  });
});
