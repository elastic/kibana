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
import {
  clearConversations,
  clearKnowledgeBase,
  createKnowledgeBaseModel,
  deleteInferenceEndpoint,
  deleteKnowledgeBaseModel,
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

  // TODO: https://github.com/elastic/kibana/issues/192711 cannot create custom users in serverless
  // trying using built in users by using cookie auth
  // TODO: https://github.com/elastic/kibana/issues/192757
  describe.skip('Knowledge base user instructions', function () {
    this.tags(['skipMKI']);
    let editorRoleAuthc: RoleCredentials;
    let johnRoleAuthc: RoleCredentials;
    let internalReqHeader: InternalRequestHeader;
    before(async () => {
      // Create API keys for 'editor' role, simulating different users
      johnRoleAuthc = await svlUserManager.createM2mApiKeyWithRoleScope('admin');
      editorRoleAuthc = await svlUserManager.createM2mApiKeyWithRoleScope('editor');
      internalReqHeader = svlCommonApi.getInternalRequestHeader();
      await createKnowledgeBaseModel(ml);

      await observabilityAIAssistantAPIClient
        .slsUser({
          endpoint: 'POST /internal/observability_ai_assistant/kb/setup',
          roleAuthc: editorRoleAuthc,
          internalReqHeader,
        })
        .expect(200);
    });

    after(async () => {
      await deleteKnowledgeBaseModel(ml);
      await deleteInferenceEndpoint({ es });
      await clearKnowledgeBase(es);
      await clearConversations(es);
      await svlUserManager.invalidateM2mApiKeyWithRoleScope(johnRoleAuthc);
      await svlUserManager.invalidateM2mApiKeyWithRoleScope(editorRoleAuthc);
    });

    describe('when creating private and public user instructions', () => {
      before(async () => {
        await clearKnowledgeBase(es);

        const promises = [
          { roleAuthc: editorRoleAuthc, username: 'editor', isPublic: true },
          { roleAuthc: editorRoleAuthc, username: 'editor', isPublic: false },
          { roleAuthc: johnRoleAuthc, username: 'john', isPublic: true },
          { roleAuthc: johnRoleAuthc, username: 'john', isPublic: false },
        ].map(async ({ roleAuthc, username, isPublic }) => {
          const visibility = isPublic ? 'Public' : 'Private';
          await observabilityAIAssistantAPIClient
            .slsUser({
              endpoint: 'PUT /internal/observability_ai_assistant/kb/user_instructions',
              params: {
                body: {
                  id: `${visibility.toLowerCase()}-doc-from-${username}`,
                  text: `${visibility} user instruction from "${username}"`,
                  public: isPublic,
                },
              },
              roleAuthc,
              internalReqHeader,
            })
            .expect(200);
        });

        await Promise.all(promises);
      });

      it('"editor" can retrieve their own private instructions and the public instruction', async () => {
        const res = await observabilityAIAssistantAPIClient.slsUser({
          endpoint: 'GET /internal/observability_ai_assistant/kb/user_instructions',
          roleAuthc: editorRoleAuthc,
          internalReqHeader,
        });
        const instructions = res.body.userInstructions;

        const sortByDocId = (data: any) => sortBy(data, 'doc_id');
        expect(sortByDocId(instructions)).to.eql(
          sortByDocId([
            {
              doc_id: 'private-doc-from-editor',
              public: false,
              text: 'Private user instruction from "editor"',
            },
            {
              doc_id: 'public-doc-from-editor',
              public: true,
              text: 'Public user instruction from "editor"',
            },
            {
              doc_id: 'public-doc-from-john',
              public: true,
              text: 'Public user instruction from "john"',
            },
          ])
        );
      });

      it('"john" can retrieve their own private instructions and the public instruction', async () => {
        const res = await observabilityAIAssistantAPIClient.slsUser({
          endpoint: 'GET /internal/observability_ai_assistant/kb/user_instructions',
          roleAuthc: johnRoleAuthc,
          internalReqHeader,
        });
        const instructions = res.body.userInstructions;

        const sortByDocId = (data: any) => sortBy(data, 'doc_id');
        expect(sortByDocId(instructions)).to.eql(
          sortByDocId([
            {
              doc_id: 'public-doc-from-editor',
              public: true,
              text: 'Public user instruction from "editor"',
            },
            {
              doc_id: 'public-doc-from-john',
              public: true,
              text: 'Public user instruction from "john"',
            },
            {
              doc_id: 'private-doc-from-john',
              public: false,
              text: 'Private user instruction from "john"',
            },
          ])
        );
      });
    });

    describe('when updating an existing user instructions', () => {
      before(async () => {
        await clearKnowledgeBase(es);

        await observabilityAIAssistantAPIClient
          .slsUser({
            endpoint: 'PUT /internal/observability_ai_assistant/kb/user_instructions',
            params: {
              body: {
                id: 'doc-to-update',
                text: 'Initial text',
                public: true,
              },
            },
            roleAuthc: editorRoleAuthc,
            internalReqHeader,
          })
          .expect(200);

        await observabilityAIAssistantAPIClient
          .slsUser({
            endpoint: 'PUT /internal/observability_ai_assistant/kb/user_instructions',
            params: {
              body: {
                id: 'doc-to-update',
                text: 'Updated text',
                public: false,
              },
            },
            roleAuthc: editorRoleAuthc,
            internalReqHeader,
          })
          .expect(200);
      });

      it('updates the user instruction', async () => {
        const res = await observabilityAIAssistantAPIClient.slsUser({
          endpoint: 'GET /internal/observability_ai_assistant/kb/user_instructions',
          roleAuthc: editorRoleAuthc,
          internalReqHeader,
        });
        const instructions = res.body.userInstructions;

        expect(instructions).to.eql([
          {
            doc_id: 'doc-to-update',
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

      async function getConversationForUser(roleAuthc: RoleCredentials) {
        // the user instruction is always created by "editor" user
        await observabilityAIAssistantAPIClient
          .slsUser({
            endpoint: 'PUT /internal/observability_ai_assistant/kb/user_instructions',
            params: {
              body: {
                id: 'private-instruction-about-language',
                text: userInstructionText,
                public: false,
              },
            },
            roleAuthc: editorRoleAuthc,
            internalReqHeader,
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

        const createResponse = await observabilityAIAssistantAPIClient
          .slsUser({
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
            roleAuthc,
            internalReqHeader,
          })
          .expect(200);

        await proxy.waitForAllInterceptorsSettled();
        const conversationCreatedEvent = getConversationCreatedEvent(createResponse.body);
        const conversationId = conversationCreatedEvent.conversation.id;

        const res = await observabilityAIAssistantAPIClient.slsUser({
          endpoint: 'GET /internal/observability_ai_assistant/conversation/{conversationId}',
          params: {
            path: {
              conversationId,
            },
          },
          roleAuthc,
          internalReqHeader,
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
        const conversation = await getConversationForUser(editorRoleAuthc);
        const systemMessage = conversation.messages.find(
          (message) => message.message.role === MessageRole.System
        )!;
        expect(systemMessage.message.content).to.contain(userInstructionText);
      });

      it('does not add the instruction to the context', async () => {
        const conversation = await getConversationForUser(editorRoleAuthc);
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
        const conversation = await getConversationForUser(johnRoleAuthc);
        const systemMessage = conversation.messages.find(
          (message) => message.message.role === MessageRole.System
        )!;

        expect(systemMessage.message.content).to.not.contain(userInstructionText);
        expect(conversation.messages.length).to.be(5);
      });
    });
  });
}
