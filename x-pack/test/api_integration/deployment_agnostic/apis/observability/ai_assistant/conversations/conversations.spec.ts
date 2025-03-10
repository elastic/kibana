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
  Conversation,
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
    systemMessage: 'this is a system message',
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
          systemMessage: conversationCreate.systemMessage,
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

    describe('when creating private and public conversations', () => {
      before(async () => {
        const promises = [
          {
            username: 'editor' as const,
            isPublic: true,
          },
          {
            username: 'editor' as const,
            isPublic: false,
          },
          {
            username: 'admin' as const,
            isPublic: true,
          },
          {
            username: 'admin' as const,
            isPublic: false,
          },
        ].map(async ({ username, isPublic }) => {
          const { status } = await observabilityAIAssistantAPIClient[username]({
            endpoint: 'POST /internal/observability_ai_assistant/conversation',
            params: {
              body: {
                conversation: {
                  ...conversationCreate,
                  public: isPublic,
                },
              },
            },
          });

          expect(status).to.be(200);
        });

        await Promise.all(promises);
      });

      after(async () => {
        async function deleteConversations(username: 'editor' | 'admin') {
          const response = await observabilityAIAssistantAPIClient[username]({
            endpoint: 'POST /internal/observability_ai_assistant/conversations',
          });

          for (const conversation of response.body.conversations) {
            await observabilityAIAssistantAPIClient[username]({
              endpoint: `DELETE /internal/observability_ai_assistant/conversation/{conversationId}`,
              params: {
                path: {
                  conversationId: conversation.conversation.id,
                },
              },
            });
          }
        }

        await deleteConversations('editor');
        await deleteConversations('admin');
      });

      it('user_1 can retrieve their own private and public conversations', async () => {
        const { status, body } = await observabilityAIAssistantAPIClient.editor({
          endpoint: 'POST /internal/observability_ai_assistant/conversations',
        });

        expect(status).to.be(200);
        expect(body.conversations).to.have.length(3);
        expect(body.conversations.filter((conversation) => !conversation.public)).to.have.length(1);
        expect(body.conversations.filter((conversation) => conversation.public)).to.have.length(2);
      });

      it('user_2 can retrieve their own private and public conversations', async () => {
        const { status, body } = await observabilityAIAssistantAPIClient.admin({
          endpoint: 'POST /internal/observability_ai_assistant/conversations',
        });

        expect(status).to.be(200);
        expect(body.conversations).to.have.length(3);
        expect(body.conversations.filter((conversation) => !conversation.public)).to.have.length(1);
        expect(body.conversations.filter((conversation) => conversation.public)).to.have.length(2);
      });
    });

    describe('public conversation ownership checks', () => {
      let createdConversationId: string;

      before(async () => {
        const { status, body } = await observabilityAIAssistantAPIClient.editor({
          endpoint: 'POST /internal/observability_ai_assistant/conversation',
          params: {
            body: {
              conversation: {
                ...conversationCreate,
                public: true,
              },
            },
          },
        });
        expect(status).to.be(200);

        createdConversationId = body.conversation.id;
      });

      after(async () => {
        const { status } = await observabilityAIAssistantAPIClient.editor({
          endpoint: 'DELETE /internal/observability_ai_assistant/conversation/{conversationId}',
          params: {
            path: { conversationId: createdConversationId },
          },
        });
        expect(status).to.be(200);
      });

      it('allows the owner (editor) to update their public conversation', async () => {
        const updateRequest = {
          ...conversationUpdate,
          conversation: {
            ...conversationUpdate.conversation,
            id: createdConversationId,
            title: 'Public conversation updated by owner',
          },
        };

        const updateResponse = await observabilityAIAssistantAPIClient.editor({
          endpoint: 'PUT /internal/observability_ai_assistant/conversation/{conversationId}',
          params: {
            path: { conversationId: createdConversationId },
            body: { conversation: updateRequest },
          },
        });
        expect(updateResponse.status).to.be(200);
        expect(updateResponse.body.conversation.title).to.eql(
          'Public conversation updated by owner'
        );
      });

      it('does not allow a different user (admin) to update the same public conversation', async () => {
        const updateRequest = {
          ...conversationUpdate,
          conversation: {
            ...conversationUpdate.conversation,
            id: createdConversationId,
            title: 'Trying to update by a different user',
          },
        };

        const updateResponse = await observabilityAIAssistantAPIClient.admin({
          endpoint: 'PUT /internal/observability_ai_assistant/conversation/{conversationId}',
          params: {
            path: { conversationId: createdConversationId },
            body: { conversation: updateRequest },
          },
        });

        expect(updateResponse.status).to.be(404);
      });
    });

    describe('conversation duplication', () => {
      let publicConversation: Conversation;
      let privateConversation: Conversation;

      before(async () => {
        const publicCreateResp = await observabilityAIAssistantAPIClient.editor({
          endpoint: 'POST /internal/observability_ai_assistant/conversation',
          params: {
            body: {
              conversation: {
                ...conversationCreate,
                public: true,
                conversation: {
                  ...conversationCreate.conversation,
                  title: 'Public conversation',
                },
              },
            },
          },
        });
        expect(publicCreateResp.status).to.be(200);
        publicConversation = publicCreateResp.body;

        const privateCreateResp = await observabilityAIAssistantAPIClient.editor({
          endpoint: 'POST /internal/observability_ai_assistant/conversation',
          params: {
            body: {
              conversation: {
                ...conversationCreate,
                public: false,
                conversation: {
                  ...conversationCreate.conversation,
                  title: 'Private conversation',
                },
              },
            },
          },
        });
        expect(privateCreateResp.status).to.be(200);
        privateConversation = privateCreateResp.body;
      });

      after(async () => {
        for (const conversation of [publicConversation, privateConversation]) {
          const { status } = await observabilityAIAssistantAPIClient.editor({
            endpoint: 'DELETE /internal/observability_ai_assistant/conversation/{conversationId}',
            params: { path: { conversationId: conversation.conversation.id } },
          });
          expect(status).to.be(200);
        }
      });

      describe('allows the owner to duplicate their own private conversation', () => {
        let duplicatedConversation: Conversation;
        before(async () => {
          const duplicateResponse = await observabilityAIAssistantAPIClient.editor({
            endpoint:
              'POST /internal/observability_ai_assistant/conversation/{conversationId}/duplicate',
            params: {
              path: { conversationId: privateConversation.conversation.id },
            },
          });
          expect(duplicateResponse.status).to.be(200);

          duplicatedConversation = duplicateResponse.body;
        });

        after(async () => {
          // cleanup
          const { status } = await observabilityAIAssistantAPIClient.editor({
            endpoint: 'DELETE /internal/observability_ai_assistant/conversation/{conversationId}',
            params: { path: { conversationId: duplicatedConversation.conversation.id } },
          });
          expect(status).to.be(200);
        });

        it('it should not be the same id', () => {
          expect(duplicatedConversation.conversation.id).not.to.eql(
            privateConversation.conversation.id
          );
        });

        it('it should be the same user', () => {
          expect(duplicatedConversation.user?.name).to.eql(publicConversation.user?.name);
        });
      });

      describe('allows the owner to duplicate their own public conversation', () => {
        let duplicatedConversation: Conversation;
        before(async () => {
          const duplicateResponse = await observabilityAIAssistantAPIClient.editor({
            endpoint:
              'POST /internal/observability_ai_assistant/conversation/{conversationId}/duplicate',
            params: {
              path: { conversationId: publicConversation.conversation.id },
            },
          });
          expect(duplicateResponse.status).to.be(200);

          duplicatedConversation = duplicateResponse.body;
        });

        after(async () => {
          // cleanup
          const { status } = await observabilityAIAssistantAPIClient.editor({
            endpoint: 'DELETE /internal/observability_ai_assistant/conversation/{conversationId}',
            params: { path: { conversationId: duplicatedConversation.conversation.id } },
          });
          expect(status).to.be(200);
        });

        it('it should not be the same id', () => {
          expect(duplicatedConversation.conversation.id).not.to.eql(
            publicConversation.conversation.id
          );
        });

        it('it should be the same user', () => {
          expect(duplicatedConversation.user?.name).to.eql(publicConversation.user?.name);
        });
      });

      describe('allows another user to duplicate a public conversation, making them the new owner', () => {
        let duplicatedConversation: Conversation;
        before(async () => {
          const duplicateResponse = await observabilityAIAssistantAPIClient.admin({
            endpoint:
              'POST /internal/observability_ai_assistant/conversation/{conversationId}/duplicate',
            params: {
              path: { conversationId: publicConversation.conversation.id },
            },
          });
          expect(duplicateResponse.status).to.be(200);

          duplicatedConversation = duplicateResponse.body;
        });

        after(async () => {
          // cleanup
          const { status } = await observabilityAIAssistantAPIClient.admin({
            endpoint: 'DELETE /internal/observability_ai_assistant/conversation/{conversationId}',
            params: { path: { conversationId: duplicatedConversation.conversation.id } },
          });
          expect(status).to.be(200);
        });

        it('it should not be the same id', () => {
          expect(duplicatedConversation.conversation.id).not.to.eql(
            publicConversation.conversation.id
          );
        });

        it('it should not be the same user', () => {
          expect(duplicatedConversation.user?.name).to.not.eql(publicConversation.user?.name);
        });
      });

      it('does not allow another user to duplicate a private conversation', async () => {
        const duplicateResponse = await observabilityAIAssistantAPIClient.admin({
          endpoint:
            'POST /internal/observability_ai_assistant/conversation/{conversationId}/duplicate',
          params: {
            path: { conversationId: privateConversation.conversation.id },
          },
        });
        expect(duplicateResponse.status).to.be(404);
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
