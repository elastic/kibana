/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { first, last } from 'lodash';
import { ChatCompletionStreamParams } from 'openai/lib/ChatCompletionStream';
import {
  KnowledgeBaseEntry,
  MessageAddEvent,
  MessageRole,
} from '@kbn/observability-ai-assistant-plugin/common';
import { CONTEXT_FUNCTION_NAME } from '@kbn/observability-ai-assistant-plugin/server/functions/context/context';
import { Instruction } from '@kbn/observability-ai-assistant-plugin/common/types';
import { RecalledSuggestion } from '@kbn/observability-ai-assistant-plugin/server/functions/context/utils/recall_and_score';
import { SCORE_SUGGESTIONS_FUNCTION_NAME } from '@kbn/observability-ai-assistant-plugin/server/functions/context/utils/score_suggestions';
import { KnowledgeBaseDocument, LlmProxy, createLlmProxy } from '../../utils/create_llm_proxy';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../../ftr_provider_context';
import { addSampleDocsToInternalKb, clearKnowledgeBase } from '../../utils/knowledge_base';
import { chatComplete } from '../../utils/conversation';
import {
  deployTinyElserAndSetupKb,
  teardownTinyElserModelAndInferenceEndpoint,
} from '../../utils/model_and_inference';
import { restoreIndexAssets } from '../../utils/index_assets';

const screenContexts = [
  {
    screenDescription: 'User is viewing an active alert.',
    data: [
      {
        name: 'alert_fields',
        description: 'The fields and values for the alert',
        value: {
          'kibana.alert.rule.name': 'Error count threshold rule',
          'kibana.alert.status': 'active',
          'service.name': 'opbeans-go',
        },
      },
    ],
  },
];

const sampleDocsForInternalKb = [
  {
    id: 'favourite_color',
    title: 'Favorite Color',
    text: 'My favourite color is blue.',
  },
  {
    id: 'alert_instructions',
    title: 'Alert Handling Guide',
    text: 'All alerts should be considered high priority. Every alert is monitored every day. Threshold alerts should be resolved first. Consider this when analyzing alerts.',
  },
  {
    id: 'miscellaneous',
    title: 'Miscellaneous Note',
    text: 'hello again',
  },
];

