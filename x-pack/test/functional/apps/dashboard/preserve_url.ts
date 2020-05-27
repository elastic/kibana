/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const PageObjects = getPageObjects(['common', 'dashboard', 'spaceSelector', 'header']);
  const appsMenu = getService('appsMenu');
  const globalNav = getService('globalNav');

  describe('preserve url', function () {
    before(async function () {
      await esArchiver.load('spaces/multi_space');
    });

    after(function () {
      return esArchiver.unload('spaces/multi_space');
    });

    it('goes back to last opened url', async function () {
      await PageObjects.common.navigateToApp('dashboard');
      await PageObjects.dashboard.loadSavedDashboard('A Dashboard');
      await PageObjects.common.navigateToApp('home');
      await appsMenu.clickLink('Dashboard');
      await PageObjects.dashboard.loadSavedDashboard('A Dashboard');
      await PageObjects.header.waitUntilLoadingHasFinished();
      const activeTitle = await globalNav.getLastBreadcrumb();
      expect(activeTitle).to.be('A Dashboard');
    });

    it('remembers url after switching spaces', async function () {
      // default space
      await PageObjects.common.navigateToApp('dashboard');
      await PageObjects.dashboard.loadSavedDashboard('A Dashboard');

      await PageObjects.spaceSelector.openSpacesNav();
      await PageObjects.spaceSelector.clickSpaceAvatar('another-space');
      await PageObjects.spaceSelector.expectHomePage('another-space');

      // other space
      await appsMenu.clickLink('Dashboard');
      await PageObjects.dashboard.loadSavedDashboard('A Dashboard in another space');

      await PageObjects.spaceSelector.openSpacesNav();
      await PageObjects.spaceSelector.clickSpaceAvatar('default');
      await PageObjects.spaceSelector.expectHomePage('default');

      // default space
      await appsMenu.clickLink('Dashboard');
      await PageObjects.dashboard.waitForRenderComplete();
      const activeTitleDefaultSpace = await globalNav.getLastBreadcrumb();
      expect(activeTitleDefaultSpace).to.be('A Dashboard');

      await PageObjects.spaceSelector.openSpacesNav();
      await PageObjects.spaceSelector.clickSpaceAvatar('another-space');
      await PageObjects.spaceSelector.expectHomePage('another-space');

      // other space
      await appsMenu.clickLink('Dashboard');
      await PageObjects.dashboard.waitForRenderComplete();
      const activeTitleOtherSpace = await globalNav.getLastBreadcrumb();
      expect(activeTitleOtherSpace).to.be('A Dashboard in another space');
    });
  });
}
