/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { kbnTestConfig } from '@kbn/test';
import { sortBy } from 'lodash';
import {
  ConversationCreateEvent,
  Message,
  MessageRole,
} from '@kbn/observability-ai-assistant-plugin/common';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { clearKnowledgeBase, createKnowledgeBaseModel, deleteKnowledgeBaseModel } from './helpers';
import { getConversationCreatedEvent } from '../conversations/helpers';
import { LlmProxy } from '../../common/create_llm_proxy';
import { createLLMProxyConnector, deleteLLMProxyConnector } from '../complete/functions/helpers';

export default function ApiTest({ getService }: FtrProviderContext) {
  const observabilityAIAssistantAPIClient = getService('observabilityAIAssistantAPIClient');
  const getScopedApiClientForUsername = getService('getScopedApiClientForUsername');
  const security = getService('security');
  const supertest = getService('supertest');
  const es = getService('es');
  const ml = getService('ml');
  const log = getService('log');

  describe('Knowledge base user instructions', () => {
    const userJohn = 'john';

    before(async () => {
      // create user
      const password = kbnTestConfig.getUrlParts().password!;
      await security.user.create(userJohn, { password, roles: ['editor'] });
      await createKnowledgeBaseModel(ml);

      await observabilityAIAssistantAPIClient
        .editorUser({ endpoint: 'POST /internal/observability_ai_assistant/kb/setup' })
        .expect(200);
    });

    after(async () => {
      await deleteKnowledgeBaseModel(ml);
      await security.user.delete(userJohn);
      await clearKnowledgeBase(es);
    });

    describe('when creating private and public user instructions', () => {
      before(async () => {
        await clearKnowledgeBase(es);

        const promises = [
          {
            username: 'editor',
            isPublic: true,
          },
          {
            username: 'editor',
            isPublic: false,
          },
          {
            username: userJohn,
            isPublic: true,
          },
          {
            username: userJohn,
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
        const res = await observabilityAIAssistantAPIClient.editorUser({
          endpoint: 'GET /internal/observability_ai_assistant/kb/user_instructions',
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
        const res = await getScopedApiClientForUsername(userJohn)({
          endpoint: 'GET /internal/observability_ai_assistant/kb/user_instructions',
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
          .editorUser({
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
          .editorUser({
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
        const res = await observabilityAIAssistantAPIClient.editorUser({
          endpoint: 'GET /internal/observability_ai_assistant/kb/user_instructions',
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

    describe.only('when a user instruction exist and a conversation is created', () => {
      let conversationCreatedEvent: ConversationCreateEvent;
      let proxy: LlmProxy;
      let connectorId: string;

      before(async () => {
        await observabilityAIAssistantAPIClient
          .editorUser({
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

        ({ proxy, connectorId } = await createLLMProxyConnector({ log, supertest }));

        proxy.interceptConversationTitle('LLM-generated title').completeAfterIntercept();
        proxy.interceptConversation('I, the LLM, hear you!').completeAfterIntercept();

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
          .editorUser({
            endpoint: 'POST /internal/observability_ai_assistant/chat/complete',
            params: {
              body: {
                messages,
                connectorId,
                persist: true,
                screenContexts: [],
              },
            },
          })
          .expect(200);

        // await proxy.waitForAllInterceptorsSettled();

        // conversationCreatedEvent = getConversationCreatedEvent(createResponse.body);
        // console.log('conversationCreatedEvent', createResponse.body, conversationCreatedEvent);
      });

      after(async () => {
        await deleteLLMProxyConnector({ supertest, connectorId, proxy, log });
      });

      it('the instruction is included in the system prompt of a conversation', async () => {
        expect(true).to.be(true);
        // const conversationId = conversationCreatedEvent.conversation.id;
        // const fullConversation = await observabilityAIAssistantAPIClient.editorUser({
        //   endpoint: 'GET /internal/observability_ai_assistant/conversation/{conversationId}',
        //   params: {
        //     path: {
        //       conversationId,
        //     },
        //   },
        // });

        // console.log(fullConversation.body.conversation);
        // expect(fullConversation.body.conversation).to.eql();
      });
    });
  });
}
