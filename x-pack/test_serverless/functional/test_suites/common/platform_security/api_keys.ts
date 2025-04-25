/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const pageObjects = getPageObjects(['common', 'svlCommonPage', 'apiKeys']);
  const browser = getService('browser');

  describe('API keys', function () {
    before(async () => {
      await pageObjects.svlCommonPage.loginAsAdmin();
    });

    it('should create and delete API keys correctly', async () => {
      await pageObjects.common.navigateToUrl('management', 'security/api_keys', {
        shouldUseHashForSubUrl: false,
      });

      // name needs to be unique because we will confirm deletion by name
      const apiKeyName = `API Key ${Date.now()}`;

      // If there are any existing API keys (e.g. will occur on projects created with QAF),
      // the table will be displayed. Otherwise, the empty prompt is displayed.
      const isPromptPage = await pageObjects.apiKeys.isPromptPage();
      if (isPromptPage) await pageObjects.apiKeys.clickOnPromptCreateApiKey();
      else await pageObjects.apiKeys.clickOnTableCreateApiKey();

      expect(await browser.getCurrentUrl()).to.contain('app/management/security/api_keys/create');
      expect(await pageObjects.apiKeys.getFlyoutTitleText()).to.be('Create API key');

      await pageObjects.apiKeys.setApiKeyName(apiKeyName);
      await pageObjects.apiKeys.clickSubmitButtonOnApiKeyFlyout();
      const newApiKeyCreation = await pageObjects.apiKeys.getNewApiKeyCreation();

      expect(await browser.getCurrentUrl()).to.not.contain(
        'app/management/security/api_keys/create'
      );
      expect(await browser.getCurrentUrl()).to.contain('app/management/security/api_keys');
      expect(await pageObjects.apiKeys.isApiKeyModalExists()).to.be(false);
      expect(newApiKeyCreation).to.be(`Created API key '${apiKeyName}'`);

      await pageObjects.apiKeys.ensureApiKeyExists(apiKeyName);
      await pageObjects.apiKeys.deleteApiKeyByName(apiKeyName);
      expect(await pageObjects.apiKeys.doesApiKeyExist(apiKeyName)).to.be(false);
    });
  });
};
