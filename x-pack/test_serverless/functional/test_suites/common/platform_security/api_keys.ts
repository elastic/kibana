/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { Client } from '@elastic/elasticsearch';
import { ToolingLog } from '@kbn/tooling-log';
import { FtrProviderContext } from '../../../ftr_provider_context';

async function clearAllApiKeys(esClient: Client, logger: ToolingLog) {
  const existingKeys = await esClient.security.queryApiKeys();
  if (existingKeys.count > 0) {
    await Promise.all(
      existingKeys.api_keys.map(async (key) => {
        await esClient.security.invalidateApiKey({ ids: [key.id] });
      })
    );
  } else {
    logger.debug('No API keys to delete.');
  }
}

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const pageObjects = getPageObjects(['common', 'svlCommonPage', 'apiKeys']);
  const browser = getService('browser');
  const es = getService('es');
  const log = getService('log');

  describe('API keys', function () {
    // TimeoutError: Waiting for element to be located By(css selector, [data-test-subj="apiKeysCreatePromptButton"]) Wait timed out after 10028ms
    this.tags(['failsOnMKI']);
    before(async () => {
      await pageObjects.svlCommonPage.loginAsAdmin();
    });

    after(async () => {
      await clearAllApiKeys(es, log);
    });

    it('should create and delete API keys correctly', async () => {
      await pageObjects.common.navigateToUrl('management', 'security/api_keys', {
        shouldUseHashForSubUrl: false,
      });

      const apiKeyName = 'Happy API Key';
      await pageObjects.apiKeys.clickOnPromptCreateApiKey();
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

      await pageObjects.apiKeys.deleteAllApiKeyOneByOne();
    });
  });
};
