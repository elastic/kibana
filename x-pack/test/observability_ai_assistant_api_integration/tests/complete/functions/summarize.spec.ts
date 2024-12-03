/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MessageRole } from '@kbn/observability-ai-assistant-plugin/common';
import expect from '@kbn/expect';
import { LlmProxy, createLlmProxy } from '../../../common/create_llm_proxy';
import { FtrProviderContext } from '../../../common/ftr_provider_context';
import { invokeChatCompleteWithFunctionRequest } from './helpers';
import {
  createProxyActionConnector,
  deleteActionConnector,
} from '../../../common/action_connectors';
import {
  TINY_ELSER,
  clearKnowledgeBase,
  createKnowledgeBaseModel,
  deleteInferenceEndpoint,
  deleteKnowledgeBaseModel,
} from '../../knowledge_base/helpers';

export default function ApiTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const log = getService('log');
  const ml = getService('ml');
  const es = getService('es');
  const observabilityAIAssistantAPIClient = getService('observabilityAIAssistantAPIClient');

  describe('when calling summarize function', () => {
    let proxy: LlmProxy;
    let connectorId: string;

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

      proxy = await createLlmProxy(log);
      connectorId = await createProxyActionConnector({ supertest, log, port: proxy.getPort() });

      // intercept the LLM request and return a fixed response
      void proxy
        .intercept('conversation', () => true, 'Hello from LLM Proxy')
        .completeAfterIntercept();

      await invokeChatCompleteWithFunctionRequest({
        connectorId,
        observabilityAIAssistantAPIClient,
        functionCall: {
          name: 'summarize',
          trigger: MessageRole.User,
          arguments: JSON.stringify({
            title: 'My Title',
            text: 'Hello world',
            confidence: 'high',
            public: false,
          }),
        },
      });

      await proxy.waitForAllInterceptorsSettled();
    });

    after(async () => {
      proxy.close();

      await deleteActionConnector({ supertest, connectorId, log });
      await deleteKnowledgeBaseModel(ml);
      await clearKnowledgeBase(es);
      await deleteInferenceEndpoint({ es });
    });

    it('persists entry in knowledge base', async () => {
      const res = await observabilityAIAssistantAPIClient.editor({
        endpoint: 'GET /internal/observability_ai_assistant/kb/entries',
        params: {
          query: {
            query: '',
            sortBy: 'title',
            sortDirection: 'asc',
          },
        },
      });

      const { role, public: isPublic, text, type, user, title } = res.body.entries[0];

      expect(role).to.eql('assistant_summarization');
      expect(isPublic).to.eql(false);
      expect(text).to.eql('Hello world');
      expect(type).to.eql('contextual');
      expect(user?.name).to.eql('editor');
      expect(title).to.eql('My Title');
      expect(res.body.entries).to.have.length(1);
    });
  });
}
