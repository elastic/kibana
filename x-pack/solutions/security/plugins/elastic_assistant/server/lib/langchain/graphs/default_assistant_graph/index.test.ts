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
import { getFindAnonymizationFieldsResultWithSingleHit } from '../../../../__mocks__/response';
import {
  createOpenAIToolsAgent,
  createStructuredChatAgent,
  createToolCallingAgent,
} from 'langchain/agents';
jest.mock('./graph');
jest.mock('./helpers');
jest.mock('langchain/agents');
jest.mock('@kbn/langchain/server/tracers/apm');
jest.mock('@kbn/langchain/server/tracers/telemetry');
const getDefaultAssistantGraphMock = getDefaultAssistantGraph as jest.Mock;
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
    size: 1,
    systemPrompt: 'test-prompt',
    telemetry: {},
    telemetryParams: {},
    traceOptions: {},
    responseLanguage: 'English',
  } as unknown as AgentExecutorParams<boolean>;

  beforeEach(() => {
    jest.clearAllMocks();
    (mockDataClients?.kbDataClient?.isInferenceEndpointExists as jest.Mock).mockResolvedValue(true);
    getDefaultAssistantGraphMock.mockReturnValue({});
    (invokeGraph as jest.Mock).mockResolvedValue({
      output: 'test-output',
      traceData: {},
      conversationId: 'new-conversation-id',
    });
    (streamGraph as jest.Mock).mockResolvedValue({});
    (mockDataClients?.anonymizationFieldsDataClient?.findDocuments as jest.Mock).mockResolvedValue(
      getFindAnonymizationFieldsResultWithSingleHit()
    );
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

  describe('agentRunnable', () => {
    it('creates OpenAIToolsAgent for openai llmType', async () => {
      const params = { ...defaultParams, llmType: 'openai' };
      await callAssistantGraph(params);

      expect(createOpenAIToolsAgent).toHaveBeenCalled();
      expect(createStructuredChatAgent).not.toHaveBeenCalled();
      expect(createToolCallingAgent).not.toHaveBeenCalled();
    });

    it('creates OpenAIToolsAgent for inference llmType', async () => {
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
  });
});
