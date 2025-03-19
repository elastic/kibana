/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ChatCompletionStreamParams } from 'openai/lib/ChatCompletionStream';
import { first, last } from 'lodash';
import { MessageAddEvent, MessageRole } from '@kbn/observability-ai-assistant-plugin/common';
import {
  LlmProxy,
  createLlmProxy,
} from '../../../../../../../observability_ai_assistant_api_integration/common/create_llm_proxy';
import { chatComplete } from '../../utils/conversation';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../../ftr_provider_context';
import { installProductDoc, uninstallProductDoc } from '../../utils/product_doc_base';

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const log = getService('log');
  const observabilityAIAssistantAPIClient = getService('observabilityAIAssistantApi');

  describe('retrieve_elastic_doc', function () {
    // Fails on MKI: https://github.com/elastic/kibana/issues/205581
    this.tags(['failsOnMKI']);
    const supertest = getService('supertest');
    const USER_PROMPT = 'What is Kibana Lens?';

    describe('POST /internal/observability_ai_assistant/chat/complete without product doc installed', function () {
      let llmProxy: LlmProxy;
      let connectorId: string;

      before(async () => {
        llmProxy = await createLlmProxy(log);
        connectorId = await observabilityAIAssistantAPIClient.createProxyActionConnector({
          port: llmProxy.getPort(),
        });
        void llmProxy.interceptConversation('Hello from LLM Proxy');

        await chatComplete({
          userPrompt: USER_PROMPT,
          connectorId,
          observabilityAIAssistantAPIClient,
        });

        await llmProxy.waitForAllInterceptorsToHaveBeenCalled();
      });

      after(async () => {
        llmProxy.close();
        await observabilityAIAssistantAPIClient.deleteActionConnector({
          actionId: connectorId,
        });
      });

      afterEach(async () => {
        llmProxy.clear();
      });

      it('makes 1 requests to the LLM', () => {
        expect(llmProxy.interceptedRequests.length).to.be(1);
      });

      it('not contain retrieve_elastic_doc function when product doc is not installed', () => {
        expect(
          llmProxy.interceptedRequests.flatMap(({ requestBody }) =>
            requestBody.tools?.map((t) => t.function.name)
          )
        ).to.not.contain('retrieve_elastic_doc');
      });

      it('contains the original user message', () => {
        const everyRequestHasUserMessage = llmProxy.interceptedRequests.every(({ requestBody }) =>
          requestBody.messages.some(
            (message) => message.role === 'user' && (message.content as string) === USER_PROMPT
          )
        );
        expect(everyRequestHasUserMessage).to.be(true);
      });
    });

    // Calling `retrieve_elastic_doc` via the chat/complete endpoint
    describe('POST /internal/observability_ai_assistant/chat/complete', function () {
      let llmProxy: LlmProxy;
      let connectorId: string;
      let messageAddedEvents: MessageAddEvent[];
      let firstRequestBody: ChatCompletionStreamParams;
      let secondRequestBody: ChatCompletionStreamParams;
      before(async () => {
        llmProxy = await createLlmProxy(log);
        connectorId = await observabilityAIAssistantAPIClient.createProxyActionConnector({
          port: llmProxy.getPort(),
        });
        await installProductDoc(supertest);

        void llmProxy.interceptWithFunctionRequest({
          name: 'retrieve_elastic_doc',
          arguments: () =>
            JSON.stringify({
              query: USER_PROMPT,
            }),
          when: () => true,
        });

        void llmProxy.interceptConversation('Hello from LLM Proxy');

        ({ messageAddedEvents } = await chatComplete({
          userPrompt: USER_PROMPT,
          connectorId,
          observabilityAIAssistantAPIClient,
        }));

        await llmProxy.waitForAllInterceptorsToHaveBeenCalled();
        firstRequestBody = llmProxy.interceptedRequests[0].requestBody;
        secondRequestBody = llmProxy.interceptedRequests[1].requestBody;
      });

      after(async () => {
        await uninstallProductDoc(supertest);
        llmProxy.close();
        await observabilityAIAssistantAPIClient.deleteActionConnector({
          actionId: connectorId,
        });
      });

      it('emits 5 messageAdded events', () => {
        expect(messageAddedEvents.length).to.be(5);
      });

      describe('The first request', () => {
        it('contains the correct number of messages', () => {
          expect(firstRequestBody.messages.length).to.be(4);
        });

        it('contains the system message as the first message in the request', () => {
          expect(first(firstRequestBody.messages)?.role === MessageRole.System);
        });

        it('contain retrieve_elastic_doc function', () => {
          expect(firstRequestBody.tools?.map((t) => t.function.name)).to.contain(
            'retrieve_elastic_doc'
          );
        });

        it('leaves the LLM to choose the correct tool by leave tool_choice as auto and passes tools', () => {
          expect(firstRequestBody.tool_choice).to.be('auto');
          expect(firstRequestBody.tools?.length).to.not.be(0);
        });

        it('contains the original user message', () => {
          expect(
            firstRequestBody.messages.find((message) => message.role === MessageRole.User)?.content
          ).to.be(USER_PROMPT);
        });
      });

      describe('The second request - Sending the user prompt', () => {
        it('contains the correct number of messages', () => {
          expect(secondRequestBody.messages.length).to.be(6);
        });

        it('contains the system message as the first message in the request', () => {
          expect(first(secondRequestBody.messages)?.role === MessageRole.System);
        });

        it('contains the user prompt', () => {
          expect(secondRequestBody.messages[1].role).to.be(MessageRole.User);
          expect(secondRequestBody.messages[1].content).to.be(USER_PROMPT);
        });

        it('contains the tool call for retrieve_elastic_doc and the corresponding response', () => {
          expect(secondRequestBody.messages[4].role).to.be(MessageRole.Assistant);
          // @ts-expect-error
          expect(secondRequestBody.messages[4].tool_calls[0].function.name).to.be(
            'retrieve_elastic_doc'
          );

          expect(last(secondRequestBody.messages)?.role).to.be('tool');
          // @ts-expect-error
          expect(last(secondRequestBody.messages)?.tool_call_id).to.equal(
            // @ts-expect-error
            secondRequestBody.messages[4].tool_calls[0].id
          );
        });
      });
    });
  });
}
