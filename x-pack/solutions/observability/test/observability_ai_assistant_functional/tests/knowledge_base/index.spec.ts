/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { KnowledgeBaseState } from '@kbn/observability-ai-assistant-plugin/common';
import {
  LlmProxy,
  createLlmProxy,
} from '../../../api_integration_deployment_agnostic/apis/ai_assistant/utils/create_llm_proxy';
import { FtrProviderContext } from '../../ftr_provider_context';
import {
  deployTinyElserAndSetupKb,
  stopTinyElserModel,
  teardownTinyElserModelAndInferenceEndpoint,
} from '../../../api_integration_deployment_agnostic/apis/ai_assistant/utils/model_and_inference';
import { clearKnowledgeBase } from '../../../api_integration_deployment_agnostic/apis/ai_assistant/utils/knowledge_base';
import { createConnector, deleteConnectors } from '../../common/connectors';

export default function ApiTest({ getService }: FtrProviderContext) {
  const observabilityAIAssistantAPIClient = getService('observabilityAIAssistantApi');
  const ui = getService('observabilityAIAssistantUI');
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const log = getService('log');
  const es = getService('es');
  const supertest = getService('supertest');
  const browser = getService('browser');

  describe('Knowledge Base', () => {
    let proxy: LlmProxy;

    before(async () => {
      proxy = await createLlmProxy(log);

      await clearKnowledgeBase(es);
      await deleteConnectors(supertest);
      await createConnector(proxy, supertest);

      await ui.auth.login('editor');
      await ui.router.goto('/conversations/new', { path: {}, query: {} });
    });

    after(async () => {
      await clearKnowledgeBase(es);
      await teardownTinyElserModelAndInferenceEndpoint(getService);
      await deleteConnectors(supertest);

      proxy.close();
      await ui.auth.logout();
    });

    it('shows model dropdown and install button before the KB is installed', async () => {
      await testSubjects.existOrFail(ui.pages.conversations.selectModelDropdown);
      await testSubjects.existOrFail(ui.pages.conversations.installKnowledgeBaseButton);
    });

    it('should not show the setting up knowledge base loader after the KB is installed', async () => {
      await deployTinyElserAndSetupKb(getService);
      await browser.refresh();

      await testSubjects.missingOrFail(ui.pages.conversations.settingUpKnowledgeBase);
    });

    it('should show a button to redeploy the model if the model has been stopped', async () => {
      await stopTinyElserModel(getService);
      await browser.refresh();

      await testSubjects.existOrFail(ui.pages.conversations.pendingModelText);
      await testSubjects.existOrFail(ui.pages.conversations.redeployModelButton);

      await retry.try(async () => {
        const response = await observabilityAIAssistantAPIClient.editor({
          endpoint: 'GET /internal/observability_ai_assistant/kb/status',
        });

        expect(response.body?.kbState).to.eql(KnowledgeBaseState.MODEL_PENDING_DEPLOYMENT);
      });
    });

    it('should show redeploy is in progress when the redeploy button is clicked', async () => {
      await testSubjects.click(ui.pages.conversations.redeployModelButton);

      const deployingText = await testSubjects.getVisibleText(
        ui.pages.conversations.pendingModelText
      );
      expect(deployingText).to.contain('Redeploying knowledge base model');
    });
  });
}
