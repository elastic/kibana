/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { streamGraph } from './helpers';
import agent from 'elastic-apm-node';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { ExecuteConnectorRequestBody } from '@kbn/elastic-assistant-common';
import { PassThrough } from 'stream';
import { loggerMock } from '@kbn/logging-mocks';
import { AGENT_NODE_TAG } from './nodes/run_agent';
import { waitFor } from '@testing-library/react';
import type { APMTracer } from '@kbn/langchain/server/tracers/apm';
import type { DefaultAssistantGraph } from './graph';
import type { AnalyticsServiceSetup } from '@kbn/core-analytics-server';
import { AIMessage, AIMessageChunk, HumanMessage } from '@langchain/core/messages';

vi.mock('elastic-apm-node');

vi.mock('@kbn/securitysolution-es-utils');
const mockStream = new PassThrough();
const mockPush = vi.fn();
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
vi.mock('@kbn/ml-response-stream/server', () => {
  const mocked = {
    streamFactory: vi.fn().mockImplementation(() => ({
      DELIMITER: '\n',
      end: vi.fn(),
      push: mockPush,
      responseWithHeaders: mockResponseWithHeaders,
    })),
  };
  return { ...mocked, default: mocked };
});

describe('streamGraph', () => {
  const mockRequest = {} as KibanaRequest<unknown, unknown, ExecuteConnectorRequestBody>;
  const mockLogger = loggerMock.create();
  const mockApmTracer = {} as APMTracer;
  const mockStreamEvents = vi.fn();
  const mockAssistantGraph = {
    streamEvents: mockStreamEvents,
  } as unknown as DefaultAssistantGraph;
  const mockOnLlmResponse = vi.fn().mockResolvedValue(null);
  const requestArgs: Parameters<typeof streamGraph>[0] = {
    assistantGraph: mockAssistantGraph,
    inputs: {
      connectorId: '123',
      threadId: 'thread-123',
      messages: [new HumanMessage('input')],
      responseLanguage: 'English',
      isRegeneration: false,
      llmType: 'openai',
      isOssModel: false,
    },
    logger: mockLogger,
    onLlmResponse: mockOnLlmResponse,
    request: mockRequest,
    apmTracer: mockApmTracer,
    isEnabledKnowledgeBase: false,
    telemetry: {
      reportEvent: vi.fn(),
    } as unknown as AnalyticsServiceSetup,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (agent.isStarted as Mock).mockReturnValue(true);
    (agent.startSpan as Mock).mockReturnValue({
      end: vi.fn(),
      ids: { 'trace.id': 'traceId' },
      transaction: { ids: { 'transaction.id': 'transactionId' } },
    });
  });
  describe('OpenAI Function Agent streaming', () => {
    describe('Inference Chat Model Disabled', () => {
      it('should execute the graph in streaming mode - OpenAI + isOssModel = false', async () => {
        mockStreamEvents.mockReturnValue({
          async *[Symbol.asyncIterator]() {
            yield {
              event: 'on_chat_model_stream',
              data: { chunk: new AIMessageChunk({ content: 'content' }) },
              tags: [AGENT_NODE_TAG],
            };
            yield {
              event: 'on_chat_model_end',
              data: {
                output: new AIMessage('final message'),
              },
              tags: [AGENT_NODE_TAG],
            };
          },
        });

        const response = await streamGraph(requestArgs);

        expect(response).toBe(mockResponseWithHeaders);
        await waitFor(() => {
          expect(mockPush).toHaveBeenCalledWith({ payload: 'content', type: 'content' });
          expect(mockOnLlmResponse).toHaveBeenCalledWith({
            content: 'final message',
            traceData: { transactionId: 'transactionId', traceId: 'traceId' },
            isError: false,
          });
        });
      });
      it('on_llm_end events with tool calls should not end the stream', async () => {
        mockStreamEvents.mockReturnValue({
          async *[Symbol.asyncIterator]() {
            yield {
              event: 'on_chat_model_stream',
              data: { chunk: new AIMessageChunk({ content: 'content' }) },
              tags: [AGENT_NODE_TAG],
            };
            yield {
              event: 'on_chat_model_end',
              data: {
                output: new AIMessage({
                  content: 'I will use the search tool to find more information.',
                  tool_calls: [
                    {
                      name: 'search',
                      args: {
                        query: 'example',
                      },
                      id: 'tool_abcd123',
                    },
                  ],
                }),
              },
              tags: [AGENT_NODE_TAG],
            };
          },
        });

        const response = await streamGraph(requestArgs);

        expect(response).toBe(mockResponseWithHeaders);
        await waitFor(() => {
          expect(mockPush).toHaveBeenCalledWith({ payload: 'content', type: 'content' });
          expect(mockPush).toHaveBeenCalledWith({ payload: '\n\n', type: 'content' });
          expect(mockOnLlmResponse).not.toHaveBeenCalled();
        });
      });

      it('on_chat_model_end events is called with chunks if there is no final text value', async () => {
        mockStreamEvents.mockReturnValue({
          async *[Symbol.asyncIterator]() {
            yield {
              event: 'on_chat_model_stream',
              data: { chunk: new AIMessageChunk({ content: 'content' }) },
              tags: [AGENT_NODE_TAG],
            };
            yield {
              event: 'on_chat_model_end',
              data: {
                output: new AIMessage('content'),
              },
              tags: [AGENT_NODE_TAG],
            };
          },
        });

        const response = await streamGraph(requestArgs);

        expect(response).toBe(mockResponseWithHeaders);
        await waitFor(() => {
          expect(mockPush).toHaveBeenCalledWith({ payload: 'content', type: 'content' });
          expect(mockOnLlmResponse).toHaveBeenCalledWith({
            content: 'content',
            traceData: { transactionId: 'transactionId', traceId: 'traceId' },
            isError: false,
          });
        });
      });
    });
  });

  describe('Tool Calling Agent streaming', () => {
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

    const expectConditions = async (response: unknown, isOssModel: boolean = false) => {
      expect(response).toBe(mockResponseWithHeaders);

      await waitFor(() => {
        if (!isOssModel) {
          expect(mockPush).toHaveBeenCalledWith({ type: 'content', payload: 'Look at these' });
          expect(mockPush).toHaveBeenCalledWith({ type: 'content', payload: ' rare IP' });
          expect(mockPush).toHaveBeenCalledWith({ type: 'content', payload: ' addresses.' });
        }

        expect(mockOnLlmResponse).toHaveBeenCalledWith({
          content: 'Look at these rare IP addresses.',
          traceData: { transactionId: 'transactionId', traceId: 'traceId' },
          isError: false,
        });
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
      await expectConditions(response, true);
    });
    it('should execute the graph in streaming mode - OpenAI + inferenceChatModelDisabled = false', async () => {
      const mockAssistantGraphAsyncIterator = {
        streamEvents: () => mockAsyncIterator,
      } as unknown as DefaultAssistantGraph;
      const response = await streamGraph({
        ...requestArgs,
        assistantGraph: mockAssistantGraphAsyncIterator,
      });
      await expectConditions(response);
    });
  });
});
