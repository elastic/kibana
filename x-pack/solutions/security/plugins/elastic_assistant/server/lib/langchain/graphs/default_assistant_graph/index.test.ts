/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { actionsClientMock } from '@kbn/actions-plugin/server/actions_client/actions_client.mock';
import { callAssistantGraph } from '.';
import { getDefaultAssistantGraph } from './graph';
import { invokeGraph, streamGraph } from './helpers';
import { loggerMock } from '@kbn/logging-mocks';
import { AgentExecutorParams, AssistantDataClients } from '../../executors/types';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { getPrompt, resolveProviderAndModel } from '@kbn/security-ai-prompts';
import { getFindAnonymizationFieldsResultWithSingleHit } from '../../../../__mocks__/response';
import {
  createOpenAIToolsAgent,
  createStructuredChatAgent,
  createToolCallingAgent,
} from 'langchain/agents';
import { newContentReferencesStoreMock } from '@kbn/elastic-assistant-common/impl/content_references/content_references_store/__mocks__/content_references_store.mock';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { AssistantTool, AssistantToolParams } from '../../../..';
import { promptGroupId as toolsGroupId } from '../../../prompt/tool_prompts';
import { promptDictionary } from '../../../prompt';
import { promptGroupId } from '../../../prompt/local_prompt_object';
jest.mock('./graph');
jest.mock('./helpers');
jest.mock('langchain/agents');
jest.mock('@kbn/langchain/server/tracers/apm');
jest.mock('@kbn/langchain/server/tracers/telemetry');
jest.mock('@kbn/security-ai-prompts');
const getDefaultAssistantGraphMock = getDefaultAssistantGraph as jest.Mock;
const resolveProviderAndModelMock = resolveProviderAndModel as jest.Mock;
const getPromptMock = getPrompt as jest.Mock;
describe('callAssistantGraph', () => {
  const mockDataClients = {
    anonymizationFieldsDataClient: {
      findDocuments: jest.fn(),
    },
    kbDataClient: {
      isInferenceEndpointExists: jest.fn(),
      getAssistantTools: jest.fn(),
    },
  } as unknown as AssistantDataClients;

  const mockRequest = {
    body: {
      model: 'test-model',
    },
  };

  const savedObjectsClient = savedObjectsClientMock.create();
  savedObjectsClient.find = jest.fn().mockResolvedValue({
    page: 1,
    per_page: 20,
    total: 0,
    saved_objects: [],
  });
  const defaultParams = {
    actionsClient: actionsClientMock.create(),
    alertsIndexPattern: 'test-pattern',
    assistantTools: [],
    connectorId: 'test-connector',
    conversationId: 'test-conversation',
    dataClients: mockDataClients,
    esClient: elasticsearchClientMock.createScopedClusterClient().asCurrentUser,
    inference: {},
    langChainMessages: [{ content: 'test message' }],
    llmTasks: { retrieveDocumentationAvailable: jest.fn(), retrieveDocumentation: jest.fn() },
    llmType: 'openai',
    isOssModel: false,
    logger: loggerMock.create(),
    isStream: false,
    onLlmResponse: jest.fn(),
    onNewReplacements: jest.fn(),
    replacements: [],
    request: mockRequest,
    savedObjectsClient,
    size: 1,
    systemPrompt: 'test-prompt',
    telemetry: {},
    telemetryParams: {},
    traceOptions: {},
    responseLanguage: 'English',
    contentReferencesStore: newContentReferencesStoreMock(),
  } as unknown as AgentExecutorParams<boolean>;

  beforeEach(() => {
    jest.clearAllMocks();
    (mockDataClients?.kbDataClient?.isInferenceEndpointExists as jest.Mock).mockResolvedValue(true);
    getDefaultAssistantGraphMock.mockReturnValue({});
    resolveProviderAndModelMock.mockResolvedValue({
      provider: 'bedrock',
    });
    (invokeGraph as jest.Mock).mockResolvedValue({
      output: 'test-output',
      traceData: {},
      conversationId: 'new-conversation-id',
    });
    (streamGraph as jest.Mock).mockResolvedValue({});
    (mockDataClients?.anonymizationFieldsDataClient?.findDocuments as jest.Mock).mockResolvedValue(
      getFindAnonymizationFieldsResultWithSingleHit()
    );
    getPromptMock.mockResolvedValue('prompt');
  });

  it('calls invokeGraph with correct parameters for non-streaming', async () => {
    const result = await callAssistantGraph(defaultParams);

    expect(invokeGraph).toHaveBeenCalledWith(
      expect.objectContaining({
        inputs: expect.objectContaining({
          input: 'test message',
        }),
      })
    );
    expect(result.body).toEqual({
      connector_id: 'test-connector',
      data: 'test-output',
      trace_data: {},
      replacements: [],
      status: 'ok',
      conversationId: 'new-conversation-id',
    });
  });

  it('calls streamGraph with correct parameters for streaming', async () => {
    const params = { ...defaultParams, isStream: true };
    await callAssistantGraph(params);

    expect(streamGraph).toHaveBeenCalledWith(
      expect.objectContaining({
        inputs: expect.objectContaining({
          input: 'test message',
        }),
      })
    );
  });

  it('calls getDefaultAssistantGraph without signal for openai', async () => {
    await callAssistantGraph(defaultParams);
    expect(getDefaultAssistantGraphMock.mock.calls[0][0]).not.toHaveProperty('signal');
  });

  it('calls getDefaultAssistantGraph with signal for bedrock', async () => {
    await callAssistantGraph({ ...defaultParams, llmType: 'bedrock' });
    expect(getDefaultAssistantGraphMock.mock.calls[0][0]).toHaveProperty('signal');
  });

  it('handles error when anonymizationFieldsDataClient.findDocuments fails', async () => {
    (mockDataClients?.anonymizationFieldsDataClient?.findDocuments as jest.Mock).mockRejectedValue(
      new Error('test error')
    );

    await expect(callAssistantGraph(defaultParams)).rejects.toThrow('test error');
  });

  it('handles error when kbDataClient.isInferenceEndpointExists fails', async () => {
    (mockDataClients?.kbDataClient?.isInferenceEndpointExists as jest.Mock).mockRejectedValue(
      new Error('test error')
    );

    await expect(callAssistantGraph(defaultParams)).rejects.toThrow('test error');
  });

  it('returns correct response when no conversationId is returned', async () => {
    (invokeGraph as jest.Mock).mockResolvedValue({ output: 'test-output', traceData: {} });

    const result = await callAssistantGraph(defaultParams);

    expect(result.body).toEqual({
      connector_id: 'test-connector',
      data: 'test-output',
      trace_data: {},
      replacements: [],
      status: 'ok',
    });
  });

  it('calls getPrompt for each tool and the default system prompt', async () => {
    const getTool = jest.fn();
    const mockTool: AssistantTool = {
      id: 'id',
      name: 'name',
      description: 'description',
      sourceRegister: 'sourceRegister',
      isSupported: (params: AssistantToolParams) => true,
      getTool,
    };
    const params = {
      ...defaultParams,
      assistantTools: [
        { ...mockTool, name: 'test-tool' },
        { ...mockTool, name: 'test-tool2' },
      ],
    };
    await callAssistantGraph(params);

    expect(getPromptMock).toHaveBeenCalledTimes(3);
    expect(getPromptMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'test-model',
        provider: 'openai',
        promptId: 'test-tool',
        promptGroupId: toolsGroupId,
      })
    );
    expect(getPromptMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'test-model',
        provider: 'openai',
        promptId: 'test-tool2',
        promptGroupId: toolsGroupId,
      })
    );
    expect(getPromptMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'test-model',
        provider: 'openai',
        promptId: promptDictionary.systemPrompt,
        promptGroupId: promptGroupId.aiAssistant,
      })
    );

    expect(getTool).toHaveBeenCalledWith(
      expect.objectContaining({
        description: 'prompt',
      })
    );
  });

  describe('agentRunnable', () => {
    it('creates OpenAIToolsAgent for openai llmType', async () => {
      const params = { ...defaultParams, llmType: 'openai' };
      await callAssistantGraph(params);

      expect(createOpenAIToolsAgent).toHaveBeenCalled();
      expect(createStructuredChatAgent).not.toHaveBeenCalled();
      expect(createToolCallingAgent).not.toHaveBeenCalled();
    });

    it('creates OpenAIToolsAgent for inference llmType', async () => {
      defaultParams.actionsClient.get = jest.fn().mockResolvedValue({
        config: {
          provider: 'elastic',
          providerConfig: { model_id: 'rainbow-sprinkles' },
        },
      });
      const params = { ...defaultParams, llmType: 'inference' };
      await callAssistantGraph(params);

      expect(createOpenAIToolsAgent).toHaveBeenCalled();
      expect(createStructuredChatAgent).not.toHaveBeenCalled();
      expect(createToolCallingAgent).not.toHaveBeenCalled();
    });

    it('creates ToolCallingAgent for bedrock llmType', async () => {
      const params = { ...defaultParams, llmType: 'bedrock' };
      await callAssistantGraph(params);

      expect(createToolCallingAgent).toHaveBeenCalled();
      expect(createOpenAIToolsAgent).not.toHaveBeenCalled();
      expect(createStructuredChatAgent).not.toHaveBeenCalled();
    });

    it('creates ToolCallingAgent for gemini llmType', async () => {
      const params = {
        ...defaultParams,
        request: {
          body: { model: 'gemini-1.5-flash' },
        } as unknown as AgentExecutorParams<boolean>['request'],
        llmType: 'gemini',
      };
      await callAssistantGraph(params);

      expect(createToolCallingAgent).toHaveBeenCalled();
      expect(createOpenAIToolsAgent).not.toHaveBeenCalled();
      expect(createStructuredChatAgent).not.toHaveBeenCalled();
    });

    it('creates StructuredChatAgent for oss model', async () => {
      const params = { ...defaultParams, llmType: 'openai', isOssModel: true };
      await callAssistantGraph(params);

      expect(createStructuredChatAgent).toHaveBeenCalled();
      expect(createOpenAIToolsAgent).not.toHaveBeenCalled();
      expect(createToolCallingAgent).not.toHaveBeenCalled();
    });
    it('does not calls resolveProviderAndModel when llmType === openai', async () => {
      const params = { ...defaultParams, llmType: 'openai' };
      await callAssistantGraph(params);

      expect(resolveProviderAndModelMock).not.toHaveBeenCalled();
    });
    it('calls resolveProviderAndModel when llmType === inference', async () => {
      const params = { ...defaultParams, llmType: 'inference' };
      await callAssistantGraph(params);

      expect(resolveProviderAndModelMock).toHaveBeenCalled();
    });
    it('calls resolveProviderAndModel when llmType === undefined', async () => {
      const params = { ...defaultParams, llmType: undefined };
      await callAssistantGraph(params);

      expect(resolveProviderAndModelMock).toHaveBeenCalled();
    });
  });
});
