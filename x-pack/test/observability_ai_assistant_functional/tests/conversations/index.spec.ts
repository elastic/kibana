/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { pick } from 'lodash';
import type OpenAI from 'openai';
import {
  createLlmProxy,
  LlmProxy,
} from '../../../observability_ai_assistant_api_integration/common/create_llm_proxy';
import { interceptRequest } from '../../common/intercept_request';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ApiTest({ getService, getPageObjects }: FtrProviderContext) {
  const observabilityAIAssistantAPIClient = getService('observabilityAIAssistantAPIClient');
  const ui = getService('observabilityAIAssistantUI');
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');
  const supertest = getService('supertest');
  const retry = getService('retry');
  const log = getService('log');

  const driver = getService('__webdriver__');

  const toasts = getService('toasts');

  const { header } = getPageObjects(['header', 'common']);

  const flyoutService = getService('flyout');

  async function deleteConversations() {
    const response = await observabilityAIAssistantAPIClient.testUser({
      endpoint: 'POST /internal/observability_ai_assistant/conversations',
    });

    for (const conversation of response.body.conversations) {
      await observabilityAIAssistantAPIClient.testUser({
        endpoint: `DELETE /internal/observability_ai_assistant/conversation/{conversationId}`,
        params: {
          path: {
            conversationId: conversation.conversation.id,
          },
        },
      });
    }
  }

  async function deleteConnectors() {
    const response = await observabilityAIAssistantAPIClient.testUser({
      endpoint: 'GET /internal/observability_ai_assistant/connectors',
    });

    for (const connector of response.body) {
      await supertest
        .delete(`/api/actions/connector/${connector.id}`)
        .set('kbn-xsrf', 'foo')
        .expect(204);
    }
  }

  describe('Conversations', () => {
    let proxy: LlmProxy;
    before(async () => {
      await deleteConnectors();
      await deleteConversations();

      proxy = await createLlmProxy(log);

      await ui.auth.login();

      await ui.router.goto('/conversations/new', { path: {}, query: {} });
    });

    describe('without a connector', () => {
      it('should display the set up connectors button', async () => {
        await testSubjects.existOrFail(ui.pages.conversations.setupGenAiConnectorsButtonSelector);
      });

      describe('after clicking on the setup connectors button', async () => {
        before(async () => {
          await testSubjects.click(ui.pages.conversations.setupGenAiConnectorsButtonSelector);
        });

        it('opens a flyout', async () => {
          await testSubjects.existOrFail(ui.pages.createConnectorFlyout.flyout);
          await testSubjects.existOrFail(ui.pages.createConnectorFlyout.genAiCard);
          // TODO: https://github.com/elastic/obs-ai-assistant-team/issues/126
          // await testSubjects.missingOrFail(ui.pages.createConnectorFlyout.bedrockCard);
        });

        describe('after clicking on the Gen AI card and submitting the form', () => {
          before(async () => {
            await testSubjects.click(ui.pages.createConnectorFlyout.genAiCard);
            await testSubjects.setValue(ui.pages.createConnectorFlyout.nameInput, 'myConnector');
            await testSubjects.setValue(
              ui.pages.createConnectorFlyout.urlInput,
              `http://localhost:${proxy.getPort()}`
            );
            await testSubjects.setValue(ui.pages.createConnectorFlyout.apiKeyInput, 'myApiKey');

            // intercept the request to set up the knowledge base,
            // so we don't have to wait until it's fully downloaded
            await interceptRequest(
              driver.driver,
              '*kb\\/setup*',
              (responseFactory) => {
                return responseFactory.fail();
              },
              async () => {
                await testSubjects.clickWhenNotDisabled(ui.pages.createConnectorFlyout.saveButton);
              }
            );

            await retry.waitFor('Connector created toast', async () => {
              const count = await toasts.getCount();
              return count > 0;
            });

            await toasts.dismissAll();
          });

          it('creates a connector', async () => {
            const response = await observabilityAIAssistantAPIClient.testUser({
              endpoint: 'GET /internal/observability_ai_assistant/connectors',
            });

            expect(response.body.length).to.eql(1);
          });

          describe('after refreshing the page', () => {
            before(async () => {
              await browser.refresh();
            });

            it('shows a setup kb button', async () => {
              await testSubjects.existOrFail(ui.pages.conversations.retryButton);
            });

            it('has an input field enabled', async () => {
              await testSubjects.existOrFail(ui.pages.conversations.chatInput);
              await testSubjects.isEnabled(ui.pages.conversations.chatInput);
            });

            describe('and sending over some text', () => {
              before(async () => {
                const titleInterceptor = proxy.intercept(
                  'title',
                  (body) =>
                    (
                      JSON.parse(body) as OpenAI.Chat.ChatCompletionCreateParamsNonStreaming
                    ).tools?.find((fn) => fn.function.name === 'title_conversation') !== undefined
                );

                const conversationInterceptor = proxy.intercept(
                  'conversation',
                  (body) =>
                    (
                      JSON.parse(body) as OpenAI.Chat.ChatCompletionCreateParamsNonStreaming
                    ).tools?.find((fn) => fn.function.name === 'title_conversation') === undefined
                );

                await testSubjects.setValue(ui.pages.conversations.chatInput, 'hello');

                await testSubjects.pressEnter(ui.pages.conversations.chatInput);

                const [titleSimulator, conversationSimulator] = await Promise.all([
                  titleInterceptor.waitForIntercept(),
                  conversationInterceptor.waitForIntercept(),
                ]);

                await titleSimulator.next('My title');

                await titleSimulator.complete();

                await conversationSimulator.next('My response');

                await conversationSimulator.complete();

                await header.waitUntilLoadingHasFinished();
              });

              it('creates a conversation and updates the URL', async () => {
                const response = await observabilityAIAssistantAPIClient.testUser({
                  endpoint: 'POST /internal/observability_ai_assistant/conversations',
                });

                expect(response.body.conversations.length).to.eql(1);

                expect(response.body.conversations[0].conversation.title).to.be('My title');

                const { messages } = response.body.conversations[0];

                expect(messages.length).to.eql(5);

                const [
                  systemMessage,
                  firstUserMessage,
                  contextRequest,
                  contextResponse,
                  assistantResponse,
                ] = messages.map((msg) => msg.message);

                expect(systemMessage.role).to.eql('system');

                expect(firstUserMessage.content).to.eql('hello');

                expect(pick(contextRequest.function_call, 'name', 'arguments')).to.eql({
                  name: 'context',
                  arguments: JSON.stringify({ queries: [], categories: [] }),
                });

                expect(contextResponse.name).to.eql('context');

                const parsedContext = JSON.parse(contextResponse.content || '');

                expect(parsedContext.screen_description).to.contain('The user is looking at');

                expect(pick(assistantResponse, 'role', 'content')).to.eql({
                  role: 'assistant',
                  content: 'My response',
                });
              });

              it('updates the list of conversations', async () => {
                const links = await testSubjects.findAll(ui.pages.conversations.conversationLink);
                expect(links.length).to.eql(1);

                const title = await links[0].getVisibleText();
                expect(title).to.eql('My title');
              });

              describe('and adding another prompt', () => {
                before(async () => {
                  const conversationInterceptor = proxy.intercept('conversation', () => true);

                  await testSubjects.setValue(ui.pages.conversations.chatInput, 'hello');

                  await testSubjects.pressEnter(ui.pages.conversations.chatInput);

                  const conversationSimulator = await conversationInterceptor.waitForIntercept();

                  await conversationSimulator.next('My second response');

                  await conversationSimulator.complete();

                  await header.waitUntilLoadingHasFinished();
                });

                it('does not create another conversation', async () => {
                  const response = await observabilityAIAssistantAPIClient.testUser({
                    endpoint: 'POST /internal/observability_ai_assistant/conversations',
                  });

                  expect(response.body.conversations.length).to.eql(1);
                });

                it('appends to the existing one', async () => {
                  const response = await observabilityAIAssistantAPIClient.testUser({
                    endpoint: 'POST /internal/observability_ai_assistant/conversations',
                  });

                  const messages = response.body.conversations[0].messages.slice(5);

                  expect(messages.length).to.eql(4);

                  const [userReply, contextRequest, contextResponse, assistantResponse] =
                    messages.map((msg) => msg.message);

                  expect(userReply.content).to.eql('hello');

                  expect(pick(contextRequest.function_call, 'name', 'arguments')).to.eql({
                    name: 'context',
                    arguments: JSON.stringify({ queries: [], categories: [] }),
                  });

                  expect(contextResponse.name).to.eql('context');

                  expect(pick(assistantResponse, 'role', 'content')).to.eql({
                    role: 'assistant',
                    content: 'My second response',
                  });

                  expect(response.body.conversations[0].messages.length).to.eql(9);
                });
              });
            });
          });
        });

        after(async () => {
          await flyoutService.ensureAllClosed();
        });
      });
    });

    after(async () => {
      await deleteConnectors();
      await deleteConversations();

      await ui.auth.logout();
      proxy.close();
    });
  });
}
