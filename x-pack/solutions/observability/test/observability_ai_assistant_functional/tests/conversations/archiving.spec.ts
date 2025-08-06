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
} from '../../../api_integration_deployment_agnostic/apis/ai_assistant/utils/create_llm_proxy';
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

  describe('Conversation Archiving', () => {
    let proxy: LlmProxy;

    before(async () => {
      proxy = await createLlmProxy(log);
      await ui.auth.login('editor');
      await ui.router.goto('/conversations/new', { path: {}, query: {} });

      await deleteConnectors(supertest);
      await deleteConversations(getService);

      await createConnector(proxy, supertest);
      await createConversation(proxy);
    });

    after(async () => {
      await deleteConnectors(supertest);
      await deleteConversations(getService);
      await ui.auth.logout();
      proxy.close();
    });

    it('should display the context menu button', async () => {
      await testSubjects.existOrFail(ui.pages.conversations.contextMenu.button);
    });

    it('should open the context menu on click', async () => {
      await testSubjects.click(ui.pages.conversations.contextMenu.button);
      await testSubjects.existOrFail(ui.pages.conversations.contextMenu.archiveOption);
      await testSubjects.click(ui.pages.conversations.contextMenu.button);
    });

    describe('when archiving a conversation', () => {
      before(async () => {
        await interceptRequest(
          driver.driver,
          '*observability_ai_assistant\\/conversation\\/*',
          (responseFactory) => responseFactory.continue(),
          async () => {
            await testSubjects.click(ui.pages.conversations.contextMenu.button);
            await testSubjects.click(ui.pages.conversations.contextMenu.archiveOption);
          }
        );
      });

      it('should display the "Archived" badge', async () => {
        await retry.try(async () => {
          const badgeText = await testSubjects.getVisibleText(ui.pages.conversations.archivedBadge);
          expect(badgeText).to.contain('Archived');
        });
      });

      it('should persist the archived state in the backend', async () => {
        await retry.try(async () => {
          const response = await observabilityAIAssistantAPIClient.editor({
            endpoint: 'POST /internal/observability_ai_assistant/conversations',
          });
          const conversation = response.body.conversations.pop();
          expect(conversation?.archived).to.eql(true);
        });
      });
    });

    describe('when unarchiving a conversation', () => {
      before(async () => {
        await interceptRequest(
          driver.driver,
          '*observability_ai_assistant\\/conversation\\/*',
          (responseFactory) => responseFactory.continue(),
          async () => {
            await testSubjects.click(ui.pages.conversations.contextMenu.button);
            await testSubjects.click(ui.pages.conversations.contextMenu.unarchiveOption);
          }
        );
      });

      it('should hide the "Archived" badge', async () => {
        await retry.try(async () => {
          const exists = await testSubjects.exists(ui.pages.conversations.archivedBadge);
          expect(exists).to.eql(false);
        });
      });

      it('should persist the unarchived state in the backend', async () => {
        await retry.try(async () => {
          const response = await observabilityAIAssistantAPIClient.editor({
            endpoint: 'POST /internal/observability_ai_assistant/conversations',
          });
          const conversation = response.body.conversations.pop();
          expect(conversation?.archived).to.eql(false);
        });
      });
    });
  });
}
