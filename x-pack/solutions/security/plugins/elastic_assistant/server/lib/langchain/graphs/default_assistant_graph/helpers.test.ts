/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { streamGraph } from './helpers';
import agent from 'elastic-apm-node';
import { KibanaRequest } from '@kbn/core-http-server';
import { ExecuteConnectorRequestBody } from '@kbn/elastic-assistant-common';
import { PassThrough } from 'stream';
import { loggerMock } from '@kbn/logging-mocks';
import { AGENT_NODE_TAG } from './nodes/run_agent';
import { waitFor } from '@testing-library/react';
import { APMTracer } from '@kbn/langchain/server/tracers/apm';
import { DefaultAssistantGraph } from './graph';

jest.mock('elastic-apm-node');

jest.mock('@kbn/securitysolution-es-utils');
const mockStream = new PassThrough();
const mockPush = jest.fn();
const mockResponseWithHeaders = {
  body: mockStream,
  headers: {
    'X-Accel-Buffering': 'no',
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'Transfer-Encoding': 'chunked',
  },
};
jest.mock('@kbn/ml-response-stream/server', () => ({
  streamFactory: jest.fn().mockImplementation(() => ({
    DELIMITER: '\n',
    end: jest.fn(),
    push: mockPush,
    responseWithHeaders: mockResponseWithHeaders,
  })),
}));

