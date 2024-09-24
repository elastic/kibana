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
  const pageObjects = getPageObjects([
    'svlCommonPage',
    'svlCommonNavigation',
    'svlSearchHomePage',
    'embeddedConsole',
  ]);
  const svlUserManager = getService('svlUserManager');
  const uiSettings = getService('uiSettings');
  let roleAuthc: RoleCredentials;

  const HOMEPAGE_FF_UI_SETTING = 'searchHomepage:homepageEnabled';
  describe('Search Homepage', function () {
    this.tags('skipMKI');
    before(async () => {
      roleAuthc = await svlUserManager.createM2mApiKeyWithRoleScope('admin');
      // Enable Homepage Feature Flag
      await uiSettings.setUiSetting(roleAuthc, HOMEPAGE_FF_UI_SETTING, true);

      await pageObjects.svlCommonPage.loginAsViewer();
    });

    after(async () => {
      if (!roleAuthc) return;

      // Disable Homepage Feature Flag
      await uiSettings.deleteUISetting(roleAuthc, HOMEPAGE_FF_UI_SETTING);
      await svlUserManager.invalidateM2mApiKeyWithRoleScope(roleAuthc);
    });

    it('has search homepage with Home sidenav', async () => {
      await pageObjects.svlSearchHomePage.expectToBeOnHomepage();
      await pageObjects.svlSearchHomePage.expectHomepageHeader();
      // Navigate to another page
      await pageObjects.svlCommonNavigation.sidenav.clickLink({
        deepLinkId: 'serverlessConnectors',
      });
      await pageObjects.svlSearchHomePage.expectToNotBeOnHomepage();
      // Click Home in Side nav
      await pageObjects.svlCommonNavigation.sidenav.clickLink({
        deepLinkId: 'searchHomepage',
      });
      await pageObjects.svlSearchHomePage.expectToBeOnHomepage();
    });

    it('has embedded dev console', async () => {
      await testHasEmbeddedConsole(pageObjects);
    });

    it('has console quickstart link on page', async () => {
      await pageObjects.svlSearchHomePage.expectConsoleLinkExists();
      await pageObjects.embeddedConsole.expectEmbeddedConsoleToBeClosed();
      await pageObjects.svlSearchHomePage.clickConsoleLink();
      await pageObjects.embeddedConsole.expectEmbeddedConsoleToBeOpen();
      await pageObjects.embeddedConsole.clickEmbeddedConsoleControlBar();
      await pageObjects.embeddedConsole.expectEmbeddedConsoleToBeClosed();
    });

    it('has endpoints link and flyout', async () => {
      await pageObjects.svlSearchHomePage.expectEndpointsLinkExists();
      await pageObjects.svlSearchHomePage.clickEndpointsLink();
      await pageObjects.svlSearchHomePage.expectConnectionDetailsFlyoutToBeOpen();
      await pageObjects.svlSearchHomePage.expectEndpointsTabIsAvailable();
      await pageObjects.svlSearchHomePage.closeConnectionDetailsFlyout();
    });

    it('can create an API key', async () => {
      await pageObjects.svlSearchHomePage.expectEndpointsLinkExists();
      await pageObjects.svlSearchHomePage.clickEndpointsLink();
      await pageObjects.svlSearchHomePage.expectConnectionDetailsFlyoutToBeOpen();
      await pageObjects.svlSearchHomePage.expectAPIKeyTabIsAvailable();
      await pageObjects.svlSearchHomePage.createApiKeyInFlyout('ftr-test-key');
      await pageObjects.svlSearchHomePage.closeConnectionDetailsFlyout();
    });
  });
}
