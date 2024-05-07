/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { MessageRole } from '@kbn/observability-ai-assistant-plugin/common';
import { ChatFeedback } from '@kbn/observability-ai-assistant-plugin/public/analytics/schemas/chat_feedback';
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
  const telemetry = getService('kibana_ebt_ui');

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

  async function createOldConversation() {
    await observabilityAIAssistantAPIClient.testUser({
      endpoint: 'POST /internal/observability_ai_assistant/conversation',
      params: {
        body: {
          conversation: {
            messages: [
              {
                '@timestamp': '2024-04-18T14:28:50.118Z',
                message: {
                  role: MessageRole.System,
                  content:
                    'You are a helpful assistant for Elastic Observability. Your goal is to help the Elastic Observability users to quickly assess what is happening in their observed systems. You can help them visualise and analyze data, investigate their systems, perform root cause analysis or identify optimisation opportunities.\n\nIt\'s very important to not assume what the user is meaning. Ask them for clarification if needed.\n\nIf you are unsure about which function should be used and with what arguments, ask the user for clarification or confirmation.\n\nIn KQL ("kqlFilter")) escaping happens with double quotes, not single quotes. Some characters that need escaping are: \':()\\        /". Always put a field value in double quotes. Best: service.name:"opbeans-go". Wrong: service.name:opbeans-go. This is very important!\n\nYou can use Github-flavored Markdown in your responses. If a function returns an array, consider using a Markdown table to format the response.\n\nNote that ES|QL (the Elasticsearch Query Language which is a new piped language) is the preferred query language.\n\nYou MUST use the "query" function when the user wants to:\n- visualize data\n- run any arbitrary query\n- breakdown or filter ES|QL queries that are displayed on the current page\n- convert queries from another language to ES|QL\n- asks general questions about ES|QL\n\nDO NOT UNDER ANY CIRCUMSTANCES generate ES|QL queries or explain anything about the ES|QL query language yourself.\nDO NOT UNDER ANY CIRCUMSTANCES try to correct an ES|QL query yourself - always use the "query" function for this.\n\nDO NOT UNDER ANY CIRCUMSTANCES USE ES|QL syntax (`service.name == "foo"`) with "kqlFilter" (`service.name:"foo"`).\n\nEven if the "context" function was used before that, follow it up with the "query" function. If a query fails, do not attempt to correct it yourself. Again you should call the "query" function,\neven if it has been called before.\n\nWhen the "visualize_query" function has been called, a visualization has been displayed to the user. DO NOT UNDER ANY CIRCUMSTANCES follow up a "visualize_query" function call with your own visualization attempt.\nIf the "execute_query" function has been called, summarize these results for the user. The user does not see a visualization in this case.\n\nYou MUST use the get_dataset_info function  function before calling the "query" or "changes" function.\n\nIf a function requires an index, you MUST use the results from the dataset info functions.\n\n\n\nThe user is able to change the language which they want you to reply in on the settings page of the AI Assistant for Observability, which can be found in the Stack Management app under the option AI Assistants.\nIf the user asks how to change the language, reply in the same language the user asked in.You do not have a working memory. If the user expects you to remember the previous conversations, tell them they can set up the knowledge base.\n\nYou MUST respond in the users preferred language which is: English.',
                },
              },
              {
                '@timestamp': '2024-04-18T14:29:01.615Z',
                message: {
                  content: 'What are SLOs?',
                  role: MessageRole.User,
                },
              },
              {
                '@timestamp': '2024-04-18T14:29:01.876Z',
                message: {
                  role: MessageRole.Assistant,
                  content: '',
                  function_call: {
                    name: 'context',
                    arguments: '{"queries":[],"categories":[]}',
                    trigger: MessageRole.Assistant,
                  },
                },
              },
              {
                '@timestamp': '2024-04-18T14:29:01.876Z',
                message: {
                  content:
                    '{"screen_description":"The user is looking at http://localhost:5601/ftw/app/observabilityAIAssistant/conversations/new. The current time range is 2024-04-18T14:13:49.815Z - 2024-04-18T14:28:49.815Z.","learnings":[]}',
                  name: 'context',
                  role: MessageRole.User,
                },
              },
              {
                '@timestamp': '2024-04-18T14:29:22.945Z',
                message: {
                  content:
                    "SLOs, or Service Level Objectives, are a key part of the Site Reliability Engineering (SRE) methodology. They are a target value or range of values for a service level that is measured by an SLI (Service Level Indicator). \n\nAn SLO is a goal for how often and how much you want your service to meet a particular SLI. For example, you might have an SLO that your service should be up and running 99.9% of the time. \n\nSLOs are important because they set clear expectations for your team and your users about the level of service you aim to provide. They also help you make decisions about where to focus your efforts: if you're meeting your SLOs, you can focus on building new features; if you're not meeting your SLOs, you need to focus on improving reliability. \n\nIn Elastic Observability, you can define and monitor your SLOs to ensure your services are meeting their targets.",
                  function_call: {
                    name: '',
                    arguments: '',
                    trigger: MessageRole.Assistant,
                  },
                  role: MessageRole.Assistant,
                },
              },
            ],
            conversation: {
              title: 'My old conversation',
              token_count: {
                completion: 1,
                prompt: 1,
                total: 2,
              },
            },
            '@timestamp': '2024-04-18T14:29:22.948',
            public: false,
            numeric_labels: {},
            labels: {},
          },
        },
      },
    });
  }

  describe('Conversations', () => {
    let proxy: LlmProxy;
    before(async () => {
      await deleteConnectors();
      await deleteConversations();

      await createOldConversation();

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

                expect(response.body.conversations.length).to.eql(2);

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
                expect(links.length).to.eql(2);

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

                  expect(response.body.conversations.length).to.eql(2);
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

              describe('and choosing to send feedback', () => {
                before(async () => {
                  await telemetry.setOptIn(true);
                  await testSubjects.click(ui.pages.conversations.positiveFeedbackButton);
                });

                it('emits a telemetry event that captures the conversation', async () => {
                  const events = await telemetry.getEvents(1, {
                    eventTypes: ['observability_ai_assistant_chat_feedback'],
                  });

                  expect(events.length).to.eql(1);

                  const { messageWithFeedback, conversation } = events[0]
                    .properties as unknown as ChatFeedback;

                  expect(messageWithFeedback.feedback).to.eql('positive');
                  expect(messageWithFeedback.message.message).to.eql({
                    content: 'My response',
                    function_call: {
                      arguments: '',
                      name: '',
                      trigger: 'assistant',
                    },
                    role: 'assistant',
                  });

                  expect(conversation.conversation.title).to.eql('My title');
                  expect(conversation.namespace).to.eql('default');
                  expect(conversation.public).to.eql(false);
                  expect(conversation.user?.name).to.eql('test_user');

                  const { messages } = conversation;

                  expect(messages.length).to.eql(9);

                  expect(messages[0].message.role).to.eql('system');
                  // Verify that system message extension that happen on the server are captured in the telemetry
                  expect(messages[0].message.content).to.contain(
                    'You MUST respond in the users preferred language which is: English.'
                  );
                });
              });
            });

            describe('and opening an old conversation', () => {
              before(async () => {
                const conversations = await testSubjects.findAll(
                  ui.pages.conversations.conversationLink
                );
                await conversations[1].click();
              });

              describe('and sending another prompt', () => {
                before(async () => {
                  const conversationInterceptor = proxy.intercept('conversation', () => true);

                  await testSubjects.setValue(
                    ui.pages.conversations.chatInput,
                    'And what are SLIs?'
                  );
                  await testSubjects.pressEnter(ui.pages.conversations.chatInput);

                  const conversationSimulator = await conversationInterceptor.waitForIntercept();

                  await conversationSimulator.next(
                    'Service Level Indicators (SLIs) are quantifiable defined metrics that measure the performance and availability of a service or distributed system.'
                  );
                  await conversationSimulator.complete();

                  await header.waitUntilLoadingHasFinished();
                });

                describe('and choosing to send feedback', () => {
                  before(async () => {
                    await telemetry.setOptIn(true);
                    const feedbackButtons = await testSubjects.findAll(
                      ui.pages.conversations.positiveFeedbackButton
                    );
                    await feedbackButtons[feedbackButtons.length - 1].click();
                  });

                  it('emits a telemetry event that captures the conversation', async () => {
                    const events = await telemetry.getEvents(2, {
                      eventTypes: ['observability_ai_assistant_chat_feedback'],
                    });

                    expect(events.length).to.eql(2);

                    const { messageWithFeedback, conversation } = events[1]
                      .properties as unknown as ChatFeedback;

                    expect(messageWithFeedback.feedback).to.eql('positive');
                    expect(messageWithFeedback.message.message).to.eql({
                      content:
                        'Service Level Indicators (SLIs) are quantifiable defined metrics that measure the performance and availability of a service or distributed system.',
                      function_call: {
                        arguments: '',
                        name: '',
                        trigger: 'assistant',
                      },
                      role: 'assistant',
                    });

                    expect(conversation.conversation.title).to.eql('My old conversation');
                    expect(conversation.namespace).to.eql('default');
                    expect(conversation.public).to.eql(false);
                    expect(conversation.user?.name).to.eql('test_user');

                    const { messages } = conversation;

                    // Verify that data changed after user interaction before being sent to telemetry
                    expect(messages.length).to.eql(9);
                  });
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