describe('streamGraph', () => {
  const mockRequest = {} as KibanaRequest<unknown, unknown, ExecuteConnectorRequestBody>;
  const mockLogger = loggerMock.create();
  const mockApmTracer = {} as APMTracer;
  const mockStreamEvents = jest.fn();
  const mockAssistantGraph = {
    streamEvents: mockStreamEvents,
  } as unknown as DefaultAssistantGraph;
  const mockOnLlmResponse = jest.fn().mockResolvedValue(null);
  const requestArgs = {
    apmTracer: mockApmTracer,
    assistantGraph: mockAssistantGraph,
    inputs: {
      input: 'input',
      responseLanguage: 'English',
      llmType: 'openai',
      provider: 'openai',
      connectorId: '123',
    },
    logger: mockLogger,
    onLlmResponse: mockOnLlmResponse,
    request: mockRequest,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (agent.isStarted as jest.Mock).mockReturnValue(true);
    (agent.startSpan as jest.Mock).mockReturnValue({
      end: jest.fn(),
      ids: { 'trace.id': 'traceId' },
      transaction: { ids: { 'transaction.id': 'transactionId' } },
    });
  });
  describe('OpenAI Function Agent streaming', () => {
    it('should execute the graph in streaming mode - OpenAI + isOssModel = false', async () => {
      mockStreamEvents.mockReturnValue({
        async *[Symbol.asyncIterator]() {
          yield {
            event: 'on_llm_stream',
            data: { chunk: { message: { content: 'content' } } },
            tags: [AGENT_NODE_TAG],
          };
          yield {
            event: 'on_llm_end',
            data: {
              output: {
                generations: [
                  [{ generationInfo: { finish_reason: 'stop' }, text: 'final message' }],
                ],
              },
            },
            tags: [AGENT_NODE_TAG],
          };
        },
      });

      const response = await streamGraph(requestArgs);

      expect(response).toBe(mockResponseWithHeaders);
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith({ payload: 'content', type: 'content' });
        expect(mockOnLlmResponse).toHaveBeenCalledWith(
          'final message',
          { transactionId: 'transactionId', traceId: 'traceId' },
          false
        );
      });
    });
    it('on_llm_end events with finish_reason != stop should not end the stream', async () => {
      mockStreamEvents.mockReturnValue({
        async *[Symbol.asyncIterator]() {
          yield {
            event: 'on_llm_stream',
            data: { chunk: { message: { content: 'content' } } },
            tags: [AGENT_NODE_TAG],
          };
          yield {
            event: 'on_llm_end',
            data: {
              output: {
                generations: [[{ generationInfo: { finish_reason: 'function_call' }, text: '' }]],
              },
            },
            tags: [AGENT_NODE_TAG],
          };
        },
      });

      const response = await streamGraph(requestArgs);

      expect(response).toBe(mockResponseWithHeaders);
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith({ payload: 'content', type: 'content' });
        expect(mockOnLlmResponse).not.toHaveBeenCalled();
      });
    });
    it('on_llm_end events without a finish_reason should end the stream', async () => {
      mockStreamEvents.mockReturnValue({
        async *[Symbol.asyncIterator]() {
          yield {
            event: 'on_llm_stream',
            data: { chunk: { message: { content: 'content' } } },
            tags: [AGENT_NODE_TAG],
          };
          yield {
            event: 'on_llm_end',
            data: {
              output: {
                generations: [[{ generationInfo: {}, text: 'final message' }]],
              },
            },
            tags: [AGENT_NODE_TAG],
          };
        },
      });

      const response = await streamGraph(requestArgs);

      expect(response).toBe(mockResponseWithHeaders);
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith({ payload: 'content', type: 'content' });
        expect(mockOnLlmResponse).toHaveBeenCalledWith(
          'final message',
          { transactionId: 'transactionId', traceId: 'traceId' },
          false
        );
      });
    });
    it('on_llm_end events is called with chunks if there is no final text value', async () => {
      mockStreamEvents.mockReturnValue({
        async *[Symbol.asyncIterator]() {
          yield {
            event: 'on_llm_stream',
            data: { chunk: { message: { content: 'content' } } },
            tags: [AGENT_NODE_TAG],
          };
          yield {
            event: 'on_llm_end',
            data: {
              output: {
                generations: [[{ generationInfo: {}, text: '' }]],
              },
            },
            tags: [AGENT_NODE_TAG],
          };
        },
      });

      const response = await streamGraph(requestArgs);

      expect(response).toBe(mockResponseWithHeaders);
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith({ payload: 'content', type: 'content' });
        expect(mockOnLlmResponse).toHaveBeenCalledWith(
          'content',
          { transactionId: 'transactionId', traceId: 'traceId' },
          false
        );
      });
    });
    it('on_llm_end does not call handleStreamEnd if generations is undefined', async () => {
      mockStreamEvents.mockReturnValue({
        async *[Symbol.asyncIterator]() {
          yield {
            event: 'on_llm_stream',
            data: { chunk: { message: { content: 'content' } } },
            tags: [AGENT_NODE_TAG],
          };
          yield {
            event: 'on_llm_end',
            data: {},
            tags: [AGENT_NODE_TAG],
          };
        },
      });

      const response = await streamGraph(requestArgs);

      expect(response).toBe(mockResponseWithHeaders);
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith({ payload: 'content', type: 'content' });
        expect(mockOnLlmResponse).not.toHaveBeenCalled();
      });
    });
  });

  describe('Tool Calling Agent and Structured Chat Agent streaming', () => {
    const mockAsyncIterator = {
      async *[Symbol.asyncIterator]() {
        yield {
          event: 'on_chat_model_stream',
          data: {
            chunk: {
              content: 'Look at these',
            },
          },
          tags: [AGENT_NODE_TAG],
        };
        yield {
          event: 'on_chat_model_stream',
          data: {
            chunk: {
              content: ' rare IP',
            },
          },
          tags: [AGENT_NODE_TAG],
        };
        yield {
          event: 'on_chat_model_stream',
          data: {
            chunk: {
              content: ' addresses.',
            },
          },
          tags: [AGENT_NODE_TAG],
        };
        yield {
          event: 'on_chat_model_end',
          data: {
            output: {
              content: 'Look at these rare IP addresses.',
            },
          },
          tags: [AGENT_NODE_TAG],
        };
      },
    };

    const expectConditions = async (response: unknown) => {
      expect(response).toBe(mockResponseWithHeaders);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith({ type: 'content', payload: 'Look at these' });
        expect(mockPush).toHaveBeenCalledWith({ type: 'content', payload: ' rare IP' });
        expect(mockPush).toHaveBeenCalledWith({ type: 'content', payload: ' addresses.' });
        expect(mockOnLlmResponse).toHaveBeenCalledWith(
          'Look at these rare IP addresses.',
          { transactionId: 'transactionId', traceId: 'traceId' },
          false
        );
      });
    };
    it('should execute the graph in streaming mode - Gemini', async () => {
      const mockAssistantGraphAsyncIterator = {
        streamEvents: () => mockAsyncIterator,
      } as unknown as DefaultAssistantGraph;
      const response = await streamGraph({
        ...requestArgs,
        assistantGraph: mockAssistantGraphAsyncIterator,
        inputs: {
          ...requestArgs.inputs,
          llmType: 'gemini',
          provider: 'gemini',
        },
      });

      await expectConditions(response);
    });
    it('should execute the graph in streaming mode - Bedrock', async () => {
      const mockAssistantGraphAsyncIterator = {
        streamEvents: () => mockAsyncIterator,
      } as unknown as DefaultAssistantGraph;
      const response = await streamGraph({
        ...requestArgs,
        assistantGraph: mockAssistantGraphAsyncIterator,
        inputs: {
          ...requestArgs.inputs,
          llmType: 'bedrock',
          provider: 'bedrock',
        },
      });

      await expectConditions(response);
    });
    it('should execute the graph in streaming mode - OpenAI + isOssModel = true', async () => {
      const mockAssistantGraphAsyncIterator = {
        streamEvents: () => mockAsyncIterator,
      } as unknown as DefaultAssistantGraph;
      const response = await streamGraph({
        ...requestArgs,
        assistantGraph: mockAssistantGraphAsyncIterator,
        inputs: {
          ...requestArgs.inputs,
          isOssModel: true,
        },
      });
      await expectConditions(response);
    });
  });
});
