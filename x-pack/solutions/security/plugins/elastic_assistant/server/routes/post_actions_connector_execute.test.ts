/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter, KibanaRequest } from '@kbn/core/server';
import { NEVER } from 'rxjs';
import { mockActionResponse } from '../__mocks__/action_result_data';
import { postActionsConnectorExecuteRoute } from './post_actions_connector_execute';
import { ElasticAssistantRequestHandlerContext } from '../types';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { coreMock } from '@kbn/core/server/mocks';
import { INVOKE_ASSISTANT_ERROR_EVENT } from '../lib/telemetry/event_based_telemetry';
import { PassThrough } from 'stream';
import { getConversationResponseMock } from '../ai_assistant_data_clients/conversations/update_conversation.test';
import { actionsClientMock } from '@kbn/actions-plugin/server/actions_client/actions_client.mock';
import { getFindAnonymizationFieldsResultWithSingleHit } from '../__mocks__/response';
import {
  defaultAssistantFeatures,
  ExecuteConnectorRequestBody,
} from '@kbn/elastic-assistant-common';
import { licensingMock } from '@kbn/licensing-plugin/server/mocks';
import { appendAssistantMessageToConversation, langChainExecute } from './helpers';

const license = licensingMock.createLicenseMock();
const actionsClient = actionsClientMock.create();
jest.mock('../lib/build_response', () => ({
  buildResponse: jest.fn().mockImplementation((x) => x),
}));
jest.mock('../lib/executor', () => ({
  executeAction: jest.fn().mockImplementation(async ({ connectorId }) => {
    if (connectorId === 'mock-connector-id') {
      return {
        connector_id: 'mock-connector-id',
        data: mockActionResponse,
        status: 'ok',
      };
    } else {
      throw new Error('simulated error');
    }
  }),
}));
const mockStream = jest.fn().mockImplementation(() => new PassThrough());
const mockLangChainExecute = langChainExecute as jest.Mock;
const mockAppendAssistantMessageToConversation = appendAssistantMessageToConversation as jest.Mock;
jest.mock('./helpers', () => {
  const original = jest.requireActual('./helpers');

  return {
    ...original,
    getIsKnowledgeBaseInstalled: jest.fn(),
    appendAssistantMessageToConversation: jest.fn(),
    langChainExecute: jest.fn(),
    getPluginNameFromRequest: jest.fn(),
    getSystemPromptFromUserConversation: jest.fn(),
  };
});
const existingConversation = getConversationResponseMock();
const reportEvent = jest.fn();
const appendConversationMessages = jest.fn();
const mockContext = {
  resolve: jest.fn().mockResolvedValue({
    elasticAssistant: {
      actions: {
        getActionsClientWithRequest: jest.fn().mockResolvedValue(actionsClient),
      },
      llmTasks: { retrieveDocumentationAvailable: jest.fn(), retrieveDocumentation: jest.fn() },
      getRegisteredTools: jest.fn(() => []),
      getRegisteredFeatures: jest.fn(() => defaultAssistantFeatures),
      logger: loggingSystemMock.createLogger(),
      telemetry: { ...coreMock.createSetup().analytics, reportEvent },
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
      getAIAssistantConversationsDataClient: jest.fn().mockResolvedValue({
        getConversation: jest.fn().mockResolvedValue(existingConversation),
        updateConversation: jest.fn().mockResolvedValue(existingConversation),
        appendConversationMessages:
          appendConversationMessages.mockResolvedValue(existingConversation),
      }),
      getAIAssistantPromptsDataClient: jest.fn().mockResolvedValue({
        findDocuments: jest.fn(),
      }),
      getAIAssistantAnonymizationFieldsDataClient: jest.fn().mockResolvedValue({
        findDocuments: jest.fn().mockResolvedValue(getFindAnonymizationFieldsResultWithSingleHit()),
      }),
      getAIAssistantKnowledgeBaseDataClient: jest.fn().mockResolvedValue({
        getKnowledgeBaseDocuments: jest.fn().mockResolvedValue([]),
        indexTemplateAndPattern: {
          alias: 'knowledge-base-alias',
        },
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
  params: { connectorId: 'mock-connector-id' },
  body: {
    subAction: 'invokeAI',
    message: 'Do you know my name?',
    actionTypeId: '.gen-ai',
    replacements: {},
    model: 'gpt-4',
  },
  events: {
    aborted$: NEVER,
  },
};

const mockResponse = {
  ok: jest.fn().mockImplementation((x) => x),
  error: jest.fn().mockImplementation((x) => x),
};

describe('postActionsConnectorExecuteRoute', () => {
  const mockGetElser = jest.fn().mockResolvedValue('.elser_model_2');

  beforeEach(() => {
    jest.clearAllMocks();
    license.hasAtLeast.mockReturnValue(true);
    mockAppendAssistantMessageToConversation.mockResolvedValue(true);
    mockLangChainExecute.mockImplementation(
      async ({
        connectorId,
        request,
      }: {
        connectorId: string;
        request: KibanaRequest<unknown, unknown, ExecuteConnectorRequestBody>;
      }) => {
        if (request.body.subAction === 'invokeAI' && connectorId === 'mock-connector-id') {
          return {
            body: {
              connector_id: 'mock-connector-id',
              data: mockActionResponse,
              status: 'ok',
            },
            headers: { 'content-type': 'application/json' },
          };
        } else if (request.body.subAction !== 'invokeAI' && connectorId === 'mock-connector-id') {
          return {
            body: mockStream,
            headers: {
              'Cache-Control': 'no-cache',
              Connection: 'keep-alive',
              'Transfer-Encoding': 'chunked',
              'X-Accel-Buffering': 'no',
              'X-Content-Type-Options': 'nosniff',
            },
          };
        } else {
          throw new Error('simulated error');
        }
      }
    );
    actionsClient.getBulk.mockResolvedValue([
      {
        id: '1',
        isPreconfigured: false,
        isSystemAction: false,
        isDeprecated: false,
        name: 'my name',
        actionTypeId: '.gen-ai',
        isMissingSecrets: false,
        config: {
          a: true,
          b: true,
          c: true,
        },
      },
    ]);
  });

  it('returns the expected response', async () => {
    const mockRouter = {
      versioned: {
        post: jest.fn().mockImplementation(() => {
          return {
            addVersion: jest.fn().mockImplementation(async (_, handler) => {
              const result = await handler(mockContext, mockRequest, mockResponse);

              expect(result).toEqual({
                body: {
                  connector_id: 'mock-connector-id',
                  data: mockActionResponse,
                  status: 'ok',
                },
                headers: { 'content-type': 'application/json' },
              });
            }),
          };
        }),
      },
    };

    await postActionsConnectorExecuteRoute(
      mockRouter as unknown as IRouter<ElasticAssistantRequestHandlerContext>,
      mockGetElser
    );
  });

  it('returns the expected error when executeCustomLlmChain fails', async () => {
    const requestWithBadConnectorId = {
      ...mockRequest,
      params: { connectorId: 'bad-connector-id' },
    };

    const mockRouter = {
      versioned: {
        post: jest.fn().mockImplementation(() => {
          return {
            addVersion: jest.fn().mockImplementation(async (_, handler) => {
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

    await postActionsConnectorExecuteRoute(
      mockRouter as unknown as IRouter<ElasticAssistantRequestHandlerContext>,
      mockGetElser
    );
  });

  it('reports error events to telemetry', async () => {
    const badRequest = {
      ...mockRequest,
      params: { connectorId: 'bad-connector-id' },
      body: {
        ...mockRequest.body,
        anonymizationFields: [
          { id: '@timestamp', field: '@timestamp', allowed: true, anonymized: false },
          { id: 'host.name', field: 'host.name', allowed: true, anonymized: true },
        ],
        replacements: [],
      },
    };

    const mockRouter = {
      versioned: {
        post: jest.fn().mockImplementation(() => {
          return {
            addVersion: jest.fn().mockImplementation(async (_, handler) => {
              await handler(mockContext, badRequest, mockResponse);

              expect(reportEvent).toHaveBeenCalledWith(INVOKE_ASSISTANT_ERROR_EVENT.eventType, {
                errorMessage: 'simulated error',
                actionTypeId: '.gen-ai',
                model: 'gpt-4',
                assistantStreamingEnabled: false,
              });
            }),
          };
        }),
      },
    };

    await postActionsConnectorExecuteRoute(
      mockRouter as unknown as IRouter<ElasticAssistantRequestHandlerContext>,
      mockGetElser
    );
  });

  it('Adds error to conversation history', async () => {
    const badRequest = {
      ...mockRequest,
      params: { connectorId: 'bad-connector-id' },
      body: {
        ...mockRequest.body,
        conversationId: '99999',
      },
    };

    const mockRouter = {
      versioned: {
        post: jest.fn().mockImplementation(() => {
          return {
            addVersion: jest.fn().mockImplementation(async (_, handler) => {
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

    await postActionsConnectorExecuteRoute(
      mockRouter as unknown as IRouter<ElasticAssistantRequestHandlerContext>,
      mockGetElser
    );
  });

  it('returns the expected response when subAction=invokeStream and actionTypeId=.gen-ai', async () => {
    const mockRouter = {
      versioned: {
        post: jest.fn().mockImplementation(() => {
          return {
            addVersion: jest.fn().mockImplementation(async (_, handler) => {
              const result = await handler(
                mockContext,
                {
                  ...mockRequest,
                  body: {
                    ...mockRequest.body,
                    subAction: 'invokeStream',
                    actionTypeId: '.gen-ai',
                  },
                },
                mockResponse
              );

              expect(result).toEqual({
                body: mockStream,
                headers: {
                  'Cache-Control': 'no-cache',
                  Connection: 'keep-alive',
                  'Transfer-Encoding': 'chunked',
                  'X-Accel-Buffering': 'no',
                  'X-Content-Type-Options': 'nosniff',
                },
              });
            }),
          };
        }),
      },
    };

    await postActionsConnectorExecuteRoute(
      mockRouter as unknown as IRouter<ElasticAssistantRequestHandlerContext>,
      mockGetElser
    );
  });

  it('returns the expected response when subAction=invokeStream and actionTypeId=.bedrock', async () => {
    const mockRouter = {
      versioned: {
        post: jest.fn().mockImplementation(() => {
          return {
            addVersion: jest.fn().mockImplementation(async (_, handler) => {
              const result = await handler(
                mockContext,
                {
                  ...mockRequest,
                  body: {
                    ...mockRequest.body,
                    subAction: 'invokeStream',
                    actionTypeId: '.bedrock',
                  },
                },
                mockResponse
              );

              expect(result).toEqual({
                body: mockStream,
                headers: {
                  'Cache-Control': 'no-cache',
                  Connection: 'keep-alive',
                  'Transfer-Encoding': 'chunked',
                  'X-Accel-Buffering': 'no',
                  'X-Content-Type-Options': 'nosniff',
                },
              });
            }),
          };
        }),
      },
    };
    await postActionsConnectorExecuteRoute(
      mockRouter as unknown as IRouter<ElasticAssistantRequestHandlerContext>,
      mockGetElser
    );
  });

  it('returns the expected response when subAction=invokeAI and actionTypeId=.gen-ai', async () => {
    const mockRouter = {
      versioned: {
        post: jest.fn().mockImplementation(() => {
          return {
            addVersion: jest.fn().mockImplementation(async (_, handler) => {
              const result = await handler(
                mockContext,
                {
                  ...mockRequest,
                  body: {
                    ...mockRequest.body,
                    subAction: 'invokeAI',
                    actionTypeId: '.gen-ai',
                  },
                },
                mockResponse
              );

              expect(result).toEqual({
                body: { connector_id: 'mock-connector-id', data: mockActionResponse, status: 'ok' },
                headers: {
                  'content-type': 'application/json',
                },
              });
            }),
          };
        }),
      },
    };

    await postActionsConnectorExecuteRoute(
      mockRouter as unknown as IRouter<ElasticAssistantRequestHandlerContext>,
      mockGetElser
    );
  });

  it('returns the expected response when subAction=invokeAI and actionTypeId=.bedrock', async () => {
    const mockRouter = {
      versioned: {
        post: jest.fn().mockImplementation(() => {
          return {
            addVersion: jest.fn().mockImplementation(async (_, handler) => {
              const result = await handler(
                mockContext,
                {
                  ...mockRequest,
                  body: {
                    ...mockRequest.body,
                    subAction: 'invokeAI',
                    actionTypeId: '.bedrock',
                  },
                },
                mockResponse
              );

              expect(result).toEqual({
                body: { connector_id: 'mock-connector-id', data: mockActionResponse, status: 'ok' },
                headers: {
                  'content-type': 'application/json',
                },
              });
            }),
          };
        }),
      },
    };
    await postActionsConnectorExecuteRoute(
      mockRouter as unknown as IRouter<ElasticAssistantRequestHandlerContext>,
      mockGetElser
    );
  });
});
