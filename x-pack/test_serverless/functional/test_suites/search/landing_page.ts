/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const pageObjects = getPageObjects(['svlSearchLandingPage', 'svlCommonPage']);
  const svlSearchNavigation = getService('svlSearchNavigation');

  describe('landing page', function () {
    before(async () => {
      await pageObjects.svlCommonPage.login();
    });

    after(async () => {
      await pageObjects.svlCommonPage.forceLogout();
    });

    it('has serverless side nav', async () => {
      await svlSearchNavigation.navigateToLandingPage();
      await pageObjects.svlSearchLandingPage.assertSvlSearchSideNavExists();
    });

    it('has expected languages', async () => {
      const languages = ['curl', 'java', 'dotnet', 'python', 'javascript', 'php', 'go', 'ruby'];

      for (const id of languages) {
        await pageObjects.svlSearchLandingPage.languageClients.expectLanguagePanelExists(id);
      }
      // Java is selected by default
      await pageObjects.svlSearchLandingPage.languageClients.expectLanguageSelected('java');

      // We can select a non-default language
      await pageObjects.svlSearchLandingPage.languageClients.selectLanguage('curl');
      await pageObjects.svlSearchLandingPage.languageClients.expectLanguageSelected('curl');
    });

    describe('API Key creation', async () => {
      beforeEach(async () => {
        // We need to reload the page between api key creations
        await svlSearchNavigation.navigateToLandingPage();
      });

      it('can create an API key that expires', async () => {
        await pageObjects.svlSearchLandingPage.apiKeys.openCreateFlyout();
        await pageObjects.svlSearchLandingPage.apiKeys.setApiKeyName('test-api-key');
        await pageObjects.svlSearchLandingPage.apiKeys.createApiKeySubmitAndSuccess();
      });
      it('can create an API key that never expires', async () => {
        await pageObjects.svlSearchLandingPage.apiKeys.openCreateFlyout();
        await pageObjects.svlSearchLandingPage.apiKeys.setApiKeyName('test-unlimited-api-key');
        await pageObjects.svlSearchLandingPage.apiKeys.selectNeverExpires();
        await pageObjects.svlSearchLandingPage.apiKeys.createApiKeySubmitAndSuccess();
      });
      it('can create an API key with metadata', async () => {
        await pageObjects.svlSearchLandingPage.apiKeys.openCreateFlyout();
        await pageObjects.svlSearchLandingPage.apiKeys.setApiKeyName('test-metadata-api-key');
        await pageObjects.svlSearchLandingPage.apiKeys.createApiKeyToggleMetadataSwitch();
        await pageObjects.svlSearchLandingPage.apiKeys.expectMetadataEditorToExist();
        await pageObjects.svlSearchLandingPage.apiKeys.createApiKeySubmitAndSuccess();
      });
      it('can create an API key with role descriptors', async () => {
        await pageObjects.svlSearchLandingPage.apiKeys.openCreateFlyout();
        await pageObjects.svlSearchLandingPage.apiKeys.setApiKeyName('test-roles-api-key');
        await pageObjects.svlSearchLandingPage.apiKeys.createApiKeyToggleRoleDescriptorsSwitch();
        await pageObjects.svlSearchLandingPage.apiKeys.expectRoleDescriptorsEditorToExist();
        await pageObjects.svlSearchLandingPage.apiKeys.createApiKeySubmitAndSuccess();
      });
      it('shows server error with invalid API key data', async () => {
        await pageObjects.svlSearchLandingPage.apiKeys.openCreateFlyout();
        await pageObjects.svlSearchLandingPage.apiKeys.setApiKeyName('test-roles-api-key');
        await pageObjects.svlSearchLandingPage.apiKeys.createApiKeyToggleRoleDescriptorsSwitch();
        await pageObjects.svlSearchLandingPage.apiKeys.setRoleDescriptorsValue(
          '{"invalid": "role"}'
        );
        await pageObjects.svlSearchLandingPage.apiKeys.createApiKeySubmitAndError();
        await pageObjects.svlSearchLandingPage.apiKeys.createApiKeyCancel();
      });
    });
  });
}
