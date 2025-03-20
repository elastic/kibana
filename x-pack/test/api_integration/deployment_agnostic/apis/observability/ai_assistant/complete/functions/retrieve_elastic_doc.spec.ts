/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
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
    const USER_MESSAGE = 'What is Kibana Lens?';

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
          userPrompt: USER_MESSAGE,
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
            (message) => message.role === 'user' && (message.content as string) === USER_MESSAGE
          )
        );
        expect(everyRequestHasUserMessage).to.be(true);
      });
    });

    // Calling `retrieve_elastic_doc` via the chat/complete endpoint
    describe('POST /internal/observability_ai_assistant/chat/complete', function () {
      let llmProxy: LlmProxy;
      let connectorId: string;
      before(async () => {
        llmProxy = await createLlmProxy(log);
        connectorId = await observabilityAIAssistantAPIClient.createProxyActionConnector({
          port: llmProxy.getPort(),
        });
        await installProductDoc(supertest);

        void llmProxy.interceptWithFunctionRequest({
          name: 'retrieve_elastic_doc',
          arguments: () => JSON.stringify({}),
        });

        void llmProxy.interceptConversation('Hello from LLM Proxy');

        await chatComplete({
          userPrompt: USER_MESSAGE,
          connectorId,
          observabilityAIAssistantAPIClient,
        });

        await llmProxy.waitForAllInterceptorsToHaveBeenCalled();
      });

      after(async () => {
        await uninstallProductDoc(supertest);
        llmProxy.close();
        await observabilityAIAssistantAPIClient.deleteActionConnector({
          actionId: connectorId,
        });
      });

      it('makes 6 requests to the LLM', () => {
        expect(llmProxy.interceptedRequests.length).to.be(6);
      });

      it('every request contain retrieve_elastic_doc function', () => {
        const everyRequestHasRetrieveElasticDoc = llmProxy.interceptedRequests.every(
          ({ requestBody }) =>
            requestBody.tools?.some((t) => t.function.name === 'retrieve_elastic_doc')
        );
        expect(everyRequestHasRetrieveElasticDoc).to.be(true);
      });

      it('contains the original user message', () => {
        const everyRequestHasUserMessage = llmProxy.interceptedRequests.every(({ requestBody }) =>
          requestBody.messages.some(
            (message) => message.role === 'user' && (message.content as string) === USER_MESSAGE
          )
        );
        expect(everyRequestHasUserMessage).to.be(true);
      });
    });
  });
}
