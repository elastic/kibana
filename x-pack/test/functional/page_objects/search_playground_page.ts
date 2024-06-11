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
  const comboBox = getService('comboBox');
  const browser = getService('browser');

  return {
    PlaygroundStartChatPage: {
      async expectPlaygroundStartChatPageComponentsToExist() {
        await testSubjects.existOrFail('startChatPage');
        await testSubjects.existOrFail('selectIndicesChatPanel');
        await testSubjects.existOrFail('startChatButton');
      },

      async expectPlaygroundHeaderComponentsToExist() {
        await testSubjects.existOrFail('playground-header-actions');
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

      async expectHideGenAIPanelConnector(createConnector: () => Promise<void>) {
        await createConnector();
        await browser.refresh();
        await testSubjects.missingOrFail('connectToLLMChatPanel');
      },

      async expectToStartChatPage() {
        expect(await testSubjects.isEnabled('startChatButton')).to.be(true);
        await testSubjects.click('startChatButton');
        await testSubjects.existOrFail('chatPage');
      },
    },
    PlaygroundChatPage: {
      async expectChatWorks() {
        await testSubjects.existOrFail('questionInput');
        await testSubjects.setValue('questionInput', 'test question');
        await testSubjects.click('sendQuestionButton');
        await testSubjects.existOrFail('userMessage');
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
