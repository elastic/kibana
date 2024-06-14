/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { LlmProxy } from '../../observability_ai_assistant_api_integration/common/create_llm_proxy';
import { FtrProviderContext } from '../ftr_provider_context';

export function SearchPlaygroundPageProvider({ getService }: FtrProviderContext) {
  // const observabilityAIAssistantAPIClient = getService('observabilityAIAssistantAPIClient');
  const testSubjects = getService('testSubjects');
  const comboBox = getService('comboBox');
  const browser = getService('browser');

  const driver = getService('__webdriver__');
  const toasts = getService('toasts');
  const retry = getService('retry');

  return {
    PlaygroundStartChatPage: {
      async expectPlaygroundStartChatPageComponentsToExist() {
        await testSubjects.existOrFail('startChatPage');
        await testSubjects.existOrFail('connectToLLMChatPanel');
        await testSubjects.existOrFail('selectIndicesChatPanel');
        await testSubjects.existOrFail('startChatButton');
      },

      async expectPlaygroundHeaderComponentsToExist() {
        await testSubjects.existOrFail('playground-header-actions');
        expect(await testSubjects.isEnabled('editContextActionButton')).to.be(false);
        expect(await testSubjects.isEnabled('viewQueryActionButton')).to.be(false);
        expect(await testSubjects.isEnabled('viewCodeActionButton')).to.be(false);
        await testSubjects.existOrFail('playground-documentation-link');
      },

      async expectCreateIndexButtonToMissed() {
        await testSubjects.missingOrFail('createIndexButton');
      },

      async expectCreateIndexButtonToExists() {
        await testSubjects.existOrFail('createIndexButton');
      },

      async expectNoIndexCalloutExists() {
        await testSubjects.existOrFail('createIndexCallout');
      },

      async expectSelectIndex(indexName: string) {
        await browser.refresh();
        await testSubjects.missingOrFail('createIndexCallout');
        await testSubjects.existOrFail('selectIndicesComboBox');
        await comboBox.setCustom('selectIndicesComboBox', indexName);
      },

      async expectIndicesInDropdown() {
        await testSubjects.existOrFail('selectIndicesComboBox');
      },

      async expectToSelectIndicesAndStartButtonEnabled(indexName) {
        await comboBox.setCustom('selectIndicesComboBox', indexName);
        expect(await testSubjects.isEnabled('startChatButton')).to.be(true);
        expect(await testSubjects.isEnabled('editContextActionButton')).to.be(true);
        expect(await testSubjects.isEnabled('viewQueryActionButton')).to.be(true);
        expect(await testSubjects.isEnabled('viewCodeActionButton')).to.be(true);

        await testSubjects.click('startChatButton');
        await testSubjects.existOrFail('chatPage');
      },

      async expectNoIndicesFieldsWarningExists() {
        await testSubjects.existOrFail('NoIndicesFieldsMessage');
      },

      async expectAddConnectorButtonExists() {
        await testSubjects.existOrFail('setupGenAIConnectorButton');
      },

      async expectOpenConnectorPagePlayground() {
        await testSubjects.click('setupGenAIConnectorButton');
        await testSubjects.existOrFail('create-connector-flyout');
      },

      async createOpenAIConnector(proxy: LlmProxy) {
        await testSubjects.click('.gen-ai-card');
        await testSubjects.setValue('nameInput', 'myConnector');
        await testSubjects.setValue('config.apiUrl-input', `http://localhost:${proxy.getPort()}`);
        await testSubjects.setValue('secrets.apiKey-input', 'myApiKey');

        await testSubjects.click('create-connector-flyout-save-btn');
      },

      async expectAddedConnectorCallout() {
        await testSubjects.existOrFail('addedConnectorCallout');
        await testSubjects.missingOrFail('connectToLLMChatPanel');
      },

      async expectHideGenAIPanelConnector() {
        // await createConnector();
        // await browser.refresh();
        await testSubjects.missingOrFail('connectToLLMChatPanel');
      },

      async expectToStartChatPage() {
        expect(await testSubjects.isEnabled('startChatButton')).to.be(true);
        await testSubjects.click('startChatButton');
        await testSubjects.existOrFail('chatPage');
      },
    },
    PlaygroundChatPage: {
      async expectChatWindowLoaded() {
        expect(await testSubjects.isEnabled('editContextActionButton')).to.be(true);
        expect(await testSubjects.isEnabled('viewQueryActionButton')).to.be(true);
        expect(await testSubjects.isEnabled('viewCodeActionButton')).to.be(true);

        expect(await testSubjects.isEnabled('regenerateActionButton')).to.be(false);
        expect(await testSubjects.isEnabled('clearChatActionButton')).to.be(false);
        expect(await testSubjects.isEnabled('sendQuestionButton')).to.be(false);

        await testSubjects.existOrFail('questionInput');
        const model = await testSubjects.find('summarizationModelSelect');
        const defaultModel = await model.getVisibleText();

        expect(defaultModel).to.equal('OpenAI GPT-3.5 Turbo');
        expect(defaultModel).not.to.be.empty();

        expect(
          await (await testSubjects.find('manageConnectorsLink')).getAttribute('href')
        ).to.contain('/app/management/insightsAndAlerting/triggersActionsConnectors/connectors/');

        await testSubjects.click('sourcesAccordion');

        expect(await testSubjects.findAll('indicesInAccordian')).to.have.length(1);
      },

      async sendQuestion() {
        await testSubjects.setValue('questionInput', 'test question');
        await testSubjects.click('sendQuestionButton');
        // await testSubjects.existOrFail('userMessage');
      },

      // async expectChatWorks() {
      //   await testSubjects.existOrFail('questionInput');
      //   await testSubjects.setValue('questionInput', 'test question');
      //   await testSubjects.click('sendQuestionButton');
      //   await testSubjects.existOrFail('userMessage');
      // },

      async expectChatWorks() {
        const userMessageElement = await testSubjects.find('userMessage');
        const userMessage = await userMessageElement.getVisibleText();
        expect(userMessage).to.contain('test question');

        const assistantMessageElement = await testSubjects.find('assistant-message');
        const assistantMessage = await assistantMessageElement.getVisibleText();
        expect(assistantMessage).to.contain('My response');
      },

      async expectOpenViewCode() {
        await testSubjects.click('viewCodeActionButton');
        await testSubjects.existOrFail('viewCodeFlyout');
        await testSubjects.click('euiFlyoutCloseButton');
      },

      async expectViewQueryHasFields() {
        await testSubjects.click('viewQueryActionButton');
        await testSubjects.existOrFail('viewQueryFlyout');
        const fields = await testSubjects.findAll('queryField');

        expect(fields.length).to.be(1);

        const codeBlock = await testSubjects.find('ViewElasticsearchQueryResult');
        const code = await codeBlock.getVisibleText();
        expect(code.replace(/ /g, '')).to.be(
          '{\n"retriever":{\n"standard":{\n"query":{\n"multi_match":{\n"query":"{query}",\n"fields":[\n"baz"\n]\n}\n}\n}\n}\n}'
        );
        await testSubjects.click('euiFlyoutCloseButton');
      },

      async expectEditContextOpens() {
        await testSubjects.click('editContextActionButton');
        await testSubjects.existOrFail('editContextFlyout');
        await testSubjects.click('contextFieldsSelectable_basic_index');
        await testSubjects.existOrFail('contextField');
        const fields = await testSubjects.findAll('contextField');

        expect(fields.length).to.be(1);
        await testSubjects.click('euiFlyoutCloseButton');
      },
    },
  };
}
