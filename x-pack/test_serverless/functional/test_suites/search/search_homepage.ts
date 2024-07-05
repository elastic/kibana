/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';
import { RoleCredentials } from '../../../shared/services';

import { testHasEmbeddedConsole } from './embedded_console';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const pageObjects = getPageObjects(['svlCommonPage', 'svlCommonNavigation', 'svlSearchHomePage']);
  const svlUserManager = getService('svlUserManager');
  const uiSettings = getService('uiSettings');
  let roleAuthc: RoleCredentials;

  const HOMEPAGE_FF_UI_SETTING = 'searchHomepage:homepageEnabled';
  describe('Search Homepage', function () {
    this.tags('skipMKI');
    before(async () => {
      roleAuthc = await svlUserManager.createApiKeyForRole('admin');
      // Enable Homepage Feature Flag
      await uiSettings.setUiSetting(roleAuthc, HOMEPAGE_FF_UI_SETTING, true);

      await pageObjects.svlCommonPage.loginWithRole('viewer');
    });

    after(async () => {
      if (!roleAuthc) return;

      // Disable Homepage Feature Flag
      await uiSettings.deleteUISetting(roleAuthc, HOMEPAGE_FF_UI_SETTING);
      await svlUserManager.invalidateApiKeyForRole(roleAuthc);
    });

    it('has search homepage with Home sidenav', async () => {
      pageObjects.svlSearchHomePage.expectToBeOnHomepage();
      pageObjects.svlSearchHomePage.expectHomepageHeader();
      // Navigate to another page
      await pageObjects.svlCommonNavigation.sidenav.clickLink({
        deepLinkId: 'serverlessConnectors',
      });
      pageObjects.svlSearchHomePage.expectToNotBeOnHomepage();
      // Click Home in Side nav
      await pageObjects.svlCommonNavigation.sidenav.clickLink({
        deepLinkId: 'searchHomepage',
      });
      pageObjects.svlSearchHomePage.expectToBeOnHomepage();
    });

    it('has embedded dev console', async () => {
      await testHasEmbeddedConsole(pageObjects);
    });
  });
}
