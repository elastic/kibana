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

  describe('Home page', function () {
    before(async () => {
      await security.testUser.setRoles(['kibana_admin']);
      await pageObjects.common.navigateToApp('apiKeys');
    });

    after(async () => {
      await security.testUser.restoreDefaults();
    });

    // https://www.elastic.co/guide/en/kibana/7.6/api-keys.html#api-keys-security-privileges
    it('Shows required privileges ', async () => {
      log.debug('Checking for required privileges method section header');
      const message = await pageObjects.apiKeys.apiKeysPermissionDeniedMessage();
      expect(message).to.be('You need permission to manage API keys');
    });

    it('Loads the app', async () => {
      await security.testUser.setRoles(['test_api_keys']);
      log.debug('Checking for section header');
      const headerText = await pageObjects.apiKeys.noAPIKeysHeading();
      expect(headerText).to.be('No API keys');
      const goToConsoleButton = await pageObjects.apiKeys.getGoToConsoleButton();
      expect(await goToConsoleButton.isDisplayed()).to.be(true);
    });
  });
};
