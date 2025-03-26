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
import {
  LlmProxy,
  createLlmProxy,
} from '../../../../../../../observability_ai_assistant_api_integration/common/create_llm_proxy';
import { chatComplete } from '../../utils/conversation';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../../ftr_provider_context';

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const log = getService('log');
  const observabilityAIAssistantAPIClient = getService('observabilityAIAssistantApi');

  // Failing: See https://github.com/elastic/kibana/issues/215952
  describe.skip('when calling the title_conversation function', function () {
    // Fails on MKI: https://github.com/elastic/kibana/issues/205581
    this.tags(['failsOnMKI']);
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
        void llmProxy.interceptTitle(TITLE);
        void llmProxy.interceptConversation('The sky is blue because of Rayleigh scattering.');

        const res = await chatComplete({
          userPrompt: 'Why the sky is blue?',
          connectorId,
          persist: true,
          observabilityAIAssistantAPIClient,
        });
        conversationId = res.conversationCreateEvent?.conversation.id || '';

        await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

        titleRequestBody = llmProxy.interceptedRequests[0].requestBody;
      });

      it('makes 2 requests to the LLM', () => {
        expect(llmProxy.interceptedRequests.length).to.be(2);
      });

      it('sends the correct system message to the LLM for the title', () => {
        expect(
          titleRequestBody.messages.find((message) => message.role === 'system')?.content
        ).to.be(TITLE_SYSTEM_MESSAGE);
      });

      it('sends the correct user message to the LLM for the title', () => {
        expect(
          titleRequestBody.messages.find((message) => message.role === 'user')?.content
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
