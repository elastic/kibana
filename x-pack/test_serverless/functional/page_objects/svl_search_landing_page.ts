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
        await testSubjects.existOrFail('create-api-key-submit');
      },
      async setApiKeyName(value: string) {
        await testSubjects.existOrFail('create-api-key-name');
        await testSubjects.setValue('create-api-key-name', value);
      },
      async selectNeverExpires() {
        await (
          await (
            await testSubjects.find('create-api-key-expires-never-radio')
          ).findByTagName('label')
        ).click();
        await testSubjects.missingOrFail('create-api-key-expires-days-number-field');
      },
      async createApiKeySubmitAndSuccess() {
        await testSubjects.click('create-api-key-submit');
        await testSubjects.existOrFail('api-key-create-success-panel');
      },
      async createApiKeySubmitAndError() {
        await testSubjects.click('create-api-key-submit');
        await testSubjects.existOrFail('create-api-key-error-callout');
      },
      async createApiKeyCancel() {
        await testSubjects.click('create-api-key-cancel');
      },
      async createApiKeyToggleMetadataSwitch() {
        await testSubjects.click('create-api-metadata-switch');
      },
      async expectMetadataEditorToExist() {
        await testSubjects.existOrFail('create-api-metadata-code-editor-container');
      },
      async createApiKeyToggleRoleDescriptorsSwitch() {
        await testSubjects.click('create-api-role-descriptors-switch');
      },
      async expectRoleDescriptorsEditorToExist() {
        await testSubjects.existOrFail('create-api-role-descriptors-code-editor-container');
      },
      async setRoleDescriptorsValue(value: string) {
        await testSubjects.existOrFail('create-api-role-descriptors-code-editor-container');
        await testSubjects.setValue('kibanaCodeEditor', value, {
          clearWithKeyboard: true,
        });
      },
    },
  };
}
