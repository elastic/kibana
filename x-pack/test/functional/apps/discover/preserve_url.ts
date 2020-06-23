/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const PageObjects = getPageObjects(['common', 'discover', 'spaceSelector', 'header']);
  const globalNav = getService('globalNav');

  describe('preserve url', function () {
    before(async function () {
      await esArchiver.load('spaces/multi_space');
    });

    after(function () {
      return esArchiver.unload('spaces/multi_space');
    });

    it('goes back to last opened url', async function () {
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.discover.saveSearch('A Search');
      await PageObjects.common.navigateToApp('home');
      await PageObjects.header.clickDiscover();
      const activeTitle = await globalNav.getLastBreadcrumb();
      expect(activeTitle).to.be('A Search');
    });

    it('remembers url after switching spaces', async function () {
      // default space
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.discover.loadSavedSearch('A Search');

      await PageObjects.spaceSelector.openSpacesNav();
      await PageObjects.spaceSelector.clickSpaceAvatar('another-space');
      await PageObjects.spaceSelector.expectHomePage('another-space');

      // other space
      await PageObjects.header.clickDiscover();
      await PageObjects.discover.saveSearch('A Search in another space');

      await PageObjects.spaceSelector.openSpacesNav();
      await PageObjects.spaceSelector.clickSpaceAvatar('default');
      await PageObjects.spaceSelector.expectHomePage('default');

      // default space
      await PageObjects.header.clickDiscover();
      await PageObjects.discover.waitUntilSearchingHasFinished();
      const activeTitleDefaultSpace = await globalNav.getLastBreadcrumb();
      expect(activeTitleDefaultSpace).to.be('A Search');

      await PageObjects.spaceSelector.openSpacesNav();
      await PageObjects.spaceSelector.clickSpaceAvatar('another-space');
      await PageObjects.spaceSelector.expectHomePage('another-space');

      // other space
      await PageObjects.header.clickDiscover();
      await PageObjects.discover.waitUntilSearchingHasFinished();
      const activeTitleOtherSpace = await globalNav.getLastBreadcrumb();
      expect(activeTitleOtherSpace).to.be('A Search in another space');
    });
  });
}
