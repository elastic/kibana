/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';
import {
  createLlmProxy,
  LlmProxy,
} from '../../../observability_ai_assistant_api_integration/common/create_llm_proxy';
import { createConnector, deleteConnectors } from '../../common/connectors';
import { createAndLoginUserWithCustomRole, deleteAndLogoutUser } from './helpers';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const log = getService('log');
  const supertest = getService('supertest');
  const PageObjects = getPageObjects(['common', 'error', 'navigationalSearch', 'security']);
  const ui = getService('observabilityAIAssistantUI');
  const testSubjects = getService('testSubjects');
  const obsAssistantConversationsGlobalSearchEntry = 'Observability AI Assistant / Conversations';

  describe('ai assistant privileges', () => {
    describe('all privileges', () => {
      before(async () => {
        await createAndLoginUserWithCustomRole(getPageObjects, getService, {
          // need some obs app or obs menu wont show where we can click on AI Assistant
          infrastructure: ['all'],
          observabilityAIAssistant: ['all'],
          // requires connectors to chat
          actions: ['read'],
        });
      });

      after(async () => {
        await deleteAndLogoutUser(getService, getPageObjects);
      });

      it('shows AI Assistant link in solution nav', async () => {
        // navigate to an observability app so the left side o11y menu shows up
        await PageObjects.common.navigateToUrl('infraOps', '', {
          ensureCurrentUrl: true,
          shouldLoginIfPrompted: false,
        });
        await testSubjects.existOrFail(ui.pages.links.solutionMenuLink);
      });
      it('shows AI Assistant button in global nav', async () => {
        await testSubjects.existOrFail(ui.pages.links.globalHeaderButton);
      });
      it('shows AI Assistant conversations link in search', async () => {
        await PageObjects.navigationalSearch.searchFor('observability ai assistant');
        const results = await PageObjects.navigationalSearch.getDisplayedResults();
        expect(results[0].label).to.eql(obsAssistantConversationsGlobalSearchEntry);
      });
      describe('with no connector setup', () => {
        before(async () => {
          await deleteConnectors(supertest);
        });
        it('loads conversations UI with setup connector message', async () => {
          await PageObjects.common.navigateToUrl('obsAIAssistant', '', {
            ensureCurrentUrl: false,
            shouldLoginIfPrompted: false,
            shouldUseHashForSubUrl: false,
          });
          await testSubjects.existOrFail(ui.pages.conversations.setupGenAiConnectorsButtonSelector);
        });
      });
      describe('with connector setup', () => {
        let proxy: LlmProxy;

        before(async () => {
          await deleteConnectors(supertest);
          proxy = await createLlmProxy(log);
          await createConnector(proxy, supertest);
        });

        after(async () => {
          proxy.close();
          await deleteConnectors(supertest);
        });
        it('loads conversations UI with ability to chat', async () => {
          await PageObjects.common.navigateToUrl('obsAIAssistant', '', {
            ensureCurrentUrl: false,
            shouldLoginIfPrompted: false,
            shouldUseHashForSubUrl: false,
          });
          const chatInputElement = await testSubjects.find(ui.pages.conversations.chatInput);
          await testSubjects.existOrFail(ui.pages.conversations.chatInput);
          const isDisabled = await chatInputElement.getAttribute('disabled');
          expect(isDisabled).to.be(null);
        });
      });
    });
    describe('no actions privileges', () => {
      before(async () => {
        await createAndLoginUserWithCustomRole(getPageObjects, getService, {
          // need some obs app or obs menu wont show where we can click on AI Assistant
          infrastructure: ['all'],
          observabilityAIAssistant: ['all'],
        });
      });
      it('loads conversations UI with connector error message', async () => {
        await PageObjects.common.navigateToUrl('obsAIAssistant', '', {
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
          shouldUseHashForSubUrl: false,
        });
        await testSubjects.existOrFail(ui.pages.conversations.connectorsErrorMsg);
      });
      after(async () => {
        await deleteAndLogoutUser(getService, getPageObjects);
      });
    });
    describe('no privileges', () => {
      before(async () => {
        await createAndLoginUserWithCustomRole(getPageObjects, getService, {
          // need some obs app or obs menu wont show where we can click on AI Assistant
          infrastructure: ['all'],
        });
        // navigate to an observability app so the left side o11y menu shows up
        await PageObjects.common.navigateToUrl('infraOps', '', {
          ensureCurrentUrl: true,
          shouldLoginIfPrompted: false,
        });
      });
      it('shows no AI Assistant link in solution nav', async () => {
        await testSubjects.missingOrFail(ui.pages.links.solutionMenuLink);
      });
      it('shows no AI Assistant button in global nav', async () => {
        await testSubjects.missingOrFail(ui.pages.links.globalHeaderButton);
      });
      it('shows no AI Assistant conversations link in global search', async () => {
        await PageObjects.navigationalSearch.searchFor('observability ai assistant');
        const results = await PageObjects.navigationalSearch.getDisplayedResults();
        const aiAssistantConversationsEntry = results.some(
          ({ label }) => label === obsAssistantConversationsGlobalSearchEntry
        );
        expect(aiAssistantConversationsEntry).to.be(false);
      });
      it('cannot navigate to AI Assistant page', async () => {
        await PageObjects.common.navigateToUrl('obsAIAssistant', '', {
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
          shouldUseHashForSubUrl: false,
        });
        await testSubjects.missingOrFail(ui.pages.conversations.conversationsPage);
      });
      after(async () => {
        await deleteAndLogoutUser(getService, getPageObjects);
      });
    });
  });
}
