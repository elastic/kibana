/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core/server';
import { NEVER } from 'rxjs';
import { mockActionResponse } from '../../__mocks__/action_result_data';
import { ElasticAssistantRequestHandlerContext } from '../../types';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { coreMock } from '@kbn/core/server/mocks';
import { INVOKE_ASSISTANT_ERROR_EVENT } from '../../lib/telemetry/event_based_telemetry';
import { PassThrough } from 'stream';
import { getConversationResponseMock } from '../../ai_assistant_data_clients/conversations/update_conversation.test';
import { actionsClientMock } from '@kbn/actions-plugin/server/actions_client/actions_client.mock';
import { getFindAnonymizationFieldsResultWithSingleHit } from '../../__mocks__/response';
import { defaultAssistantFeatures } from '@kbn/elastic-assistant-common';
import { chatCompleteRoute } from './chat_complete_route';
import { licensingMock } from '@kbn/licensing-plugin/server/mocks';
import {
  appendAssistantMessageToConversation,
  createConversationWithUserInput,
  langChainExecute,
} from '../helpers';

const license = licensingMock.createLicenseMock();

const actionsClient = actionsClientMock.create();
jest.mock('../../lib/build_response', () => ({
  buildResponse: jest.fn().mockImplementation((x) => x),
}));

jest.mock('../helpers', () => {
  const original = jest.requireActual('../helpers');

  return {
    ...original,
    appendAssistantMessageToConversation: jest.fn(),
    createConversationWithUserInput: jest.fn(),
    langChainExecute: jest.fn(),
  };
});
const mockAppendAssistantMessageToConversation = appendAssistantMessageToConversation as jest.Mock;

const mockLangChainExecute = langChainExecute as jest.Mock;
const mockStream = jest.fn().mockImplementation(() => new PassThrough());

const existingConversation = getConversationResponseMock();
const reportEvent = jest.fn();
const appendConversationMessages = jest.fn();
const mockContext = {
  resolve: jest.fn().mockResolvedValue({
    elasticAssistant: {
      actions: {
        getActionsClientWithRequest: jest.fn().mockResolvedValue(actionsClient),
      },
      getRegisteredTools: jest.fn(() => []),
      getRegisteredFeatures: jest.fn(() => defaultAssistantFeatures),
      logger: loggingSystemMock.createLogger(),
      telemetry: { ...coreMock.createSetup().analytics, reportEvent },
      llmTasks: { retrieveDocumentationAvailable: jest.fn(), retrieveDocumentation: jest.fn() },
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
        createConversation: jest.fn().mockResolvedValue(existingConversation),
        appendConversationMessages:
          appendConversationMessages.mockResolvedValue(existingConversation),
      }),
      getAIAssistantKnowledgeBaseDataClient: jest.fn().mockResolvedValue({
        getKnowledgeBaseDocuments: jest.fn().mockResolvedValue([]),
        indexTemplateAndPattern: {
          alias: 'knowledge-base-alias',
        },
        isInferenceEndpointExists: jest.fn().mockResolvedValue(true),
      }),
      getAIAssistantAnonymizationFieldsDataClient: jest.fn().mockResolvedValue({
        findDocuments: jest.fn().mockResolvedValue(getFindAnonymizationFieldsResultWithSingleHit()),
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
};

const mockResponse = {
  ok: jest.fn().mockImplementation((x) => x),
  error: jest.fn().mockImplementation((x) => x),
};

describe('chatCompleteRoute', () => {
  const mockGetElser = jest.fn().mockResolvedValue('.elser_model_2');

  beforeEach(() => {
    jest.clearAllMocks();
    mockAppendAssistantMessageToConversation.mockResolvedValue(true);
    license.hasAtLeast.mockReturnValue(true);
    (createConversationWithUserInput as jest.Mock).mockResolvedValue({ id: 'something' });
    mockLangChainExecute.mockImplementation(
      async ({
        connectorId,
        isStream,
        onLlmResponse,
      }: {
        connectorId: string;
        isStream: boolean;
        onLlmResponse: (
          content: string,
          replacements: Record<string, string>,
          isError: boolean
        ) => Promise<void>;
      }) => {
        if (!isStream && connectorId === 'mock-connector-id') {
          return {
            connector_id: 'mock-connector-id',
            data: mockActionResponse,
            status: 'ok',
          };
        } else if (isStream && connectorId === 'mock-connector-id') {
          return mockStream;
        } else {
          onLlmResponse('simulated error', {}, true).catch(() => {});
          throw new Error('simulated error');
        }
      }
    );
    actionsClient.execute.mockImplementation(
      jest.fn().mockResolvedValue(() => ({
        data: 'mockChatCompletion',
        status: 'ok',
      }))
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

  it('returns the expected response when using the existingConversation', async () => {
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

    chatCompleteRoute(
      mockRouter as unknown as IRouter<ElasticAssistantRequestHandlerContext>,
      mockGetElser
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

    await chatCompleteRoute(
      mockRouter as unknown as IRouter<ElasticAssistantRequestHandlerContext>,
      mockGetElser
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
        post: jest.fn().mockImplementation(() => {
          return {
            addVersion: jest.fn().mockImplementation(async (_, handler) => {
              await handler(mockContext, requestWithBadConnectorId, mockResponse);

              expect(reportEvent).toHaveBeenCalledWith(INVOKE_ASSISTANT_ERROR_EVENT.eventType, {
                errorMessage: 'simulated error',
                actionTypeId: '.gen-ai',
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
      mockRouter as unknown as IRouter<ElasticAssistantRequestHandlerContext>,
      mockGetElser
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

    await chatCompleteRoute(
      mockRouter as unknown as IRouter<ElasticAssistantRequestHandlerContext>,
      mockGetElser
    );
  });

  it('returns the expected response when isStream=true and actionTypeId=.gen-ai', async () => {
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
      mockRouter as unknown as IRouter<ElasticAssistantRequestHandlerContext>,
      mockGetElser
    );
  });

  it('returns the expected response when isStream=true and actionTypeId=.bedrock', async () => {
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
      mockRouter as unknown as IRouter<ElasticAssistantRequestHandlerContext>,
      mockGetElser
    );
  });
});
