/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { merge, omit } from 'lodash';
import {
  type ConversationCreateRequest,
  type ConversationUpdateRequest,
  MessageRole,
} from '@kbn/observability-ai-assistant-plugin/common/types';
import type { SupertestReturnType } from '../../../../services/observability_ai_assistant_api';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const observabilityAIAssistantAPIClient = getService('observabilityAIAssistantApi');

  const conversationCreate: ConversationCreateRequest = {
    '@timestamp': new Date().toISOString(),
    conversation: {
      title: 'My title',
    },
    labels: {},
    numeric_labels: {},
    messages: [
      {
        '@timestamp': new Date().toISOString(),
        message: {
          role: MessageRole.User,
          content: 'My message',
        },
      },
    ],
    public: false,
  };

  const conversationUpdate: ConversationUpdateRequest = merge({}, conversationCreate, {
    conversation: {
      id: '<conversationCreate.id>',
      title: 'My updated title',
    },
  });

  describe('Conversations', function () {
    describe('without conversations', () => {
      it('returns no conversations when listing', async () => {
        const { status, body } = await observabilityAIAssistantAPIClient.editor({
          endpoint: 'POST /internal/observability_ai_assistant/conversations',
        });

        expect(status).to.be(200);

        expect(body).to.eql({ conversations: [] });
      });

      it('returns a 404 for updating conversations', async () => {
        const { status } = await observabilityAIAssistantAPIClient.editor({
          endpoint: 'PUT /internal/observability_ai_assistant/conversation/{conversationId}',
          params: {
            path: {
              conversationId: 'non-existing-conversation-id',
            },
            body: {
              conversation: conversationUpdate,
            },
          },
        });
        expect(status).to.be(404);
      });

      it('returns a 404 for retrieving a conversation', async () => {
        const { status } = await observabilityAIAssistantAPIClient.editor({
          endpoint: 'GET /internal/observability_ai_assistant/conversation/{conversationId}',
          params: {
            path: {
              conversationId: 'my-conversation-id',
            },
          },
        });
        expect(status).to.be(404);
      });
    });

    describe('when creating a conversation with the write user', () => {
      let createResponse: Awaited<
        SupertestReturnType<'POST /internal/observability_ai_assistant/conversation'>
      >;
      before(async () => {
        createResponse = await observabilityAIAssistantAPIClient.editor({
          endpoint: 'POST /internal/observability_ai_assistant/conversation',
          params: {
            body: {
              conversation: conversationCreate,
            },
          },
        });
        expect(createResponse.status).to.be(200);
      });

      after(async () => {
        const { status } = await observabilityAIAssistantAPIClient.editor({
          endpoint: 'DELETE /internal/observability_ai_assistant/conversation/{conversationId}',
          params: {
            path: {
              conversationId: createResponse.body.conversation.id,
            },
          },
        });
        expect(status).to.be(200);

        const res = await observabilityAIAssistantAPIClient.editor({
          endpoint: 'GET /internal/observability_ai_assistant/conversation/{conversationId}',
          params: {
            path: {
              conversationId: createResponse.body.conversation.id,
            },
          },
        });
        expect(res.status).to.be(404);
      });

      it('returns the conversation', () => {
        // delete user from response to avoid comparing it as it will be different in MKI
        delete createResponse.body.user;

        expect(createResponse.body).to.eql({
          '@timestamp': createResponse.body['@timestamp'],
          conversation: {
            id: createResponse.body.conversation.id,
            last_updated: createResponse.body.conversation.last_updated,
            title: conversationCreate.conversation.title,
          },
          labels: conversationCreate.labels,
          numeric_labels: conversationCreate.numeric_labels,
          messages: conversationCreate.messages,
          namespace: 'default',
          public: conversationCreate.public,
        });
      });

      it('returns a 404 for updating a non-existing conversation', async () => {
        const { status } = await observabilityAIAssistantAPIClient.editor({
          endpoint: 'PUT /internal/observability_ai_assistant/conversation/{conversationId}',
          params: {
            path: {
              conversationId: 'non-existing-conversation-id',
            },
            body: {
              conversation: conversationUpdate,
            },
          },
        });
        expect(status).to.be(404);
      });

      it('returns a 404 for retrieving a non-existing conversation', async () => {
        const { status } = await observabilityAIAssistantAPIClient.editor({
          endpoint: 'GET /internal/observability_ai_assistant/conversation/{conversationId}',
          params: {
            path: {
              conversationId: 'non-existing-conversation-id',
            },
          },
        });
        expect(status).to.be(404);
      });

      it('returns the conversation that was created', async () => {
        const response = await observabilityAIAssistantAPIClient.editor({
          endpoint: 'GET /internal/observability_ai_assistant/conversation/{conversationId}',
          params: {
            path: {
              conversationId: createResponse.body.conversation.id,
            },
          },
        });

        expect(response.status).to.be(200);

        // delete user from response to avoid comparing it as it will be different in MKI
        delete response.body.user;
        expect(response.body).to.eql(createResponse.body);
      });

      it('returns the created conversation when listing', async () => {
        const response = await observabilityAIAssistantAPIClient.editor({
          endpoint: 'POST /internal/observability_ai_assistant/conversations',
        });

        expect(response.status).to.be(200);

        // delete user from response to avoid comparing it as it will be different in MKI
        delete response.body.conversations[0].user;
        expect(response.body.conversations[0]).to.eql(createResponse.body);
      });

      // TODO
      it.skip('returns a 404 when reading it with another user', () => {});

      describe('after updating', () => {
        let updateResponse: Awaited<
          SupertestReturnType<'PUT /internal/observability_ai_assistant/conversation/{conversationId}'>
        >;

        before(async () => {
          updateResponse = await observabilityAIAssistantAPIClient.editor({
            endpoint: 'PUT /internal/observability_ai_assistant/conversation/{conversationId}',
            params: {
              path: {
                conversationId: createResponse.body.conversation.id,
              },
              body: {
                conversation: merge(omit(conversationUpdate, 'conversation.id'), {
                  conversation: { id: createResponse.body.conversation.id },
                }),
              },
            },
          });
          expect(updateResponse.status).to.be(200);
        });

        it('returns the updated conversation as response', async () => {
          expect(updateResponse.body.conversation.title).to.eql(
            conversationUpdate.conversation.title
          );
        });

        it('returns the updated conversation after get', async () => {
          const updateAfterCreateResponse = await observabilityAIAssistantAPIClient.editor({
            endpoint: 'GET /internal/observability_ai_assistant/conversation/{conversationId}',
            params: {
              path: {
                conversationId: createResponse.body.conversation.id,
              },
            },
          });

          expect(updateAfterCreateResponse.status).to.be(200);

          expect(updateAfterCreateResponse.body.conversation.title).to.eql(
            conversationUpdate.conversation.title
          );
        });
      });
    });

    describe('security roles and access privileges', () => {
      describe('should deny access for users without the ai_assistant privilege', () => {
        let createResponse: Awaited<
          SupertestReturnType<'POST /internal/observability_ai_assistant/conversation'>
        >;
        before(async () => {
          createResponse = await observabilityAIAssistantAPIClient.editor({
            endpoint: 'POST /internal/observability_ai_assistant/conversation',
            params: {
              body: {
                conversation: conversationCreate,
              },
            },
          });
          expect(createResponse.status).to.be(200);
        });

        after(async () => {
          const response = await observabilityAIAssistantAPIClient.editor({
            endpoint: 'DELETE /internal/observability_ai_assistant/conversation/{conversationId}',
            params: {
              path: {
                conversationId: createResponse.body.conversation.id,
              },
            },
          });
          expect(response.status).to.be(200);
        });

        it('POST /internal/observability_ai_assistant/conversation', async () => {
          const { status } = await observabilityAIAssistantAPIClient.viewer({
            endpoint: 'POST /internal/observability_ai_assistant/conversation',
            params: {
              body: {
                conversation: conversationCreate,
              },
            },
          });

          expect(status).to.be(403);
        });

        it('POST /internal/observability_ai_assistant/conversations', async () => {
          const { status } = await observabilityAIAssistantAPIClient.viewer({
            endpoint: 'POST /internal/observability_ai_assistant/conversations',
          });
          expect(status).to.be(403);
        });

        it('PUT /internal/observability_ai_assistant/conversation/{conversationId}', async () => {
          const { status } = await observabilityAIAssistantAPIClient.viewer({
            endpoint: 'PUT /internal/observability_ai_assistant/conversation/{conversationId}',
            params: {
              path: {
                conversationId: createResponse.body.conversation.id,
              },
              body: {
                conversation: merge(omit(conversationUpdate, 'conversation.id'), {
                  conversation: { id: createResponse.body.conversation.id },
                }),
              },
            },
          });
          expect(status).to.be(403);
        });

        it('GET /internal/observability_ai_assistant/conversation/{conversationId}', async () => {
          const { status } = await observabilityAIAssistantAPIClient.viewer({
            endpoint: 'GET /internal/observability_ai_assistant/conversation/{conversationId}',
            params: {
              path: {
                conversationId: createResponse.body.conversation.id,
              },
            },
          });
          expect(status).to.be(403);
        });

        it('DELETE /internal/observability_ai_assistant/conversation/{conversationId}', async () => {
          const { status } = await observabilityAIAssistantAPIClient.viewer({
            endpoint: 'DELETE /internal/observability_ai_assistant/conversation/{conversationId}',
            params: {
              path: {
                conversationId: createResponse.body.conversation.id,
              },
            },
          });
          expect(status).to.be(403);
        });
      });
    });
  });
}
