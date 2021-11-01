/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const pageObjects = getPageObjects(['common', 'apiKeys']);
  const log = getService('log');
  const security = getService('security');
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const browser = getService('browser');

  describe('Home page', function () {
    before(async () => {
      await security.testUser.setRoles(['kibana_admin']);
      await pageObjects.common.navigateToApp('apiKeys');
    });

    after(async () => {
      await security.testUser.restoreDefaults();
    });

    // https://www.elastic.co/guide/en/kibana/7.6/api-keys.html#api-keys-security-privileges
    it('Hides management link if user is not authorized', async () => {
      await testSubjects.missingOrFail('apiKeys');
    });

    it('Loads the app', async () => {
      await security.testUser.setRoles(['test_api_keys']);
      log.debug('Checking for create API key call to action');
      await find.existsByLinkText('Create API key');
    });

    describe('creates API key', function () {
      before(async () => {
        await security.testUser.setRoles(['kibana_admin']);
        await security.testUser.setRoles(['test_api_keys']);
        await pageObjects.common.navigateToApp('apiKeys');
      });

      afterEach(async () => {
        await pageObjects.apiKeys.deleteAllApiKey();
      });

      it('when submitting form, close dialog and displays new api key', async () => {
        const ApiKeyName = 'Happy API Key';
        await pageObjects.apiKeys.clickOnCreateApiKey();
        expect(await browser.getCurrentUrl()).to.contain('app/management/security/api_keys/create');

        await pageObjects.apiKeys.setApiKeyName(ApiKeyName);
        await pageObjects.apiKeys.submitOnCreateApiKey();
        const newApiKeyCreation = await pageObjects.apiKeys.getNewApiKeyCreation();

        expect(await browser.getCurrentUrl()).to.not.contain(
          'app/management/security/api_keys/create'
        );
        expect(await browser.getCurrentUrl()).to.contain('app/management/security/api_keys');
        expect(await pageObjects.apiKeys.isApiKeyModalExists()).to.be(false);
        expect(newApiKeyCreation).to.be(`Created API key '${ApiKeyName}'`);
      });

      it('with optional expiration, redirects back and displays base64', async () => {
        const ApiKeyName = 'Happy expiration API key';
        await pageObjects.apiKeys.clickOnCreateApiKey();
        expect(await browser.getCurrentUrl()).to.contain('app/management/security/api_keys/create');

        await pageObjects.apiKeys.setApiKeyName(ApiKeyName);
        await pageObjects.apiKeys.toggleExpireAfter();
        await pageObjects.apiKeys.submitOnCreateApiKey();
        expect(await pageObjects.apiKeys.getErrorCallOutText()).to.be(
          'Enter a valid duration or disable this option.'
        );

        await pageObjects.apiKeys.setApiKeyExpireAfter('12');
        await pageObjects.apiKeys.submitOnCreateApiKey();
        const newApiKeyCreation = await pageObjects.apiKeys.getNewApiKeyCreation();

        expect(await browser.getCurrentUrl()).to.not.contain(
          'app/management/security/api_keys/create'
        );
        expect(await browser.getCurrentUrl()).to.contain('app/management/security/api_keys');
        expect(await pageObjects.apiKeys.isApiKeyModalExists()).to.be(false);
        expect(newApiKeyCreation).to.be(`Created API key '${ApiKeyName}'`);
      });
    });
  });
};
