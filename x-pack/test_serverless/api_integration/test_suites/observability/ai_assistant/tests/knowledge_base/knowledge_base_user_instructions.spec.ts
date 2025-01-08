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
import {
  clearConversations,
  clearKnowledgeBase,
  createKnowledgeBaseModel,
  deleteInferenceEndpoint,
  deleteKnowledgeBaseModel,
  TINY_ELSER,
} from '@kbn/test-suites-xpack/observability_ai_assistant_api_integration/tests/knowledge_base/helpers';
import { getConversationCreatedEvent } from '@kbn/test-suites-xpack/observability_ai_assistant_api_integration/tests/conversations/helpers';
import {
  LlmProxy,
  createLlmProxy,
} from '@kbn/test-suites-xpack/observability_ai_assistant_api_integration/common/create_llm_proxy';
import { createProxyActionConnector, deleteActionConnector } from '../../common/action_connectors';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import type { InternalRequestHeader, RoleCredentials } from '../../../../../../shared/services';

export default function ApiTest({ getService }: FtrProviderContext) {
  const observabilityAIAssistantAPIClient = getService('observabilityAIAssistantAPIClient');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const es = getService('es');
  const ml = getService('ml');
  const log = getService('log');
  const svlUserManager = getService('svlUserManager');
  const svlCommonApi = getService('svlCommonApi');
  const retry = getService('retry');

  // Failing: See https://github.com/elastic/kibana/issues/205656
  describe.skip('Knowledge base user instructions', function () {
    // TODO: https://github.com/elastic/kibana/issues/192751
    this.tags(['skipMKI']);
    let editorRoleAuthc: RoleCredentials;
    let internalReqHeader: InternalRequestHeader;

    before(async () => {
      editorRoleAuthc = await svlUserManager.createM2mApiKeyWithRoleScope('editor');
      internalReqHeader = svlCommonApi.getInternalRequestHeader();
      await createKnowledgeBaseModel(ml);

      await observabilityAIAssistantAPIClient
        .slsAdmin({
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
      await svlUserManager.invalidateM2mApiKeyWithRoleScope(editorRoleAuthc);
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
          const user = username === 'editor' ? 'slsEditor' : 'slsAdmin';

          await observabilityAIAssistantAPIClient[user]({
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
          const res = await observabilityAIAssistantAPIClient.slsEditor({
            endpoint: 'GET /internal/observability_ai_assistant/kb/user_instructions',
          });

          const instructions = res.body.userInstructions;
          // TODO: gets 4 in serverless, bufferFlush event?
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
          const res = await observabilityAIAssistantAPIClient.slsAdmin({
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
          .slsEditor({
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
          .slsEditor({
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
        const res = await observabilityAIAssistantAPIClient.slsEditor({
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

    describe('when a user instruction exists and a conversation is created', () => {
      let proxy: LlmProxy;
      let connectorId: string;

      const userInstructionText =
        'Be polite and use language that is easy to understand. Never disagree with the user.';

      async function getConversationForUser(username: string) {
        const user = username === 'editor' ? 'slsEditor' : 'slsAdmin';

        // the user instruction is always created by "editor" user
        await observabilityAIAssistantAPIClient
          .slsEditor({
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

        const createResponse = await observabilityAIAssistantAPIClient[user]({
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

        const res = await observabilityAIAssistantAPIClient[user]({
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
        connectorId = await createProxyActionConnector({
          supertest: supertestWithoutAuth,
          log,
          port: proxy.getPort(),
          roleAuthc: editorRoleAuthc,
          internalReqHeader,
        });
      });

      after(async () => {
        proxy.close();
        await deleteActionConnector({
          supertest: supertestWithoutAuth,
          connectorId,
          log,
          roleAuthc: editorRoleAuthc,
          internalReqHeader,
        });
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
        const conversation = await getConversationForUser('john');
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
          .slsEditor({
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
          .slsEditor({ endpoint: 'GET /internal/observability_ai_assistant/kb/user_instructions' })
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
          await observabilityAIAssistantAPIClient
            .slsUnauthorized({
              endpoint: 'PUT /internal/observability_ai_assistant/kb/user_instructions',
              params: {
                body: {
                  id: 'test-instruction',
                  text: 'Test user instruction',
                  public: true,
                },
              },
            })
            .expect(403);
        });

        it('GET /internal/observability_ai_assistant/kb/user_instructions', async () => {
          await observabilityAIAssistantAPIClient
            .slsUnauthorized({
              endpoint: 'GET /internal/observability_ai_assistant/kb/user_instructions',
            })
            .expect(403);
        });
      });
    });
  });
}
