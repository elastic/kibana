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
import type { InternalRequestHeader, RoleCredentials } from '../../../../../../shared/services';

export default function ApiTest({ getService }: FtrProviderContext) {
  const observabilityAIAssistantAPIClient = getService('observabilityAIAssistantAPIClient');
  const svlUserManager = getService('svlUserManager');
  const svlCommonApi = getService('svlCommonApi');

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
    let roleAuthc: RoleCredentials;
    let internalReqHeader: InternalRequestHeader;
    before(async () => {
      roleAuthc = await svlUserManager.createM2mApiKeyWithRoleScope('editor');
      internalReqHeader = svlCommonApi.getInternalRequestHeader();
    });
    after(async () => {
      await svlUserManager.invalidateM2mApiKeyWithRoleScope(roleAuthc);
    });
    describe('without conversations', () => {
      it('returns no conversations when listing', async () => {
        const response = await observabilityAIAssistantAPIClient
          .slsUser({
            endpoint: 'POST /internal/observability_ai_assistant/conversations',
            internalReqHeader,
            roleAuthc,
          })
          .expect(200);

        expect(response.body).to.eql({ conversations: [] });
      });

      it('returns a 404 for updating conversations', async () => {
        await observabilityAIAssistantAPIClient
          .slsUser({
            endpoint: 'PUT /internal/observability_ai_assistant/conversation/{conversationId}',
            internalReqHeader,
            roleAuthc,
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
          .slsUser({
            endpoint: 'GET /internal/observability_ai_assistant/conversation/{conversationId}',
            internalReqHeader,
            roleAuthc,
            params: {
              path: {
                conversationId: 'my-conversation-id',
              },
            },
          })
          .expect(404);
      });
    });

    describe('when creating a conversation with the write user', function () {
      let createResponse: Awaited<
        SupertestReturnType<'POST /internal/observability_ai_assistant/conversation'>
      >;
      before(async () => {
        createResponse = await observabilityAIAssistantAPIClient
          .slsUser({
            endpoint: 'POST /internal/observability_ai_assistant/conversation',
            roleAuthc,
            internalReqHeader,
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
          .slsUser({
            endpoint: 'DELETE /internal/observability_ai_assistant/conversation/{conversationId}',
            internalReqHeader,
            roleAuthc,
            params: {
              path: {
                conversationId: createResponse.body.conversation.id,
              },
            },
          })
          .expect(200);

        await observabilityAIAssistantAPIClient
          .slsUser({
            endpoint: 'GET /internal/observability_ai_assistant/conversation/{conversationId}',
            internalReqHeader,
            roleAuthc,
            params: {
              path: {
                conversationId: createResponse.body.conversation.id,
              },
            },
          })
          .expect(404);
      });
      it('returns the conversation', function () {
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
        await observabilityAIAssistantAPIClient
          .slsUser({
            endpoint: 'PUT /internal/observability_ai_assistant/conversation/{conversationId}',
            roleAuthc,
            internalReqHeader,
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
          .slsUser({
            endpoint: 'GET /internal/observability_ai_assistant/conversation/{conversationId}',
            roleAuthc,
            internalReqHeader,
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
          .slsUser({
            endpoint: 'GET /internal/observability_ai_assistant/conversation/{conversationId}',
            internalReqHeader,
            roleAuthc,
            params: {
              path: {
                conversationId: createResponse.body.conversation.id,
              },
            },
          })
          .expect(200);

        // delete user from response to avoid comparing it as it will be different in MKI
        delete response.body.user;
        expect(response.body).to.eql(createResponse.body);
      });

      it('returns the created conversation when listing', async () => {
        const response = await observabilityAIAssistantAPIClient
          .slsUser({
            endpoint: 'POST /internal/observability_ai_assistant/conversations',
            roleAuthc,
            internalReqHeader,
          })
          .expect(200);
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
          updateResponse = await observabilityAIAssistantAPIClient
            .slsUser({
              endpoint: 'PUT /internal/observability_ai_assistant/conversation/{conversationId}',
              internalReqHeader,
              roleAuthc,
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
            .slsUser({
              endpoint: 'GET /internal/observability_ai_assistant/conversation/{conversationId}',
              internalReqHeader,
              roleAuthc,
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
