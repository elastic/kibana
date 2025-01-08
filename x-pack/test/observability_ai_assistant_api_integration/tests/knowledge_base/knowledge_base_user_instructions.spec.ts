/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { sortBy } from 'lodash';
import { Message, MessageRole } from '@kbn/observability-ai-assistant-plugin/common';
import { CONTEXT_FUNCTION_NAME } from '@kbn/observability-ai-assistant-plugin/server/functions/context';
import { Instruction } from '@kbn/observability-ai-assistant-plugin/common/types';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  TINY_ELSER,
  clearConversations,
  clearKnowledgeBase,
  createKnowledgeBaseModel,
  deleteInferenceEndpoint,
  deleteKnowledgeBaseModel,
} from './helpers';
import { getConversationCreatedEvent } from '../conversations/helpers';
import { LlmProxy, createLlmProxy } from '../../common/create_llm_proxy';
import { createProxyActionConnector, deleteActionConnector } from '../../common/action_connectors';
import { User } from '../../common/users/users';
import { ForbiddenApiError } from '../../common/config';

export default function ApiTest({ getService }: FtrProviderContext) {
  const observabilityAIAssistantAPIClient = getService('observabilityAIAssistantAPIClient');
  const supertest = getService('supertest');
  const es = getService('es');
  const ml = getService('ml');
  const log = getService('log');
  const retry = getService('retry');
  const getScopedApiClientForUsername = getService('getScopedApiClientForUsername');

  describe('Knowledge base user instructions', () => {
    before(async () => {
      await createKnowledgeBaseModel(ml);
      await observabilityAIAssistantAPIClient
        .admin({
          endpoint: 'POST /internal/observability_ai_assistant/kb/setup',
          params: {
            query: {
              model_id: TINY_ELSER.id,
            },
          },
        })
        .expect(200);
    });

    after(async () => {
      await deleteKnowledgeBaseModel(ml);
      await deleteInferenceEndpoint({ es });
      await clearKnowledgeBase(es);
      await clearConversations(es);
    });

    describe('when creating private and public user instructions', () => {
      before(async () => {
        await clearKnowledgeBase(es);

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
            username: 'secondary_editor' as const,
            isPublic: true,
          },
          {
            username: 'secondary_editor' as const,
            isPublic: false,
          },
        ].map(async ({ username, isPublic }) => {
          const visibility = isPublic ? 'Public' : 'Private';

          await getScopedApiClientForUsername(username)({
            endpoint: 'PUT /internal/observability_ai_assistant/kb/user_instructions',
            params: {
              body: {
                id: `${visibility.toLowerCase()}-doc-from-${username}`,
                text: `${visibility} user instruction from "${username}"`,
                public: isPublic,
              },
            },
          }).expect(200);
        });

        await Promise.all(promises);
      });

      it('"editor" can retrieve their own private instructions and the public instruction', async () => {
        await retry.try(async () => {
          const res = await observabilityAIAssistantAPIClient.editor({
            endpoint: 'GET /internal/observability_ai_assistant/kb/user_instructions',
          });

          const instructions = res.body.userInstructions;
          expect(instructions).to.have.length(3);

          const sortById = (data: Array<Instruction & { public?: boolean }>) => sortBy(data, 'id');

          expect(sortById(instructions)).to.eql(
            sortById([
              {
                id: 'private-doc-from-editor',
                public: false,
                text: 'Private user instruction from "editor"',
              },
              {
                id: 'public-doc-from-editor',
                public: true,
                text: 'Public user instruction from "editor"',
              },
              {
                id: 'public-doc-from-secondary_editor',
                public: true,
                text: 'Public user instruction from "secondary_editor"',
              },
            ])
          );
        });
      });

      it('"secondaryEditor" can retrieve their own private instructions and the public instruction', async () => {
        await retry.try(async () => {
          const res = await observabilityAIAssistantAPIClient.secondaryEditor({
            endpoint: 'GET /internal/observability_ai_assistant/kb/user_instructions',
          });

          const instructions = res.body.userInstructions;
          expect(instructions).to.have.length(3);

          const sortById = (data: Array<Instruction & { public?: boolean }>) => sortBy(data, 'id');

          expect(sortById(instructions)).to.eql(
            sortById([
              {
                id: 'public-doc-from-editor',
                public: true,
                text: 'Public user instruction from "editor"',
              },
              {
                id: 'public-doc-from-secondary_editor',
                public: true,
                text: 'Public user instruction from "secondary_editor"',
              },
              {
                id: 'private-doc-from-secondary_editor',
                public: false,
                text: 'Private user instruction from "secondary_editor"',
              },
            ])
          );
        });
      });
    });

    describe('when updating an existing user instructions', () => {
      before(async () => {
        await clearKnowledgeBase(es);

        await observabilityAIAssistantAPIClient
          .editor({
            endpoint: 'PUT /internal/observability_ai_assistant/kb/user_instructions',
            params: {
              body: {
                id: 'doc-to-update',
                text: 'Initial text',
                public: true,
              },
            },
          })
          .expect(200);

        await observabilityAIAssistantAPIClient
          .editor({
            endpoint: 'PUT /internal/observability_ai_assistant/kb/user_instructions',
            params: {
              body: {
                id: 'doc-to-update',
                text: 'Updated text',
                public: false,
              },
            },
          })
          .expect(200);
      });

      it('updates the user instruction', async () => {
        const res = await observabilityAIAssistantAPIClient.editor({
          endpoint: 'GET /internal/observability_ai_assistant/kb/user_instructions',
        });
        const instructions = res.body.userInstructions;

        expect(instructions).to.eql([
          {
            id: 'doc-to-update',
            text: 'Updated text',
            public: false,
          },
        ]);
      });
    });

    describe('when a user instruction exist and a conversation is created', () => {
      let proxy: LlmProxy;
      let connectorId: string;

      const userInstructionText =
        'Be polite and use language that is easy to understand. Never disagree with the user.';

      async function getConversationForUser(username: User['username']) {
        const apiClient = getScopedApiClientForUsername(username);

        // the user instruction is always created by "editor" user
        await observabilityAIAssistantAPIClient
          .editor({
            endpoint: 'PUT /internal/observability_ai_assistant/kb/user_instructions',
            params: {
              body: {
                id: 'private-instruction-about-language',
                text: userInstructionText,
                public: false,
              },
            },
          })
          .expect(200);

        const interceptPromises = [
          proxy.interceptConversationTitle('LLM-generated title').completeAfterIntercept(),
          proxy
            .interceptConversation({ name: 'conversation', response: 'I, the LLM, hear you!' })
            .completeAfterIntercept(),
        ];

        const messages: Message[] = [
          {
            '@timestamp': new Date().toISOString(),
            message: {
              role: MessageRole.System,
              content: 'You are a helpful assistant',
            },
          },
          {
            '@timestamp': new Date().toISOString(),
            message: {
              role: MessageRole.User,
              content: 'Today we will be testing user instructions!',
            },
          },
        ];

        const createResponse = await apiClient({
          endpoint: 'POST /internal/observability_ai_assistant/chat/complete',
          params: {
            body: {
              messages,
              connectorId,
              persist: true,
              screenContexts: [],
              scopes: ['observability'],
            },
          },
        }).expect(200);

        await proxy.waitForAllInterceptorsSettled();
        const conversationCreatedEvent = getConversationCreatedEvent(createResponse.body);
        const conversationId = conversationCreatedEvent.conversation.id;

        const res = await apiClient({
          endpoint: 'GET /internal/observability_ai_assistant/conversation/{conversationId}',
          params: {
            path: {
              conversationId,
            },
          },
        });

        // wait for all interceptors to be settled
        await Promise.all(interceptPromises);

        const conversation = res.body;
        return conversation;
      }

      before(async () => {
        proxy = await createLlmProxy(log);
        connectorId = await createProxyActionConnector({ supertest, log, port: proxy.getPort() });
      });

      after(async () => {
        proxy.close();
        await deleteActionConnector({ supertest, connectorId, log });
      });

      it('adds the instruction to the system prompt', async () => {
        const conversation = await getConversationForUser('editor');
        const systemMessage = conversation.messages.find(
          (message) => message.message.role === MessageRole.System
        )!;
        expect(systemMessage.message.content).to.contain(userInstructionText);
      });

      it('does not add the instruction to the context', async () => {
        const conversation = await getConversationForUser('editor');
        const contextMessage = conversation.messages.find(
          (message) => message.message.name === CONTEXT_FUNCTION_NAME
        );

        // there should be no suggestions with the user instruction
        expect(contextMessage?.message.content).to.not.contain(userInstructionText);
        expect(contextMessage?.message.data).to.not.contain(userInstructionText);

        // there should be no suggestions at all
        expect(JSON.parse(contextMessage?.message.data!).suggestions.length).to.be(0);
      });

      it('does not add the instruction conversation for other users', async () => {
        const conversation = await getConversationForUser('secondary_editor');
        const systemMessage = conversation.messages.find(
          (message) => message.message.role === MessageRole.System
        )!;

        expect(systemMessage.message.content).to.not.contain(userInstructionText);
        expect(conversation.messages.length).to.be(5);
      });
    });

    describe('Instructions can be saved and cleared again', () => {
      async function updateInstruction(text: string) {
        await observabilityAIAssistantAPIClient
          .editor({
            endpoint: 'PUT /internal/observability_ai_assistant/kb/user_instructions',
            params: {
              body: {
                id: 'my-instruction-that-will-be-cleared',
                text,
                public: false,
              },
            },
          })
          .expect(200);

        const res = await observabilityAIAssistantAPIClient
          .editor({ endpoint: 'GET /internal/observability_ai_assistant/kb/user_instructions' })
          .expect(200);

        return res.body.userInstructions[0].text;
      }

      it('can clear the instruction', async () => {
        const res1 = await updateInstruction('This is a user instruction that will be cleared');
        expect(res1).to.be('This is a user instruction that will be cleared');

        const res2 = await updateInstruction('');
        expect(res2).to.be('');
      });
    });

    describe('security roles and access privileges', () => {
      describe('should deny access for users without the ai_assistant privilege', () => {
        it('PUT /internal/observability_ai_assistant/kb/user_instructions', async () => {
          try {
            await observabilityAIAssistantAPIClient.unauthorizedUser({
              endpoint: 'PUT /internal/observability_ai_assistant/kb/user_instructions',
              params: {
                body: {
                  id: 'test-instruction',
                  text: 'Test user instruction',
                  public: true,
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

        it('GET /internal/observability_ai_assistant/kb/user_instructions', async () => {
          try {
            await observabilityAIAssistantAPIClient.unauthorizedUser({
              endpoint: 'GET /internal/observability_ai_assistant/kb/user_instructions',
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
