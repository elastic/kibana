/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../ftr_provider_context';

export function SvlSearchLandingPageProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');
  const monacoEditor = getService('monacoEditor');

  return {
    async assertSvlSearchSideNavExists() {
      await testSubjects.existOrFail('svlSearchSideNav');
    },
    languageClients: {
      async expectLanguagePanelExists(id: string) {
        await testSubjects.existOrFail(`${id}-client-panel`);
      },
      async expectLanguageSelected(id: string) {
        await testSubjects.existOrFail(`${id}-client-panel`);
        const langPanel = await testSubjects.find(`${id}-client-panel`);
        expect(await langPanel.elementHasClass('euiPanel--primary')).to.be(true);
      },
      async selectLanguage(id: string) {
        await testSubjects.click(`${id}-client-panel`);
      },
    },
    apiKeys: {
      async openCreateFlyout() {
        await testSubjects.click('new-api-key-button');
        await testSubjects.existOrFail('formFlyoutSubmitButton');
      },
      async setApiKeyName(value: string) {
        await testSubjects.existOrFail('apiKeyNameInput');
        await testSubjects.setValue('apiKeyNameInput', value);
      },
      async selectNeverExpires() {
        await (await await testSubjects.find('apiKeyCustomExpirationSwitch')).click();
        await testSubjects.missingOrFail('apiKeyCustomExpirationInput');
      },
      async createApiKeySubmitAndSuccess() {
        await testSubjects.click('formFlyoutSubmitButton');
        await testSubjects.existOrFail('api-key-create-success-panel');
      },
      async createApiKeySubmitAndError() {
        await testSubjects.click('formFlyoutSubmitButton');
        await testSubjects.existOrFail('apiKeyFlyoutResponseError');
      },
      async createApiKeyCancel() {
        await testSubjects.click('formFlyoutCancelButton');
      },
      async createApiKeyToggleMetadataSwitch() {
        await testSubjects.click('apiKeysMetadataSwitch');
      },
      async expectMetadataEditorToExist() {
        await monacoEditor.getCodeEditorValue(1);
      },
      async createApiKeyToggleRoleDescriptorsSwitch() {
        await testSubjects.click('apiKeysRoleDescriptorsSwitch');
      },
      async expectRoleDescriptorsEditorToExist() {
        await monacoEditor.getCodeEditorValue(0);
        await testSubjects.existOrFail('apiKeysReadOnlyDescriptors');
        await testSubjects.existOrFail('apiKeysWriteOnlyDescriptors');
      },
      async setRoleDescriptorsValue(value: string) {
        await monacoEditor.getCodeEditorValue(0);
        await monacoEditor.setCodeEditorValue(value, 0);
      },
    },
    pipeline: {
      async createPipeline() {
        await testSubjects.clickWhenNotDisabled('create-a-pipeline-button');
      },
      async expectNavigateToCreatePipelinePage() {
        expect(await browser.getCurrentUrl()).contain(
          '/app/management/ingest/ingest_pipelines/create'
        );
      },
      async managePipeline() {
        await testSubjects.clickWhenNotDisabled('manage-pipeline-button');
      },
      async expectNavigateToManagePipelinePage() {
        expect(await browser.getCurrentUrl()).contain('/app/management/ingest/ingest_pipelines');
      },
    },
  };
}
