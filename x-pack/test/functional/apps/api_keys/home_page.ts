/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const pageObjects = getPageObjects(["common", 'apiKeys']);
  const log = getService('log');

  describe('Home page', function () {
    this.tags('smoke');
    before(async () => {
      await pageObjects.common.navigateToApp('apiKeys');
    });

    it('Loads the app', async () => {
      await log.debug('Checking for section header');
      const headerText = await (await pageObjects.apiKeys.noAPIKeysHeading()).getText();
      expect(headerText).to.be('No API Keys');

      const goToConsoleButton = await pageObjects.apiKeys.goToConsoleButton();
      expect(await goToConsoleButton.isDisplayed()).to.be(true);
    });
  });
};
