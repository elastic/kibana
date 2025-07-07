/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ChatCompletionStreamParams } from 'openai/lib/ChatCompletionStream';
import {
  TITLE_CONVERSATION_FUNCTION_NAME,
  TITLE_SYSTEM_MESSAGE,
} from '@kbn/observability-ai-assistant-plugin/server/service/client/operators/get_generated_title';
import { MessageRole } from '@kbn/observability-ai-assistant-plugin/common';
import { LlmProxy, createLlmProxy } from '../../utils/create_llm_proxy';
import { chatComplete, clearConversations } from '../../utils/conversation';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../../ftr_provider_context';

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const log = getService('log');
  const observabilityAIAssistantAPIClient = getService('observabilityAIAssistantApi');
  const es = getService('es');

  describe('tool: title_conversation', function () {
    // Fails on MKI: https://github.com/elastic/kibana/issues/205581
    this.tags(['skipCloud']);
    let llmProxy: LlmProxy;
    let connectorId: string;

    before(async () => {
      llmProxy = await createLlmProxy(log);
      connectorId = await observabilityAIAssistantAPIClient.createProxyActionConnector({
        port: llmProxy.getPort(),
      });
    });

    after(async () => {
      llmProxy.close();
      await observabilityAIAssistantAPIClient.deleteActionConnector({
        actionId: connectorId,
      });
    });

    // Calling `title_conversation` via the chat/complete endpoint
    describe('POST /internal/observability_ai_assistant/chat/complete', function () {
      let titleRequestBody: ChatCompletionStreamParams;

      const TITLE = 'Question about color of the sky';
      let conversationId: string;

      before(async () => {
        await clearConversations(es);
        const simulatorPromise = llmProxy.interceptTitle(TITLE);
        void llmProxy.interceptWithResponse('The sky is blue because of Rayleigh scattering.');

        const res = await chatComplete({
          userPrompt: 'Why the sky is blue?',
          connectorId,
          persist: true,
          observabilityAIAssistantAPIClient,
        });
        conversationId = res.conversationCreateEvent?.conversation.id || '';

        await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

        const simulator = await simulatorPromise;
        titleRequestBody = simulator.requestBody;
      });

      after(async () => {
        await clearConversations(es);
      });

      it('makes 2 requests to the LLM', () => {
        expect(llmProxy.interceptedRequests.length).to.be(2);
      });

      it('sends the correct system message to the LLM for the title', () => {
        expect(
          titleRequestBody.messages.find((message) => message.role === MessageRole.System)?.content
        ).to.be(TITLE_SYSTEM_MESSAGE);
      });

      it('sends the correct user message to the LLM for the title', () => {
        expect(
          titleRequestBody.messages.find((message) => message.role === MessageRole.User)?.content
        ).to.contain('Why the sky is blue?');
      });

      it('sends the correct function call to the LLM for the title', () => {
        expect(titleRequestBody.tools?.[0].function.name).to.be(TITLE_CONVERSATION_FUNCTION_NAME);
      });

      it('stores the generated title in the conversation', async () => {
        const { status, body } = await observabilityAIAssistantAPIClient.editor({
          endpoint: 'GET /internal/observability_ai_assistant/conversation/{conversationId}',
          params: {
            path: {
              conversationId,
            },
          },
        });
        expect(status).to.be(200);
        expect(body.conversation.title).to.be(TITLE);
      });
    });
  });
}
