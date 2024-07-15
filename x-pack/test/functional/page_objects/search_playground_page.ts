/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../ftr_provider_context';

export function SearchPlaygroundPageProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');
  const selectIndex = async () => {
    await testSubjects.existOrFail('addDataSourcesButton');
    await testSubjects.click('addDataSourcesButton');
    await testSubjects.existOrFail('selectIndicesFlyout');
    await testSubjects.click('sourceIndex-0');
    await testSubjects.click('saveButton');
  };

  return {
    PlaygroundStartChatPage: {
      async expectPlaygroundStartChatPageComponentsToExist() {
        await testSubjects.existOrFail('setupPage');
        await testSubjects.existOrFail('connectLLMButton');
      },

      async expectPlaygroundStartChatPageIndexButtonExists() {
        await testSubjects.existOrFail('createIndexButton');
      },

      async expectPlaygroundStartChatPageIndexCalloutExists() {
        await testSubjects.existOrFail('createIndexCallout');
      },

      async expectPlaygroundHeaderComponentsToExist() {
        await testSubjects.existOrFail('playground-header-actions');
        await testSubjects.existOrFail('playground-documentation-link');
      },

      async expectPlaygroundHeaderComponentsToDisabled() {
        expect(await testSubjects.getAttribute('viewModeSelector', 'disabled')).to.be('true');
        expect(await testSubjects.isEnabled('dataSourceActionButton')).to.be(false);
        expect(await testSubjects.isEnabled('viewCodeActionButton')).to.be(false);
      },

      async expectCreateIndexButtonToExists() {
        await testSubjects.existOrFail('createIndexButton');
      },

      async expectOpenFlyoutAndSelectIndex() {
        await browser.refresh();
        await selectIndex();
        await testSubjects.existOrFail('dataSourcesSuccessButton');
      },

      async expectToSelectIndicesAndLoadChat() {
        await selectIndex();
        await testSubjects.existOrFail('chatPage');
      },

      async expectAddConnectorButtonExists() {
        await testSubjects.existOrFail('connectLLMButton');
      },

      async expectOpenConnectorPagePlayground() {
        await testSubjects.click('connectLLMButton');
        await testSubjects.existOrFail('create-connector-flyout');
      },

      async expectSuccessButtonAfterCreatingConnector(createConnector: () => Promise<void>) {
        await createConnector();
        await browser.refresh();
        await testSubjects.existOrFail('successConnectLLMButton');
      },

      async expectShowSuccessLLMButton() {
        await testSubjects.existOrFail('successConnectLLMButton');
      },
    },
    PlaygroundChatPage: {
      async navigateToChatPage() {
        await selectIndex();
        await testSubjects.existOrFail('chatPage');
      },

      async expectChatWindowLoaded() {
        expect(await testSubjects.getAttribute('viewModeSelector', 'disabled')).to.be(null);
        expect(await testSubjects.isEnabled('dataSourceActionButton')).to.be(true);
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

        await testSubjects.existOrFail('editContextPanel');
        await testSubjects.existOrFail('summarizationPanel');
      },

      async sendQuestion() {
        await testSubjects.setValue('questionInput', 'test question');
        await testSubjects.click('sendQuestionButton');
      },

      async expectChatWorks() {
        const userMessageElement = await testSubjects.find('userMessage');
        const userMessage = await userMessageElement.getVisibleText();
        expect(userMessage).to.contain('test question');

        const assistantMessageElement = await testSubjects.find('assistant-message');
        const assistantMessage = await assistantMessageElement.getVisibleText();
        expect(assistantMessage).to.contain('My response');
      },

      async expectTokenTooltipExists() {
        await testSubjects.existOrFail('token-tooltip-button');
      },

      async expectOpenViewCode() {
        await testSubjects.click('viewCodeActionButton');
        await testSubjects.existOrFail('viewCodeFlyout');
        await testSubjects.click('euiFlyoutCloseButton');
      },

      async expectViewQueryHasFields() {
        await testSubjects.existOrFail('queryMode');
        await testSubjects.click('queryMode');
        const fields = await testSubjects.findAll('fieldName');

        expect(fields.length).to.be(1);

        const codeBlock = await testSubjects.find('ViewElasticsearchQueryResult');
        const code = await codeBlock.getVisibleText();
        expect(code.replace(/ /g, '')).to.be(
          '{\n"retriever":{\n"standard":{\n"query":{\n"multi_match":{\n"query":"{query}",\n"fields":[\n"baz"\n]\n}\n}\n}\n}\n}'
        );
      },

      async expectEditContextOpens() {
        await testSubjects.click('chatMode');
        await testSubjects.existOrFail('contextFieldsSelectable-0');
        await testSubjects.click('contextFieldsSelectable-0');
        await testSubjects.existOrFail('contextField');
        const fields = await testSubjects.findAll('contextField');

        expect(fields.length).to.be(1);
      },
    },
  };
}
