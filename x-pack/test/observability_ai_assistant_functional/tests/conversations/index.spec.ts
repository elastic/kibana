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
import { parse as parseCookie } from 'tough-cookie';
import { kbnTestConfig } from '@kbn/test';
import { systemMessageSorted } from '../../../api_integration/deployment_agnostic/apis/observability/ai_assistant/utils/conversation';
import {
  createLlmProxy,
  LlmProxy,
} from '../../../api_integration/deployment_agnostic/apis/observability/ai_assistant/utils/create_llm_proxy';
import { FtrProviderContext } from '../../ftr_provider_context';

import { editor } from '../../common/users/users';
import { deleteConnectors } from '../../common/connectors';
import { deleteConversations } from '../../common/conversations';

export default function ApiTest({ getService, getPageObjects }: FtrProviderContext) {
  const observabilityAIAssistantAPIClient = getService('observabilityAIAssistantApi');
  const ui = getService('observabilityAIAssistantUI');
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const retry = getService('retry');
  const log = getService('log');
  const telemetry = getService('kibana_ebt_ui');
  const toasts = getService('toasts');
  const { header } = getPageObjects(['header', 'security']);
  const flyoutService = getService('flyout');

  async function login(username: string, password: string | undefined) {
    const response = await supertestWithoutAuth
      .post('/internal/security/login')
      .set('kbn-xsrf', 'xxx')
      .send({
        providerType: 'basic',
        providerName: 'basic',
        currentURL: '/',
        params: { username, password },
      })
      .expect(200);
    return parseCookie(response.headers['set-cookie'][0])!;
  }

  async function createOldConversation() {
    const { password } = kbnTestConfig.getUrlParts();
    const sessionCookie = await login(editor.username, password);
    const endpoint = '/internal/observability_ai_assistant/conversation';
    const cookie = sessionCookie.cookieString();
    const params = {
      body: {
        conversation: {
          messages: [
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
                  arguments: '{}',
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
          },
          '@timestamp': '2024-04-18T14:29:22.948',
          public: false,
          numeric_labels: {},
          labels: {},
        },
      },
    };
    await supertestWithoutAuth
      .post(endpoint)
      .set('kbn-xsrf', 'xxx')
      .set('Cookie', cookie)
      .send(params.body);
  }

  describe('Conversations', () => {
    let proxy: LlmProxy;
    before(async () => {
      await deleteConnectors(supertest);
      await deleteConversations(getService);

      await createOldConversation();

      proxy = await createLlmProxy(log);

      await ui.auth.login('editor');

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

            await testSubjects.clickWhenNotDisabled(ui.pages.createConnectorFlyout.saveButton);

            await retry.waitFor('Connector created toast', async () => {
              const count = await toasts.getCount();
              return count > 0;
            });

            await toasts.dismissAll();
          });

          it('creates a connector', async () => {
            const response = await observabilityAIAssistantAPIClient.editor({
              endpoint: 'GET /internal/observability_ai_assistant/connectors',
            });

            expect(response.body.length).to.eql(1);
          });

          describe('after refreshing the page', () => {
            before(async () => {
              await browser.refresh();
            });

            it('shows a setup kb button', async () => {
              await testSubjects.existOrFail(ui.pages.conversations.installKnowledgeBaseButton);
            });

            it('has an input field enabled', async () => {
              await testSubjects.existOrFail(ui.pages.conversations.chatInput);
              await testSubjects.isEnabled(ui.pages.conversations.chatInput);
            });

            describe('and sending over some text', () => {
              const expectedTitle = 'My title';
              const expectedResponse = 'My response';

              before(async () => {
                void proxy.interceptTitle(expectedTitle);
                void proxy.interceptWithResponse(expectedResponse);

                await testSubjects.setValue(ui.pages.conversations.chatInput, 'hello');
                await testSubjects.pressEnter(ui.pages.conversations.chatInput);

                await proxy.waitForAllInterceptorsToHaveBeenCalled();
                await header.waitUntilLoadingHasFinished();
              });

              it('creates a conversation and updates the URL', async () => {
                const response = await observabilityAIAssistantAPIClient.editor({
                  endpoint: 'POST /internal/observability_ai_assistant/conversations',
                });

                const functionResponse = await observabilityAIAssistantAPIClient.editor({
                  endpoint: 'GET /internal/observability_ai_assistant/functions',
                  params: {
                    query: {
                      scopes: ['observability'],
                    },
                  },
                });

                const primarySystemMessage = functionResponse.body.systemMessage;

                expect(response.body.conversations.length).to.eql(2);

                expect(response.body.conversations[0].conversation.title).to.be(expectedTitle);

                const { messages, systemMessage } = response.body.conversations[0];

                expect(messages.length).to.eql(4);

                const [firstUserMessage, contextRequest, contextResponse, assistantResponse] =
                  messages.map((msg) => msg.message);

                expect(systemMessage).to.contain(
                  '# System Prompt: Elastic Observability Assistant\n\n## Role and Goal\n\nYou are a specialized, helpful assistant for Elastic Observability users.'
                );

                expect(systemMessageSorted(systemMessage!)).to.eql(
                  systemMessageSorted(primarySystemMessage)
                );

                expect(firstUserMessage.content).to.eql('hello');

                expect(pick(contextRequest.function_call, 'name', 'arguments')).to.eql({
                  name: 'context',
                });

                expect(contextResponse.name).to.eql('context');

                const parsedContext = JSON.parse(contextResponse.content || '');

                expect(parsedContext.screen_description).to.contain('The user is looking at');

                expect(pick(assistantResponse, 'role', 'content')).to.eql({
                  role: 'assistant',
                  content: expectedResponse,
                });
              });

              it('updates the list of conversations', async () => {
                const links = await testSubjects.findAll(ui.pages.conversations.conversationLink);
                expect(links.length).to.eql(2);

                const title = await links[0].getVisibleText();
                expect(title).to.eql(expectedTitle);
              });

              describe('and adding another prompt', () => {
                before(async () => {
                  void proxy.interceptWithResponse('My second response');

                  await testSubjects.setValue(ui.pages.conversations.chatInput, 'hello');
                  await testSubjects.pressEnter(ui.pages.conversations.chatInput);

                  await proxy.waitForAllInterceptorsToHaveBeenCalled();
                  await header.waitUntilLoadingHasFinished();
                });

                it('does not create another conversation', async () => {
                  const response = await observabilityAIAssistantAPIClient.editor({
                    endpoint: 'POST /internal/observability_ai_assistant/conversations',
                  });

                  expect(response.body.conversations.length).to.eql(2);
                });

                it('appends to the existing one', async () => {
                  const response = await observabilityAIAssistantAPIClient.editor({
                    endpoint: 'POST /internal/observability_ai_assistant/conversations',
                  });

                  const messages = response.body.conversations[0].messages.slice(4);

                  expect(messages.length).to.eql(4);

                  const [userReply, contextRequest, contextResponse, assistantResponse] =
                    messages.map((msg) => msg.message);

                  expect(userReply.content).to.eql('hello');

                  expect(pick(contextRequest.function_call, 'name', 'arguments')).to.eql({
                    name: 'context',
                  });

                  expect(contextResponse.name).to.eql('context');

                  expect(pick(assistantResponse, 'role', 'content')).to.eql({
                    role: 'assistant',
                    content: 'My second response',
                  });

                  expect(response.body.conversations[0].messages.length).to.eql(8);
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

                  const { feedback, conversation } = events[0]
                    .properties as unknown as ChatFeedback;

                  expect(feedback).to.eql('positive');
                  expect(conversation.namespace).to.eql('default');
                  expect(conversation.public).to.eql(false);
                  expect(conversation.user?.name).to.eql('editor');

                  expect(conversation.conversation).to.not.have.property('title');
                  expect(conversation).to.not.have.property('messages');
                });
              });
            });

            describe('and opening an old conversation', () => {
              before(async () => {
                const conversations = await testSubjects.findAll(
                  ui.pages.conversations.conversationLink
                );

                await conversations[0].click();
              });

              describe('and sending another prompt', () => {
                before(async () => {
                  void proxy.interceptWithResponse(
                    'Service Level Indicators (SLIs) are quantifiable defined metrics that measure the performance and availability of a service or distributed system.'
                  );

                  await testSubjects.setValue(
                    ui.pages.conversations.chatInput,
                    'And what are SLIs?'
                  );
                  await testSubjects.pressEnter(ui.pages.conversations.chatInput);

                  await proxy.waitForAllInterceptorsToHaveBeenCalled();
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

                    const { feedback, conversation } = events[1]
                      .properties as unknown as ChatFeedback;

                    expect(feedback).to.eql('positive');
                    expect(conversation.namespace).to.eql('default');
                    expect(conversation.public).to.eql(false);
                    expect(conversation.user?.name).to.eql('editor');

                    expect(conversation.conversation).to.not.have.property('title');
                    expect(conversation).to.not.have.property('messages');
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
      await deleteConnectors(supertest);
      await deleteConversations(getService);

      await ui.auth.logout();
      proxy.close();
    });
  });
}