const userPrompt = `What's my favourite color?`;

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const observabilityAIAssistantAPIClient = getService('observabilityAIAssistantApi');
  const es = getService('es');
  const log = getService('log');

  describe('tool: context', function () {
    // LLM Proxy is not yet support in MKI: https://github.com/elastic/obs-ai-assistant-team/issues/199
    this.tags(['skipCloud']);
    let llmProxy: LlmProxy;
    let connectorId: string;
    let messageAddedEvents: MessageAddEvent[];
    let getDocumentsToScore: () => Promise<KnowledgeBaseDocument[]>;

    before(async () => {
      llmProxy = await createLlmProxy(log);
      connectorId = await observabilityAIAssistantAPIClient.createProxyActionConnector({
        port: llmProxy.getPort(),
      });
      await restoreIndexAssets(getService);
      await deployTinyElserAndSetupKb(getService);
      await addSampleDocsToInternalKb(getService, sampleDocsForInternalKb);

      void llmProxy.interceptQueryRewrite('This is a rewritten user prompt.');
      ({ getDocumentsToScore } = llmProxy.interceptScoreToolChoice(log));

      void llmProxy.interceptWithResponse('Your favourite color is blue.');

      ({ messageAddedEvents } = await chatComplete({
        userPrompt,
        screenContexts,
        connectorId,
        observabilityAIAssistantAPIClient,
      }));

      await llmProxy.waitForAllInterceptorsToHaveBeenCalled();
    });

    after(async () => {
      llmProxy.close();
      await observabilityAIAssistantAPIClient.deleteActionConnector({
        actionId: connectorId,
      });

      await teardownTinyElserModelAndInferenceEndpoint(getService);
      await clearKnowledgeBase(es);
    });

    afterEach(async () => {
      llmProxy.clear();
    });

    describe('calling the context function via /chat/complete', () => {
      let firstRequestBody: ChatCompletionStreamParams; // rewrite prompt request
      let secondRequestBody: ChatCompletionStreamParams; // scoring documents request
      let thirdRequestBody: ChatCompletionStreamParams; // sending user prompt request

      before(async () => {
        firstRequestBody = llmProxy.interceptedRequests[0].requestBody;
        secondRequestBody = llmProxy.interceptedRequests[1].requestBody;
        thirdRequestBody = llmProxy.interceptedRequests[2].requestBody;
      });

      it('makes 3 requests to the LLM', () => {
        expect(llmProxy.interceptedRequests.length).to.be(3);
      });

      it('emits 3 messageAdded events', () => {
        expect(messageAddedEvents.length).to.be(3);
      });

      describe('The first request - Rewriting the user prompt', () => {
        function getSystemMessage(requestBody: ChatCompletionStreamParams) {
          return requestBody.messages.find((message) => message.role === MessageRole.System);
        }

        it('contains the correct number of messages', () => {
          expect(firstRequestBody.messages.length).to.be(2);
        });

        it('contains the system message as the first message in the request', () => {
          expect(first(firstRequestBody.messages)?.role === MessageRole.System);
        });

        it('includes instructions to rewrite the user prompt in the system message', () => {
          const systemMessage = getSystemMessage(firstRequestBody);
          expect(systemMessage?.content).to.contain(
            `You are a retrieval query-rewriting assistant`
          );
        });

        it('includes the conversation history in the system message', () => {
          const systemMessage = getSystemMessage(firstRequestBody);
          expect(systemMessage?.content).to.contain('<ConversationHistory>');
        });

        it('includes the screen context in the system message', () => {
          const systemMessage = getSystemMessage(firstRequestBody);
          expect(systemMessage?.content).to.contain('<ScreenDescription>');
          expect(systemMessage?.content).to.contain(screenContexts[0].screenDescription);
        });

        it('sends the user prompt to the LLM', () => {
          const lastUserMessage = firstRequestBody.messages[1];
          expect(lastUserMessage.role).to.be(MessageRole.User);
          expect(lastUserMessage.content).to.be(userPrompt);
        });
      });

      describe('The second request - Scoring documents', () => {
        it('contains the correct number of messages', () => {
          expect(secondRequestBody.messages.length).to.be(2);
        });

        it('contains the system message as the first message in the request', () => {
          expect(first(secondRequestBody.messages)?.role === MessageRole.System);
        });

        it('includes instructions for scoring in the system message', () => {
          const systemMessage = secondRequestBody.messages.find(
            (message) => message.role === MessageRole.System
          );

          expect(systemMessage?.content).to.contain(
            'For every document you must assign one integer score from 0 to 7 (inclusive) that answers the question'
          );
        });

        it('instructs the LLM with the correct tool_choice and tools for scoring', () => {
          // @ts-expect-error
          expect(secondRequestBody.tool_choice?.function?.name).to.be(
            SCORE_SUGGESTIONS_FUNCTION_NAME
          );
          expect(secondRequestBody.tools?.length).to.be(1);
          expect(first(secondRequestBody.tools)?.function.name).to.be(
            SCORE_SUGGESTIONS_FUNCTION_NAME
          );
        });

        it('sends the correct documents to the LLM', async () => {
          const extractedDocs = await getDocumentsToScore();
          const expectedTexts = sampleDocsForInternalKb.map((doc) => doc.text).sort();
          const actualTexts = extractedDocs.map((doc) => doc.text).sort();
          expect(actualTexts).to.eql(expectedTexts);
        });
      });

      describe('The third request - Sending the user prompt', () => {
        it('contains the correct number of messages', () => {
          expect(thirdRequestBody.messages.length).to.be(4);
        });

        it('contains the system message as the first message in the request', () => {
          expect(first(thirdRequestBody.messages)?.role === MessageRole.System);
        });

        it('contains the user prompt', () => {
          expect(thirdRequestBody.messages[1].role).to.be(MessageRole.User);
          expect(thirdRequestBody.messages[1].content).to.be(userPrompt);
        });

        it('leaves the LLM to choose the correct tool by leave tool_choice as auto and passes tools', () => {
          expect(thirdRequestBody.tool_choice).to.be('auto');
          expect(thirdRequestBody.tools?.length).to.not.be(0);
        });

        it('contains the tool call for context and the corresponding response', () => {
          expect(thirdRequestBody.messages[2].role).to.be(MessageRole.Assistant);
          // @ts-expect-error
          expect(thirdRequestBody.messages[2].tool_calls[0].function.name).to.be(
            CONTEXT_FUNCTION_NAME
          );

          expect(last(thirdRequestBody.messages)?.role).to.be('tool');
          // @ts-expect-error
          expect(last(thirdRequestBody.messages)?.tool_call_id).to.equal(
            // @ts-expect-error
            thirdRequestBody.messages[2].tool_calls[0].id
          );
        });

        it('sends the knowledge base entries to the LLM', () => {
          const content = last(thirdRequestBody.messages)?.content as string;
          const parsedContent = JSON.parse(content);
          const learnings = parsedContent.learnings;

          const expectedTexts = sampleDocsForInternalKb.map((doc) => doc.text).sort();
          const actualTexts = learnings.map((learning: KnowledgeBaseEntry) => learning.text).sort();

          expect(actualTexts).to.eql(expectedTexts);
        });
      });

      describe('information retrieval', () => {
        let contextFunctionResponse: MessageAddEvent | undefined;

        before(() => {
          contextFunctionResponse = messageAddedEvents.find(
            ({ message }) => message.message.name === CONTEXT_FUNCTION_NAME
          );
        });

        it('retrieves the screen context correctly', async () => {
          expect(contextFunctionResponse).to.not.be(null);

          const parsedContextResponseContent = JSON.parse(
            contextFunctionResponse!.message.message.content!
          );
          expect(parsedContextResponseContent).to.have.property('screen_description');
          expect(parsedContextResponseContent.screen_description).to.contain(
            screenContexts[0].screenDescription
          );
        });

        it('retrieves entries from the KB correctly with a score', async () => {
          const parsedContextResponseData = JSON.parse(
            contextFunctionResponse!.message.message.data!
          );
          expect(parsedContextResponseData).to.have.property('suggestions');
          expect(parsedContextResponseData.suggestions).to.be.an('array');
          expect(parsedContextResponseData.suggestions.length).to.be(3);

          parsedContextResponseData.suggestions.forEach((suggestion: RecalledSuggestion) => {
            expect(suggestion).to.have.property('id');
            expect(suggestion).to.have.property('text');
            expect(suggestion).to.have.property('esScore');
          });

          const suggestionTexts = parsedContextResponseData.suggestions
            .map((s: KnowledgeBaseEntry) => s.text)
            .sort();

          const sampleDocTexts = sampleDocsForInternalKb
            .map((doc: Instruction & { title: string }) => doc.text)
            .sort();

          expect(suggestionTexts).to.eql(sampleDocTexts);
        });
      });
    });
  });
}
