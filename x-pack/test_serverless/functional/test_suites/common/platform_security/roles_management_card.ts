/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const testSubjects = getService('testSubjects');
  const pageObjects = getPageObjects(['svlCommonPage', 'common', 'svlManagementPage']);
  const browser = getService('browser');
  const retry = getService('retry');

  describe('Roles management card', function () {
    this.tags('smoke');
    before(async () => {
      // Navigate to the index management page
      await pageObjects.svlCommonPage.loginAsAdmin();
      await pageObjects.common.navigateToApp('management');
    });

    it('renders the page, displays the Roles card, and will navigate to the Roles UI', async () => {
      await retry.waitFor('page to be visible', async () => {
        return await testSubjects.exists('cards-navigation-page');
      });

      let url = await browser.getCurrentUrl();
      expect(url).to.contain(`/management`);

      await pageObjects.svlManagementPage.assertRoleManagementCardExists();

      await pageObjects.svlManagementPage.clickRoleManagementCard();

      url = await browser.getCurrentUrl();
      expect(url).to.contain('/management/security/roles');
    });
  });
};
