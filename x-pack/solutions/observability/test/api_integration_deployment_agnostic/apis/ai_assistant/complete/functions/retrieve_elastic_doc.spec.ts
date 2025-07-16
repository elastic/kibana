/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ChatCompletionStreamParams } from 'openai/lib/ChatCompletionStream';
import { ChatCompletionMessageParam } from 'openai/resources';
import { last } from 'lodash';
import { MessageAddEvent, MessageRole } from '@kbn/observability-ai-assistant-plugin/common';
import { LlmProxy, createLlmProxy } from '../../utils/create_llm_proxy';
import { chatComplete } from '../../utils/conversation';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';
import { installProductDoc, uninstallProductDoc } from '../../utils/product_doc_base';
import {
  deployTinyElserAndSetupKb,
  teardownTinyElserModelAndInferenceEndpoint,
} from '../../utils/model_and_inference';

const DEFAULT_INFERENCE_ID = 'tiny_elser_inference_id';

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const log = getService('log');
  const observabilityAIAssistantAPIClient = getService('observabilityAIAssistantApi');

  describe('tool: retrieve_elastic_doc', function () {
    // Fails on MKI: https://github.com/elastic/kibana/issues/205581
    this.tags(['skipCloud']);
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
        void llmProxy.interceptWithResponse('Hello from LLM Proxy');

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
        await deployTinyElserAndSetupKb(getService);

        await installProductDoc(supertest, DEFAULT_INFERENCE_ID);

        void llmProxy.interceptWithFunctionRequest({
          name: 'retrieve_elastic_doc',
          arguments: () =>
            JSON.stringify({
              query: USER_PROMPT,
            }),
          when: () => true,
        });

        void llmProxy.interceptWithResponse('Hello from LLM Proxy');

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
        await uninstallProductDoc(supertest, DEFAULT_INFERENCE_ID);
        llmProxy.close();
        await observabilityAIAssistantAPIClient.deleteActionConnector({
          actionId: connectorId,
        });
        await teardownTinyElserModelAndInferenceEndpoint(getService);
      });

      it('makes 2 requests to the LLM', () => {
        expect(llmProxy.interceptedRequests.length).to.be(2);
      });

      it('emits 5 messageAdded events', () => {
        expect(messageAddedEvents.length).to.be(5);
      });

      describe('The first request', () => {
        it('enables the LLM to call `retrieve_elastic_doc`', () => {
          expect(firstRequestBody.tool_choice).to.be('auto');
          expect(firstRequestBody.tools?.map((t) => t.function.name)).to.contain(
            'retrieve_elastic_doc'
          );
        });
      });

      describe('The second request - Sending the user prompt', () => {
        let lastMessage: ChatCompletionMessageParam;
        let parsedContent: { documents: Array<{ title: string; content: string; url: string }> };
        before(() => {
          lastMessage = last(secondRequestBody.messages) as ChatCompletionMessageParam;
          parsedContent = JSON.parse(lastMessage.content as string);
        });
        it('includes the retrieve_elastic_doc function call', () => {
          expect(secondRequestBody.messages[4].role).to.be(MessageRole.Assistant);
          // @ts-expect-error
          expect(secondRequestBody.messages[4].tool_calls[0].function.name).to.be(
            'retrieve_elastic_doc'
          );
        });

        it('responds with the correct tool message', () => {
          expect(lastMessage?.role).to.be('tool');
          // @ts-expect-error
          expect(lastMessage?.tool_call_id).to.equal(
            // @ts-expect-error
            secondRequestBody.messages[4].tool_calls[0].id
          );
        });
        it('sends the retrieved documents from Elastic docs to the LLM', () => {
          expect(lastMessage.content).to.be.a('string');
        });

        it('should send 1 document to the llm', () => {
          expect(parsedContent.documents.length).to.be(1);
        });

        it('should validate the structure and content of the retrieved document', () => {
          const document = parsedContent.documents[0];
          expect(document).to.not.be(undefined);
          expect(document).to.eql({
            title: 'Lens',
            url: 'https://www.elastic.co/docs/explore-analyze/visualize/lens',
            content:
              '## Lens\nTo create a visualization, drag the data fields you want to visualize to the workspace, then Lens uses visualization best practices to apply the fields and create a visualization that best displays the data.\n\nWith Lens, you can:\n\n- Create area, line, and bar charts with layers to display multiple indices and chart types.\n- Change the aggregation function to change the data in the visualization.\n- Create custom tables.\n- Perform math on aggregations using Formula.\n- Use time shifts to compare the data in two time intervals, such as month over month.\n- Add annotations and reference lines.',
            summarized: false,
          });
        });
      });
    });
  });
}
