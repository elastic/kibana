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
import { ForbiddenApiError } from '../../common/config';

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
    describe('security roles and access privileges', () => {
      describe('should deny access for users without the ai_assistant privilege', () => {
        let createResponse: Awaited<
          SupertestReturnType<'POST /internal/observability_ai_assistant/conversation'>
        >;
        before(async () => {
          createResponse = await observabilityAIAssistantAPIClient
            .editor({
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
            .editor({
              endpoint: 'DELETE /internal/observability_ai_assistant/conversation/{conversationId}',
              params: {
                path: {
                  conversationId: createResponse.body.conversation.id,
                },
              },
            })
            .expect(200);
        });

        it('POST /internal/observability_ai_assistant/conversation', async () => {
          try {
            await observabilityAIAssistantAPIClient.unauthorizedUser({
              endpoint: 'POST /internal/observability_ai_assistant/conversation',
              params: {
                body: {
                  conversation: conversationCreate,
                },
              },
            });
            throw new ForbiddenApiError(
              'Expected unauthorizedUser() to throw a 403 Forbidden error'
            );
          } catch (e) {
            expect(e.status).to.be(403);
          }
        });

        it('POST /internal/observability_ai_assistant/conversations', async () => {
          try {
            await observabilityAIAssistantAPIClient.unauthorizedUser({
              endpoint: 'POST /internal/observability_ai_assistant/conversations',
            });
            throw new ForbiddenApiError(
              'Expected unauthorizedUser() to throw a 403 Forbidden error'
            );
          } catch (e) {
            expect(e.status).to.be(403);
          }
        });

        it('PUT /internal/observability_ai_assistant/conversation/{conversationId}', async () => {
          try {
            await observabilityAIAssistantAPIClient.unauthorizedUser({
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
            throw new ForbiddenApiError(
              'Expected unauthorizedUser() to throw a 403 Forbidden error'
            );
          } catch (e) {
            expect(e.status).to.be(403);
          }
        });

        it('GET /internal/observability_ai_assistant/conversation/{conversationId}', async () => {
          try {
            await observabilityAIAssistantAPIClient.unauthorizedUser({
              endpoint: 'GET /internal/observability_ai_assistant/conversation/{conversationId}',
              params: {
                path: {
                  conversationId: createResponse.body.conversation.id,
                },
              },
            });
            throw new ForbiddenApiError(
              'Expected unauthorizedUser() to throw a 403 Forbidden error'
            );
          } catch (e) {
            expect(e.status).to.be(403);
          }
        });

        it('DELETE /internal/observability_ai_assistant/conversation/{conversationId}', async () => {
          try {
            await observabilityAIAssistantAPIClient.unauthorizedUser({
              endpoint: 'DELETE /internal/observability_ai_assistant/conversation/{conversationId}',
              params: {
                path: {
                  conversationId: createResponse.body.conversation.id,
                },
              },
            });
            throw new ForbiddenApiError(
              'Expected unauthorizedUser() to throw a 403 Forbidden error'
            );
          } catch (e) {
            expect(e.status).to.be(403);
          }
        });
      });
    });
  });
}
