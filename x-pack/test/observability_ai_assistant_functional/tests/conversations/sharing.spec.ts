/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  createLlmProxy,
  LlmProxy,
} from '../../../api_integration/deployment_agnostic/apis/observability/ai_assistant/utils/create_llm_proxy';
import { FtrProviderContext } from '../../ftr_provider_context';
import { createConnector, deleteConnectors } from '../../common/connectors';
import { deleteConversations } from '../../common/conversations';
import { interceptRequest } from '../../common/intercept_request';

export default function ApiTest({ getService, getPageObjects }: FtrProviderContext) {
  const observabilityAIAssistantAPIClient = getService('observabilityAIAssistantApi');
  const ui = getService('observabilityAIAssistantUI');
  const testSubjects = getService('testSubjects');
  const supertest = getService('supertest');
  const log = getService('log');
  const retry = getService('retry');
  const driver = getService('__webdriver__');

  const { header } = getPageObjects(['header', 'security']);
  const PageObjects = getPageObjects(['common', 'error', 'navigationalSearch', 'security']);

  const expectedTitle = 'My title';
  const expectedResponse = 'Hello from LLM Proxy';

  async function createConversation(proxy: LlmProxy) {
    await PageObjects.common.navigateToUrl('obsAIAssistant', '', {
      ensureCurrentUrl: false,
      shouldLoginIfPrompted: false,
      shouldUseHashForSubUrl: false,
    });

    void proxy.interceptTitle(expectedTitle);
    void proxy.interceptWithResponse(expectedResponse);

    await testSubjects.setValue(ui.pages.conversations.chatInput, 'Hello');
    await testSubjects.pressEnter(ui.pages.conversations.chatInput);

    await proxy.waitForAllInterceptorsToHaveBeenCalled();
    await header.waitUntilLoadingHasFinished();
  }

  describe('Conversation Sharing', () => {
    let proxy: LlmProxy;

    before(async () => {
      proxy = await createLlmProxy(log);
      await ui.auth.login('editor');
      await ui.router.goto('/conversations/new', { path: {}, query: {} });

      // cleanup previous connectors
      await deleteConnectors(supertest);
      // cleanup conversations
      await deleteConversations(getService);

      // create connector
      await createConnector(proxy, supertest);
      // Ensure a conversation is created before testing sharing
      await createConversation(proxy);
    });

    describe('Conversation Sharing Menu', () => {
      it('should display the share button (badge)', async () => {
        await testSubjects.existOrFail(ui.pages.conversations.access.shareButton);
      });

      it('should open the sharing menu on click', async () => {
        await testSubjects.click(ui.pages.conversations.access.shareButton);
        await testSubjects.existOrFail(ui.pages.conversations.access.sharedOption);
        await testSubjects.existOrFail(ui.pages.conversations.access.privateOption);
      });

      describe('when changing access to Shared', () => {
        before(async () => {
          await interceptRequest(
            driver.driver,
            '*observability_ai_assistant\\/conversation\\/*',
            (responseFactory) => {
              return responseFactory.continue();
            },
            async () => {
              await testSubjects.click(ui.pages.conversations.access.sharedOption);
            }
          );
        });

        it('should update the badge to "Shared"', async () => {
          await retry.try(async () => {
            const badgeText = await testSubjects.getVisibleText(
              ui.pages.conversations.access.shareButton
            );
            expect(badgeText).to.contain('Shared');
          });
        });

        it('should persist the change in the backend', async () => {
          await retry.try(async () => {
            const response = await observabilityAIAssistantAPIClient.editor({
              endpoint: 'POST /internal/observability_ai_assistant/conversations',
            });
            const conversation = response.body.conversations.pop();
            expect(conversation?.public).to.eql(true);
          });
        });
      });

      describe('when changing access to Private', () => {
        before(async () => {
          await interceptRequest(
            driver.driver,
            '*observability_ai_assistant\\/conversation\\/*',
            (responseFactory) => {
              return responseFactory.continue();
            },
            async () => {
              await testSubjects.click(ui.pages.conversations.access.shareButton);
              await testSubjects.click(ui.pages.conversations.access.privateOption);
            }
          );
        });

        it('should update the badge to "Private"', async () => {
          await retry.try(async () => {
            const badgeText = await testSubjects.getVisibleText(
              ui.pages.conversations.access.shareButton
            );
            expect(badgeText).to.contain('Private');
          });
        });

        it('should persist the change in the backend', async () => {
          await retry.try(async () => {
            const response = await observabilityAIAssistantAPIClient.editor({
              endpoint: 'POST /internal/observability_ai_assistant/conversations',
            });
            const conversation = response.body.conversations.pop();
            expect(conversation?.public).to.eql(false);
          });
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
