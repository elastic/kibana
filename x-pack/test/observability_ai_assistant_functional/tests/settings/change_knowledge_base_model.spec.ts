/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { KnowledgeBaseState } from '@kbn/observability-ai-assistant-plugin/common/types';
import { FtrProviderContext } from '../../ftr_provider_context';
import { createConnector, deleteConnectors } from '../../common/connectors';
import {
  LlmProxy,
  createLlmProxy,
} from '../../../api_integration/deployment_agnostic/apis/observability/ai_assistant/utils/create_llm_proxy';
import {
  deployTinyElserAndSetupKb,
  stopTinyElserModel,
  teardownTinyElserModelAndInferenceEndpoint,
} from '../../../api_integration/deployment_agnostic/apis/observability/ai_assistant/utils/model_and_inference';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const log = getService('log');
  const supertest = getService('supertest');
  const PageObjects = getPageObjects(['common', 'security']);
  const ui = getService('observabilityAIAssistantUI');
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const browser = getService('browser');
  const find = getService('find');

  describe('Change knowledge base model via settings', () => {
    let llmProxy: LlmProxy;

    before(async () => {
      llmProxy = await createLlmProxy(log);
      await createConnector(llmProxy, supertest);

      await ui.auth.login('editor');
      await PageObjects.common.navigateToUrlWithBrowserHistory(
        'management',
        '/kibana/observabilityAiAssistantManagement'
      );
    });

    after(async () => {
      await teardownTinyElserModelAndInferenceEndpoint(getService);
      await deleteConnectors(supertest);
      llmProxy.close();
      await ui.auth.logout();
    });

    it('shows knowledge base model section when enabled', async () => {
      await testSubjects.existOrFail('observabilityAiAssistantKnowledgeBaseModelDropdown');
      await testSubjects.existOrFail('observabilityAiAssistantKnowledgeBaseUpdateModelButton');
    });

    it('shows the current KB status and the correct button text when the KB is not installed', async () => {
      const statusBadgeText = await testSubjects.getVisibleText(
        'observabilityAiAssistantKnowledgeBaseStatus'
      );
      expect(statusBadgeText).to.be(KnowledgeBaseState.NOT_INSTALLED);
      const buttonText = await testSubjects.getVisibleText(
        'observabilityAiAssistantKnowledgeBaseUpdateModelButton'
      );
      expect(buttonText).to.be('Install');
    });

    it('show the correct status and button text when the KB is installed', async () => {
      await deployTinyElserAndSetupKb(getService);
      await browser.refresh();

      await retry.try(async () => {
        const statusBadgeText = await testSubjects.getVisibleText(
          'observabilityAiAssistantKnowledgeBaseStatus'
        );
        expect(statusBadgeText).to.be('Installed');
      });

      await testSubjects.missingOrFail('observabilityAiAssistantKnowledgeBaseLoadingSpinner');
    });

    it('allows model selection and updating the model when multiple models are available', async () => {
      await testSubjects.existOrFail('observabilityAiAssistantKnowledgeBaseModelDropdown');

      await testSubjects.click('observabilityAiAssistantKnowledgeBaseModelDropdown');

      await retry.try(async () => {
        const options = await find.allByCssSelector('.euiSuperSelect__item');
        expect(options.length).to.be.greaterThan(0);
        await options[options.length - 1].click();
      });

      const isButtonDisabled = await testSubjects.getAttribute(
        'observabilityAiAssistantKnowledgeBaseUpdateModelButton',
        'disabled'
      );
      expect(isButtonDisabled).to.be(null);
    });

    it('should show a button to redeploy the model if the model has been stopped', async () => {
      await stopTinyElserModel(getService);

      await retry.try(async () => {
        await browser.refresh();

        const buttonText = await testSubjects.getVisibleText(
          'observabilityAiAssistantKnowledgeBaseUpdateModelButton'
        );
        expect(buttonText).to.be('Redeploy model');
      });

      const statusBadgeText = await testSubjects.getVisibleText(
        'observabilityAiAssistantKnowledgeBaseStatus'
      );
      expect(statusBadgeText).to.be(KnowledgeBaseState.MODEL_PENDING_DEPLOYMENT);
    });
  });
}
