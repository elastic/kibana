/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import type { IRouter } from '@kbn/core/server';
import { NEVER } from 'rxjs';
import { mockActionResponse } from '../../__mocks__/action_result_data';
import type { ElasticAssistantRequestHandlerContext } from '../../types';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { coreMock } from '@kbn/core/server/mocks';
import { INVOKE_ASSISTANT_ERROR_EVENT } from '../../lib/telemetry/event_based_telemetry';
import { PassThrough } from 'stream';
import { actionsClientMock } from '@kbn/actions-plugin/server/actions_client/actions_client.mock';
import {
  getConversationResponseMock,
  getFindAnonymizationFieldsResultWithSingleHit,
} from '../../__mocks__/response';
import { defaultAssistantFeatures } from '@kbn/elastic-assistant-common';
import { InferenceConnectorType } from '@kbn/inference-common';
import { chatCompleteRoute } from './chat_complete_route';
import { licensingMock } from '@kbn/licensing-plugin/server/mocks';
import {
  appendAssistantMessageToConversation,
  createConversationWithUserInput,
  getSystemPromptFromPromptId,
  getSystemPromptFromUserConversation,
  langChainExecute,
} from '../helpers';
import type { OnLlmResponse } from '../../lib/langchain/executors/types';
import { createMockConnector } from '@kbn/actions-plugin/server/application/connector/mocks';

const license = licensingMock.createLicenseMock();

