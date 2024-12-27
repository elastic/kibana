/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
    describe('security roles and access privileges', () => {
      describe('should deny access for users without the ai_assistant privilege', () => {
        let createResponse: Awaited<
          SupertestReturnType<'POST /internal/observability_ai_assistant/conversation'>
        >;
        before(async () => {
          createResponse = await observabilityAIAssistantAPIClient
            .slsEditor({
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
            .slsEditor({
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
          await observabilityAIAssistantAPIClient
            .slsUnauthorized({
              endpoint: 'POST /internal/observability_ai_assistant/conversation',
              params: {
                body: {
                  conversation: conversationCreate,
                },
              },
            })
            .expect(403);
        });

        it('POST /internal/observability_ai_assistant/conversations', async () => {
          await observabilityAIAssistantAPIClient
            .slsUnauthorized({
              endpoint: 'POST /internal/observability_ai_assistant/conversations',
            })
            .expect(403);
        });

        it('PUT /internal/observability_ai_assistant/conversation/{conversationId}', async () => {
          await observabilityAIAssistantAPIClient
            .slsUnauthorized({
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
            .expect(403);
        });

        it('GET /internal/observability_ai_assistant/conversation/{conversationId}', async () => {
          await observabilityAIAssistantAPIClient
            .slsUnauthorized({
              endpoint: 'GET /internal/observability_ai_assistant/conversation/{conversationId}',
              params: {
                path: {
                  conversationId: createResponse.body.conversation.id,
                },
              },
            })
            .expect(403);
        });

        it('DELETE /internal/observability_ai_assistant/conversation/{conversationId}', async () => {
          await observabilityAIAssistantAPIClient
            .slsUnauthorized({
              endpoint: 'DELETE /internal/observability_ai_assistant/conversation/{conversationId}',
              params: {
                path: {
                  conversationId: createResponse.body.conversation.id,
                },
              },
            })
            .expect(403);
        });
      });
    });
  });
}
