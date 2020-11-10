/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const pageObjects = getPageObjects(['common', 'apiKeys']);
  const log = getService('log');
  const security = getService('security');
  const testSubjects = getService('testSubjects');

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
      log.debug('Checking for section header');
      const headers = await testSubjects.findAll('noApiKeysHeader');
      if (headers.length > 0) {
        expect(await headers[0].getVisibleText()).to.be('No API keys');
        const goToAccountButton = await pageObjects.apiKeys.getGoToAccountButton();
        expect(await goToAccountButton.isDisplayed()).to.be(true);
      } else {
        // page may already contain EiTable with data, then check API Key Admin text
        const description = await pageObjects.apiKeys.getApiKeyAdminDesc();
        expect(description).to.be('You are an API Key administrator.');
      }
    });
  });
};