const actionsClient = actionsClientMock.create();
vi.mock('../../lib/build_response', () => {
  const mocked = {
    buildResponse: vi.fn().mockImplementation((x) => x),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../helpers', async () => {
  const original = await vi.importActual('../helpers');

  return {
    ...original,
    appendAssistantMessageToConversation: vi.fn(),
    createConversationWithUserInput: vi.fn(),
    getSystemPromptFromPromptId: vi.fn(),
    getSystemPromptFromUserConversation: vi.fn(),
    langChainExecute: vi.fn(),
  };
});
const mockAppendAssistantMessageToConversation = appendAssistantMessageToConversation as Mock;
const mockCreateConversationWithUserInput = createConversationWithUserInput as Mock;
const mockGetSystemPromptFromPromptId = getSystemPromptFromPromptId as Mock;
const mockGetSystemPromptFromUserConversation = getSystemPromptFromUserConversation as Mock;

const mockLangChainExecute = langChainExecute as Mock;
const mockStream = vi.fn().mockImplementation(() => new PassThrough());

const existingConversation = getConversationResponseMock();
const reportEvent = vi.fn();
const appendConversationMessages = vi.fn();
const mockContext = {
  resolve: vi.fn().mockResolvedValue({
    elasticAssistant: {
      actions: {
        getActionsClientWithRequest: vi.fn().mockResolvedValue(actionsClient),
      },
      getRegisteredTools: vi.fn(() => []),
      getRegisteredFeatures: vi.fn(() => defaultAssistantFeatures),
      logger: loggingSystemMock.createLogger(),
      telemetry: { ...coreMock.createSetup().analytics, reportEvent },
      inference: {
        getConnectorById: vi.fn().mockImplementation((id: string) => {
          if (id === 'mock-connector-id') {
            return Promise.resolve({
              connectorId: 'mock-connector-id',
              type: InferenceConnectorType.OpenAI,
              name: 'mock connector',
              config: {},
              capabilities: {},
              isInferenceEndpoint: false,
              isPreconfigured: false,
            });
          }
          return Promise.resolve(undefined);
        }),
      },
      llmTasks: { retrieveDocumentationAvailable: vi.fn(), retrieveDocumentation: vi.fn() },
      getCurrentUser: () => ({
        username: 'user',
        email: 'email',
        fullName: 'full name',
        roles: ['user-role'],
        enabled: true,
        authentication_realm: { name: 'native1', type: 'native' },
        lookup_realm: { name: 'native1', type: 'native' },
        authentication_provider: { type: 'basic', name: 'basic1' },
        authentication_type: 'realm',
        elastic_cloud_user: false,
        metadata: { _reserved: false },
      }),
      getAIAssistantConversationsDataClient: vi.fn().mockResolvedValue({
        getConversation: vi.fn().mockResolvedValue(existingConversation),
        updateConversation: vi.fn().mockResolvedValue(existingConversation),
        createConversation: vi.fn().mockResolvedValue(existingConversation),
        appendConversationMessages:
          appendConversationMessages.mockResolvedValue(existingConversation),
      }),
      getAIAssistantKnowledgeBaseDataClient: vi.fn().mockResolvedValue({
        getKnowledgeBaseDocuments: vi.fn().mockResolvedValue([]),
        indexTemplateAndPattern: {
          alias: 'knowledge-base-alias',
        },
        isInferenceEndpointExists: vi.fn().mockResolvedValue(true),
      }),
      getAIAssistantAnonymizationFieldsDataClient: vi.fn().mockResolvedValue({
        findDocuments: vi.fn().mockResolvedValue(getFindAnonymizationFieldsResultWithSingleHit()),
      }),
      getAIAssistantPromptsDataClient: vi.fn().mockResolvedValue({
        findDocuments: vi.fn().mockResolvedValue({}),
      }),
    },
    core: {
      elasticsearch: {
        client: elasticsearchServiceMock.createScopedClusterClient(),
      },
      savedObjects: coreMock.createRequestHandlerContext().savedObjects,
    },
    licensing: {
      ...licensingMock.createRequestHandlerContext({ license }),
      license,
    },
  }),
};

const mockRequest = {
  body: {
    conversationId: 'mock-conversation-id',
    connectorId: 'mock-connector-id',
    persist: true,
    model: 'gpt-4',
    messages: [
      {
        role: 'user',
        content:
          "Evaluate the event from the context and format your output neatly in markdown syntax for my Elastic Security case.\nAdd your description, recommended actions and bulleted triage steps. Use the MITRE ATT&CK data provided to add more context and recommendations from MITRE, and hyperlink to the relevant pages on MITRE's website. Be sure to include the user and host risk score data from the context. Your response should include steps that point to Elastic Security specific features, including endpoint response actions, the Elastic Agent OSQuery manager integration (with example osquery queries), timelines and entity analytics and link to all the relevant Elastic Security documentation.",
        data: {
          'event.category': 'process',
          'process.pid': 69516,
          'host.os.version': 14.5,
          'host.os.name': 'macOS',
          'host.name': 'Yuliias-MBP',
          'process.name': 'biomesyncd',
          'user.name': 'yuliianaumenko',
          'process.working_directory': '/',
          'event.module': 'system',
          'process.executable': '/usr/libexec/biomesyncd',
          'process.args': '/usr/libexec/biomesyncd',
        },
      },
    ],
  },
  events: {
    aborted$: NEVER,
  },
  query: {},
};

const mockResponse = {
  ok: vi.fn().mockImplementation((x) => x),
  error: vi.fn().mockImplementation((x) => x),
};

describe('chatCompleteRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAppendAssistantMessageToConversation.mockResolvedValue(true);
    license.hasAtLeast.mockReturnValue(true);
    mockCreateConversationWithUserInput.mockResolvedValue({ id: 'something' });
    mockGetSystemPromptFromPromptId.mockResolvedValue(undefined);
    mockGetSystemPromptFromUserConversation.mockResolvedValue(undefined);
    mockLangChainExecute.mockImplementation(
      async ({
        connectorId,
        isStream,
        onLlmResponse,
      }: {
        connectorId: string;
        isStream: boolean;
        onLlmResponse: OnLlmResponse;
      }) => {
        if (!isStream && connectorId === 'mock-connector-id') {
          onLlmResponse({
            content: 'Non-streamed test reply.',
            traceData: {},
            isError: false,
          }).catch(() => {});
          return {
            connector_id: 'mock-connector-id',
            data: mockActionResponse,
            status: 'ok',
          };
        } else if (isStream && connectorId === 'mock-connector-id') {
          onLlmResponse({
            content: 'Streamed test reply.',
            traceData: {},
            isError: false,
          }).catch(() => {});
          return mockStream;
        } else {
          onLlmResponse({
            content: 'simulated error',
            traceData: {},
            isError: true,
          }).catch(() => {});
          throw new Error('simulated error');
        }
      }
    );
    actionsClient.execute.mockImplementation(
      vi.fn().mockResolvedValue(() => ({
        data: 'mockChatCompletion',
        status: 'ok',
      }))
    );
    actionsClient.getBulk.mockResolvedValue([
      createMockConnector({
        id: '1',
        name: 'my name',
        actionTypeId: '.gen-ai',
        config: {
          a: true,
          b: true,
          c: true,
        },
      }),
    ]);
  });

  it('returns the expected response when using the existingConversation', async () => {
    const mockRouter = {
      versioned: {
        post: vi.fn().mockImplementation(() => {
          return {
            addVersion: vi.fn().mockImplementation(async (_, handler) => {
              const result = await handler(
                mockContext,
                {
                  ...mockRequest,
                  body: {
                    ...mockRequest.body,
                    conversationId: existingConversation.id,
                  },
                },
                mockResponse
              );

              expect(result).toEqual({
                connector_id: 'mock-connector-id',
                data: mockActionResponse,
                status: 'ok',
              });
            }),
          };
        }),
      },
    };

    chatCompleteRoute(mockRouter as unknown as IRouter<ElasticAssistantRequestHandlerContext>);
  });

  it('passes the conversation system prompt to langChainExecute', async () => {
    mockGetSystemPromptFromUserConversation.mockResolvedValue('You always talk like a pirate');

    const mockRouter = {
      versioned: {
        post: vi.fn().mockImplementation(() => {
          return {
            addVersion: vi.fn().mockImplementation(async (_, handler) => {
              await handler(mockContext, mockRequest, mockResponse);

              expect(mockLangChainExecute).toHaveBeenCalledWith(
                expect.objectContaining({
                  systemPrompt: 'You always talk like a pirate',
                })
              );
            }),
          };
        }),
      },
    };

    await chatCompleteRoute(
      mockRouter as unknown as IRouter<ElasticAssistantRequestHandlerContext>
    );
  });

  it('appends promptId prompt content to the conversation system prompt', async () => {
    mockGetSystemPromptFromUserConversation.mockResolvedValue('Conversation prompt');
    mockGetSystemPromptFromPromptId.mockResolvedValue('Request prompt');

    const requestWithPromptId = {
      ...mockRequest,
      body: {
        ...mockRequest.body,
        promptId: 'test-prompt-id',
      },
    };

    const mockRouter = {
      versioned: {
        post: vi.fn().mockImplementation(() => {
          return {
            addVersion: vi.fn().mockImplementation(async (_, handler) => {
              await handler(mockContext, requestWithPromptId, mockResponse);

              expect(mockLangChainExecute).toHaveBeenCalledWith(
                expect.objectContaining({
                  systemPrompt: 'Conversation prompt\n\nRequest prompt',
                })
              );
            }),
          };
        }),
      },
    };

    await chatCompleteRoute(
      mockRouter as unknown as IRouter<ElasticAssistantRequestHandlerContext>
    );
  });

  it('passes promptId prompt content when persist=false', async () => {
    mockGetSystemPromptFromPromptId.mockResolvedValue('Request prompt');

    const requestWithPromptIdAndNoPersist = {
      ...mockRequest,
      body: {
        ...mockRequest.body,
        conversationId: undefined,
        persist: false,
        promptId: 'test-prompt-id',
      },
    };

    const mockRouter = {
      versioned: {
        post: vi.fn().mockImplementation(() => {
          return {
            addVersion: vi.fn().mockImplementation(async (_, handler) => {
              await handler(mockContext, requestWithPromptIdAndNoPersist, mockResponse);

              expect(mockLangChainExecute).toHaveBeenCalledWith(
                expect.objectContaining({
                  systemPrompt: 'Request prompt',
                })
              );
            }),
          };
        }),
      },
    };

    await chatCompleteRoute(
      mockRouter as unknown as IRouter<ElasticAssistantRequestHandlerContext>
    );
  });

  it('returns the expected error when executeCustomLlmChain fails', async () => {
    const requestWithBadConnectorId = {
      ...mockRequest,
      body: {
        ...mockRequest.body,
        connectorId: 'bad-connector-id',
      },
    };

    const mockRouter = {
      versioned: {
        post: vi.fn().mockImplementation(() => {
          return {
            addVersion: vi.fn().mockImplementation(async (_, handler) => {
              const result = await handler(mockContext, requestWithBadConnectorId, mockResponse);

              expect(result).toEqual({
                body: 'simulated error',
                statusCode: 500,
              });
            }),
          };
        }),
      },
    };

    await chatCompleteRoute(
      mockRouter as unknown as IRouter<ElasticAssistantRequestHandlerContext>
    );
  });

  it('reports error events to telemetry - kb on, RAG alerts off', async () => {
    const requestWithBadConnectorId = {
      ...mockRequest,
      body: {
        ...mockRequest.body,
        connectorId: 'bad-connector-id',
      },
    };

    const mockRouter = {
      versioned: {
        post: vi.fn().mockImplementation(() => {
          return {
            addVersion: vi.fn().mockImplementation(async (_, handler) => {
              await handler(mockContext, requestWithBadConnectorId, mockResponse);

              expect(reportEvent).toHaveBeenCalledWith(INVOKE_ASSISTANT_ERROR_EVENT.eventType, {
                errorMessage: 'simulated error',
                errorLocation: 'chatCompleteRoute',
                actionTypeId: '.inference',
                model: 'gpt-4',
                assistantStreamingEnabled: false,
                isEnabledKnowledgeBase: false,
              });
            }),
          };
        }),
      },
    };

    await chatCompleteRoute(
      mockRouter as unknown as IRouter<ElasticAssistantRequestHandlerContext>
    );
  });

  it('Adds error to conversation history', async () => {
    const badRequest = {
      ...mockRequest,
      body: {
        ...mockRequest.body,
        conversationId: undefined,
        connectorId: 'bad-connector-id',
      },
    };

    const mockRouter = {
      versioned: {
        post: vi.fn().mockImplementation(() => {
          return {
            addVersion: vi.fn().mockImplementation(async (_, handler) => {
              await handler(mockContext, badRequest, mockResponse);
              expect(mockAppendAssistantMessageToConversation).toHaveBeenCalledWith(
                expect.objectContaining({
                  messageContent: 'simulated error',
                  isError: true,
                })
              );
            }),
          };
        }),
      },
    };

    await chatCompleteRoute(
      mockRouter as unknown as IRouter<ElasticAssistantRequestHandlerContext>
    );
  });

  it('returns the expected response when isStream=true and actionTypeId=.gen-ai', async () => {
    const mockRouter = {
      versioned: {
        post: vi.fn().mockImplementation(() => {
          return {
            addVersion: vi.fn().mockImplementation(async (_, handler) => {
              const result = await handler(
                mockContext,
                {
                  ...mockRequest,
                  body: {
                    ...mockRequest.body,
                    isStream: true,
                  },
                },
                mockResponse
              );

              expect(result).toEqual(mockStream);
            }),
          };
        }),
      },
    };

    await chatCompleteRoute(
      mockRouter as unknown as IRouter<ElasticAssistantRequestHandlerContext>
    );
  });

  it('returns the expected response when isStream=true and actionTypeId=.bedrock', async () => {
    const mockRouter = {
      versioned: {
        post: vi.fn().mockImplementation(() => {
          return {
            addVersion: vi.fn().mockImplementation(async (_, handler) => {
              const result = await handler(
                mockContext,
                {
                  ...mockRequest,
                  body: {
                    ...mockRequest.body,
                    isStream: true,
                  },
                },
                mockResponse
              );

              expect(result).toEqual(mockStream);
            }),
          };
        }),
      },
    };
    await chatCompleteRoute(
      mockRouter as unknown as IRouter<ElasticAssistantRequestHandlerContext>
    );
  });

  it('should add assistant reply to existing conversation when `persist=true`', async () => {
    const mockRouter = {
      versioned: {
        post: vi.fn().mockImplementation(() => {
          return {
            addVersion: vi.fn().mockImplementation(async (_, handler) => {
              await handler(
                mockContext,
                {
                  ...mockRequest,
                  body: {
                    ...mockRequest.body,
                    conversationId: existingConversation.id,
                  },
                },
                mockResponse
              );
              expect(mockAppendAssistantMessageToConversation).toHaveBeenCalledWith(
                expect.objectContaining({
                  messageContent: 'Non-streamed test reply.',
                  isError: false,
                })
              );
              expect(mockCreateConversationWithUserInput).toHaveBeenCalledTimes(0);
            }),
          };
        }),
      },
    };

    chatCompleteRoute(mockRouter as unknown as IRouter<ElasticAssistantRequestHandlerContext>);
  });

  it('should not add assistant reply to existing conversation when `persist=false`', async () => {
    const mockRouter = {
      versioned: {
        post: vi.fn().mockImplementation(() => {
          return {
            addVersion: vi.fn().mockImplementation(async (_, handler) => {
              await handler(
                mockContext,
                {
                  ...mockRequest,
                  body: {
                    ...mockRequest.body,
                    conversationId: existingConversation.id,
                    persist: false,
                  },
                },
                mockResponse
              );
              expect(mockAppendAssistantMessageToConversation).toHaveBeenCalledTimes(0);
              expect(mockCreateConversationWithUserInput).toHaveBeenCalledTimes(0);
            }),
          };
        }),
      },
    };

    chatCompleteRoute(mockRouter as unknown as IRouter<ElasticAssistantRequestHandlerContext>);
  });

  it('should add assistant reply to new conversation when `persist=true`', async () => {
    const mockRouter = {
      versioned: {
        post: vi.fn().mockImplementation(() => {
          return {
            addVersion: vi.fn().mockImplementation(async (_, handler) => {
              await handler(
                mockContext,
                {
                  ...mockRequest,
                  body: {
                    ...mockRequest.body,
                    conversationId: undefined,
                    persist: true,
                  },
                },
                mockResponse
              );
              expect(mockAppendAssistantMessageToConversation).toHaveBeenCalledWith(
                expect.objectContaining({
                  messageContent: 'Non-streamed test reply.',
                  isError: false,
                })
              );
              expect(mockCreateConversationWithUserInput).toHaveBeenCalledTimes(1);
            }),
          };
        }),
      },
    };

    chatCompleteRoute(mockRouter as unknown as IRouter<ElasticAssistantRequestHandlerContext>);
  });

  it('should not create a new conversation when `persist=false`', async () => {
    const mockRouter = {
      versioned: {
        post: vi.fn().mockImplementation(() => {
          return {
            addVersion: vi.fn().mockImplementation(async (_, handler) => {
              await handler(
                mockContext,
                {
                  ...mockRequest,
                  body: {
                    ...mockRequest.body,
                    conversationId: undefined,
                    persist: false,
                  },
                },
                mockResponse
              );
              expect(mockAppendAssistantMessageToConversation).toHaveBeenCalledTimes(0);
              expect(mockCreateConversationWithUserInput).toHaveBeenCalledTimes(0);
            }),
          };
        }),
      },
    };

    chatCompleteRoute(mockRouter as unknown as IRouter<ElasticAssistantRequestHandlerContext>);
  });
});
