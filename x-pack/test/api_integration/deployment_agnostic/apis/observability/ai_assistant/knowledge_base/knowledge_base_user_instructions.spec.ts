/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { sortBy } from 'lodash';
import { Message, MessageRole } from '@kbn/observability-ai-assistant-plugin/common';
import { CONTEXT_FUNCTION_NAME } from '@kbn/observability-ai-assistant-plugin/server/functions/context/context';
import { Instruction } from '@kbn/observability-ai-assistant-plugin/common/types';
import pRetry from 'p-retry';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';
import { clearKnowledgeBase } from '../utils/knowledge_base';
import { LlmProxy, createLlmProxy } from '../utils/create_llm_proxy';
import { clearConversations, getConversationCreatedEvent } from '../utils/conversation';
import {
  deployTinyElserAndSetupKb,
  teardownTinyElserModelAndInferenceEndpoint,
} from '../utils/model_and_inference';

const sortById = (data: Array<Instruction & { public?: boolean }>) => sortBy(data, 'id');

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const observabilityAIAssistantAPIClient = getService('observabilityAIAssistantApi');
  const es = getService('es');
  const log = getService('log');
  const retry = getService('retry');

  describe('Knowledge base: user instructions', function () {
    before(async () => {
      await deployTinyElserAndSetupKb(getService);
    });

    after(async () => {
      await teardownTinyElserModelAndInferenceEndpoint(getService);
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
            username: 'admin' as const,
            isPublic: true,
          },
          {
            username: 'admin' as const,
            isPublic: false,
          },
        ].map(async ({ username, isPublic }) => {
          const visibility = isPublic ? 'Public' : 'Private';

          const { status } = await observabilityAIAssistantAPIClient[username]({
            endpoint: 'PUT /internal/observability_ai_assistant/kb/user_instructions',
            params: {
              body: {
                id: `${visibility.toLowerCase()}-doc-from-${username}`,
                text: `${visibility} user instruction from "${username}"`,
                public: isPublic,
              },
            },
          });
          expect(status).to.be(200);
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
                id: 'public-doc-from-admin',
                public: true,
                text: 'Public user instruction from "admin"',
              },
            ])
          );
        });
      });

      it('"admin" can retrieve their own private instructions and the public instruction', async () => {
        await retry.try(async () => {
          const res = await observabilityAIAssistantAPIClient.admin({
            endpoint: 'GET /internal/observability_ai_assistant/kb/user_instructions',
          });

          const instructions = res.body.userInstructions;
          expect(instructions).to.have.length(3);

          expect(sortById(instructions)).to.eql(
            sortById([
              {
                id: 'public-doc-from-editor',
                public: true,
                text: 'Public user instruction from "editor"',
              },
              {
                id: 'public-doc-from-admin',
                public: true,
                text: 'Public user instruction from "admin"',
              },
              {
                id: 'private-doc-from-admin',
                public: false,
                text: 'Private user instruction from "admin"',
              },
            ])
          );
        });
      });
    });

    describe('when a public instruction already exists', () => {
      const adminInstruction = {
        id: `public-doc-from-admin-not-to-be-overwritten`,
        text: `public user instruction from "admin" not to be overwritten by other users`,
        public: true,
      };

      const editorInstruction = {
        id: `public-doc-from-editor-must-not-overwrite-admin-instruction`,
        text: `public user instruction from "admin" must not overwrite admin instruction`,
        public: true,
      };

      before(async () => {
        await clearKnowledgeBase(es);

        const { status: statusAdmin } = await observabilityAIAssistantAPIClient.admin({
          endpoint: 'PUT /internal/observability_ai_assistant/kb/user_instructions',
          params: { body: adminInstruction },
        });

        expect(statusAdmin).to.be(200);

        // wait for the public instruction to be indexed before proceeding
        await pRetry(async () => {
          const res = await observabilityAIAssistantAPIClient.editor({
            endpoint: 'GET /internal/observability_ai_assistant/kb/user_instructions',
          });

          const hasPublicAdminInstruction = res.body.userInstructions.some(
            (instruction) => instruction.id === 'public-doc-from-admin-not-to-be-overwritten'
          );

          if (!hasPublicAdminInstruction) {
            throw new Error('Public instruction not found');
          }
        });

        const { status: statusEditor } = await observabilityAIAssistantAPIClient.editor({
          endpoint: 'PUT /internal/observability_ai_assistant/kb/user_instructions',
          params: {
            body: editorInstruction,
          },
        });

        expect(statusEditor).to.be(200);
      });

      it("another user's public instruction will not overwrite it", async () => {
        const res = await observabilityAIAssistantAPIClient.editor({
          endpoint: 'GET /internal/observability_ai_assistant/kb/user_instructions',
        });

        const instructions = res.body.userInstructions;
        expect(sortById(instructions)).to.eql(sortById([adminInstruction, editorInstruction]));
      });
    });

    describe('when updating an existing user instructions', () => {
      before(async () => {
        await clearKnowledgeBase(es);

        const { status } = await observabilityAIAssistantAPIClient.editor({
          endpoint: 'PUT /internal/observability_ai_assistant/kb/user_instructions',
          params: {
            body: {
              id: 'doc-to-update',
              text: 'Initial text',
              public: true,
            },
          },
        });
        expect(status).to.be(200);

        const res = await observabilityAIAssistantAPIClient.editor({
          endpoint: 'PUT /internal/observability_ai_assistant/kb/user_instructions',
          params: {
            body: {
              id: 'doc-to-update',
              text: 'Updated text',
              public: false,
            },
          },
        });
        expect(res.status).to.be(200);
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
      // Fails on MKI because the LLM Proxy does not yet work there: https://github.com/elastic/obs-ai-assistant-team/issues/199
      this.tags(['skipCloud']);

      let proxy: LlmProxy;
      let connectorId: string;

      const userInstructionText =
        'Be polite and use language that is easy to understand. Never disagree with the user.';

      async function getConversationForUser(username: 'editor' | 'admin') {
        // the user instruction is always created by "editor" user
        const { status } = await observabilityAIAssistantAPIClient.editor({
          endpoint: 'PUT /internal/observability_ai_assistant/kb/user_instructions',
          params: {
            body: {
              id: 'private-instruction-about-language',
              text: userInstructionText,
              public: false,
            },
          },
        });

        expect(status).to.be(200);

        void proxy.interceptTitle('This is a conversation title');
        void proxy.interceptQueryRewrite('This is the rewritten user prompt');
        void proxy.interceptWithResponse('I, the LLM, hear you!');

        const messages: Message[] = [
          {
            '@timestamp': new Date().toISOString(),
            message: {
              role: MessageRole.User,
              content: 'Today we will be testing user instructions!',
            },
          },
        ];

        const createResponse = await observabilityAIAssistantAPIClient[username]({
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
        });
        expect(createResponse.status).to.be(200);

        await proxy.waitForAllInterceptorsToHaveBeenCalled();

        const conversationCreatedEvent = getConversationCreatedEvent(createResponse.body);
        const conversationId = conversationCreatedEvent.conversation.id;

        const res = await observabilityAIAssistantAPIClient[username]({
          endpoint: 'GET /internal/observability_ai_assistant/conversation/{conversationId}',
          params: {
            path: {
              conversationId,
            },
          },
        });

        await proxy.waitForAllInterceptorsToHaveBeenCalled();

        const conversation = res.body;
        return conversation;
      }

      before(async () => {
        proxy = await createLlmProxy(log);
        connectorId = await observabilityAIAssistantAPIClient.createProxyActionConnector({
          port: proxy.getPort(),
        });
      });

      after(async () => {
        proxy.close();
        await clearKnowledgeBase(es);
        await clearConversations(es);
        await observabilityAIAssistantAPIClient.deleteActionConnector({
          actionId: connectorId,
        });
      });

      it('adds the instruction to the system prompt', async () => {
        const conversation = await getConversationForUser('editor');
        expect(conversation.systemMessage).to.contain(userInstructionText);
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
        const conversation = await getConversationForUser('admin');

        expect(conversation.systemMessage).to.not.contain(userInstructionText);
        expect(conversation.messages.length).to.be(4);
      });
    });

    describe('Forwarding User Instructions via System Message to the LLM', () => {
      // Fails on MKI because the LLM Proxy does not yet work there: https://github.com/elastic/obs-ai-assistant-team/issues/199
      this.tags(['skipCloud']);

      let proxy: LlmProxy;
      let connectorId: string;
      const userInstructionText = 'This is a private instruction';
      let systemMessage: string;

      before(async () => {
        proxy = await createLlmProxy(log);
        connectorId = await observabilityAIAssistantAPIClient.createProxyActionConnector({
          port: proxy.getPort(),
        });
        const res = await observabilityAIAssistantAPIClient.editor({
          endpoint: 'PUT /internal/observability_ai_assistant/kb/user_instructions',
          params: {
            body: {
              id: 'private-instruction-id',
              text: userInstructionText,
              public: false,
            },
          },
        });
        expect(res.status).to.be(200);

        const { status, body } = await observabilityAIAssistantAPIClient.editor({
          endpoint: 'GET /internal/observability_ai_assistant/functions',
          params: {
            query: {
              scopes: ['all'],
            },
          },
        });

        expect(status).to.be(200);
        systemMessage = body.systemMessage;
      });

      after(async () => {
        proxy.close();
        await observabilityAIAssistantAPIClient.deleteActionConnector({
          actionId: connectorId,
        });
      });

      it('includes private KB instructions in the system message sent to the LLM', async () => {
        void proxy.interceptQueryRewrite('This is the rewritten user prompt');
        void proxy.interceptWithResponse('Hello from LLM Proxy');
        const messages: Message[] = [
          {
            '@timestamp': new Date().toISOString(),
            message: {
              role: MessageRole.User,
              content: 'Today we will be testing user instructions!',
            },
          },
        ];
        await observabilityAIAssistantAPIClient.editor({
          endpoint: 'POST /internal/observability_ai_assistant/chat/complete',
          params: {
            body: {
              messages,
              connectorId,
              persist: false,
              screenContexts: [],
              scopes: ['all'],
            },
          },
        });
        await proxy.waitForAllInterceptorsToHaveBeenCalled();

        const { requestBody } = proxy.interceptedRequests[1];
        expect(requestBody.messages[0].content).to.contain(userInstructionText);
        expect(requestBody.messages[0].content).to.eql(systemMessage);
      });
    });

    describe('security roles and access privileges', () => {
      describe('should deny access for users without the ai_assistant privilege', () => {
        it('PUT /internal/observability_ai_assistant/kb/user_instructions', async () => {
          const { status } = await observabilityAIAssistantAPIClient.viewer({
            endpoint: 'PUT /internal/observability_ai_assistant/kb/user_instructions',
            params: {
              body: {
                id: 'test-instruction',
                text: 'Test user instruction',
                public: true,
              },
            },
          });

          expect(status).to.be(403);
        });

        it('GET /internal/observability_ai_assistant/kb/user_instructions', async () => {
          const { status } = await observabilityAIAssistantAPIClient.viewer({
            endpoint: 'GET /internal/observability_ai_assistant/kb/user_instructions',
          });
          expect(status).to.be(403);
        });
      });
    });
  });
}
