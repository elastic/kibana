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
import type { FtrProviderContext } from '../../common/ftr_provider_context';
import type { SupertestReturnType } from '../../common/observability_ai_assistant_api_client';

export default function ApiTest({ getService }: FtrProviderContext) {
  const observabilityAIAssistantAPIClient = getService('observabilityAIAssistantAPIClient');

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

  describe('Conversations', () => {
    describe('without conversations', () => {
      it('returns no conversations when listing', async () => {
        const response = await observabilityAIAssistantAPIClient
          .editorUser({
            endpoint: 'POST /internal/observability_ai_assistant/conversations',
          })
          .expect(200);

        expect(response.body).to.eql({ conversations: [] });
      });

      it('returns a 404 for updating conversations', async () => {
        await observabilityAIAssistantAPIClient
          .editorUser({
            endpoint: 'PUT /internal/observability_ai_assistant/conversation/{conversationId}',
            params: {
              path: {
                conversationId: 'non-existing-conversation-id',
              },
              body: {
                conversation: conversationUpdate,
              },
            },
          })
          .expect(404);
      });

      it('returns a 404 for retrieving a conversation', async () => {
        await observabilityAIAssistantAPIClient
          .editorUser({
            endpoint: 'GET /internal/observability_ai_assistant/conversation/{conversationId}',
            params: {
              path: {
                conversationId: 'my-conversation-id',
              },
            },
          })
          .expect(404);
      });
    });

    describe('when creating a conversation with the write user', () => {
      let createResponse: Awaited<
        SupertestReturnType<'POST /internal/observability_ai_assistant/conversation'>
      >;
      before(async () => {
        createResponse = await observabilityAIAssistantAPIClient
          .editorUser({
            endpoint: 'POST /internal/observability_ai_assistant/conversation',
            params: {
              body: {
                conversation: conversationCreate,
              },
            },
          })
          .expect(200);
      });

      after(async () => {
        await observabilityAIAssistantAPIClient
          .editorUser({
            endpoint: 'DELETE /internal/observability_ai_assistant/conversation/{conversationId}',
            params: {
              path: {
                conversationId: createResponse.body.conversation.id,
              },
            },
          })
          .expect(200);

        await observabilityAIAssistantAPIClient
          .editorUser({
            endpoint: 'GET /internal/observability_ai_assistant/conversation/{conversationId}',
            params: {
              path: {
                conversationId: createResponse.body.conversation.id,
              },
            },
          })
          .expect(404);
      });

      it('returns the conversation', () => {
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
          user: {
            name: 'editor',
          },
        });
      });

      it('returns a 404 for updating a non-existing conversation', async () => {
        await observabilityAIAssistantAPIClient
          .editorUser({
            endpoint: 'PUT /internal/observability_ai_assistant/conversation/{conversationId}',
            params: {
              path: {
                conversationId: 'non-existing-conversation-id',
              },
              body: {
                conversation: conversationUpdate,
              },
            },
          })
          .expect(404);
      });

      it('returns a 404 for retrieving a non-existing conversation', async () => {
        await observabilityAIAssistantAPIClient
          .editorUser({
            endpoint: 'GET /internal/observability_ai_assistant/conversation/{conversationId}',
            params: {
              path: {
                conversationId: 'non-existing-conversation-id',
              },
            },
          })
          .expect(404);
      });

      it('returns the conversation that was created', async () => {
        const response = await observabilityAIAssistantAPIClient
          .editorUser({
            endpoint: 'GET /internal/observability_ai_assistant/conversation/{conversationId}',
            params: {
              path: {
                conversationId: createResponse.body.conversation.id,
              },
            },
          })
          .expect(200);

        expect(response.body).to.eql(createResponse.body);
      });

      it('returns the created conversation when listing', async () => {
        const response = await observabilityAIAssistantAPIClient
          .editorUser({
            endpoint: 'POST /internal/observability_ai_assistant/conversations',
          })
          .expect(200);

        expect(response.body.conversations[0]).to.eql(createResponse.body);
      });

      // TODO
      it.skip('returns a 404 when reading it with another user', () => {});

      describe('after updating', () => {
        let updateResponse: Awaited<
          SupertestReturnType<'PUT /internal/observability_ai_assistant/conversation/{conversationId}'>
        >;

        before(async () => {
          updateResponse = await observabilityAIAssistantAPIClient
            .editorUser({
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
            })
            .expect(200);
        });

        it('returns the updated conversation as response', async () => {
          expect(updateResponse.body.conversation.title).to.eql(
            conversationUpdate.conversation.title
          );
        });

        it('returns the updated conversation after get', async () => {
          const updateAfterCreateResponse = await observabilityAIAssistantAPIClient
            .editorUser({
              endpoint: 'GET /internal/observability_ai_assistant/conversation/{conversationId}',
              params: {
                path: {
                  conversationId: createResponse.body.conversation.id,
                },
              },
            })
            .expect(200);

          expect(updateAfterCreateResponse.body.conversation.title).to.eql(
            conversationUpdate.conversation.title
          );
        });
      });
    });
  });
}
