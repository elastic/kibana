/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function spaceSelectorFunctionalTests({
  getService,
  getPageObjects,
}: FtrProviderContext) {
  const listingTable = getService('listingTable');
  const PageObjects = getPageObjects([
    'common',
    'dashboard',
    'header',
    'home',
    'security',
    'spaceSelector',
  ]);
  const spacesService = getService('spaces');

  // Failing: See https://github.com/elastic/kibana/issues/142155
  describe('Spaces', function () {
    const testSpacesIds = ['another-space', ...Array.from('123456789', (idx) => `space-${idx}`)];
    before(async () => {
      for (const testSpaceId of testSpacesIds) {
        await spacesService.create({ id: testSpaceId, name: `${testSpaceId} name` });
      }
    });
    after(async () => {
      for (const testSpaceId of testSpacesIds) {
        await spacesService.delete(testSpaceId);
      }
    });

    this.tags('includeFirefox');
    describe('Login Space Selector', () => {
      before(async () => {
        await PageObjects.security.forceLogout();
      });

      after(async () => {
        // NOTE: Logout needs to happen before anything else to avoid flaky behavior
        await PageObjects.security.forceLogout();
      });

      it('allows user to select initial space', async () => {
        const spaceId = 'another-space';

        await PageObjects.security.login(undefined, undefined, {
          expectSpaceSelector: true,
        });

        // select space with card after login
        await PageObjects.spaceSelector.clickSpaceCard(spaceId);
        await PageObjects.spaceSelector.expectHomePage(spaceId);
      });
    });

    describe('Space Navigation Menu', () => {
      before(async () => {
        await PageObjects.security.forceLogout();
        await PageObjects.security.login(undefined, undefined, {
          expectSpaceSelector: true,
        });
      });

      after(async () => {
        await PageObjects.security.forceLogout();
      });

      it('allows user to navigate to different spaces', async () => {
        const anotherSpaceId = 'another-space';
        const defaultSpaceId = 'default';
        const space5Id = 'space-5';

        await PageObjects.spaceSelector.clickSpaceCard(defaultSpaceId);
        await PageObjects.spaceSelector.expectHomePage(defaultSpaceId);

        // change spaces with nav menu
        await PageObjects.spaceSelector.openSpacesNav();
        await PageObjects.spaceSelector.goToSpecificSpace(space5Id);
        await PageObjects.spaceSelector.expectHomePage(space5Id);

        await PageObjects.spaceSelector.openSpacesNav();
        await PageObjects.spaceSelector.goToSpecificSpace(anotherSpaceId);
        await PageObjects.spaceSelector.expectHomePage(anotherSpaceId);

        await PageObjects.spaceSelector.openSpacesNav();
        await PageObjects.spaceSelector.goToSpecificSpace(defaultSpaceId);
        await PageObjects.spaceSelector.expectHomePage(defaultSpaceId);
      });
    });

    describe('Search spaces in popover', () => {
      const spaceId = 'default';
      before(async () => {
        await PageObjects.security.forceLogout();
        await PageObjects.security.login(undefined, undefined, {
          expectSpaceSelector: true,
        });
      });

      after(async () => {
        await PageObjects.security.forceLogout();
      });

      it('allows user to search for spaces', async () => {
        await PageObjects.spaceSelector.clickSpaceCard(spaceId);
        await PageObjects.spaceSelector.expectHomePage(spaceId);
        await PageObjects.spaceSelector.openSpacesNav();
        await PageObjects.spaceSelector.expectSearchBoxInSpacesSelector();
      });

      it('search for "ce-1 name" and find one space', async () => {
        await PageObjects.spaceSelector.setSearchBoxInSpacesSelector('ce-1 name');
        await PageObjects.spaceSelector.expectToFindThatManySpace(1);
      });

      it('search for "dog" and find NO space', async () => {
        await PageObjects.spaceSelector.setSearchBoxInSpacesSelector('dog');
        await PageObjects.spaceSelector.expectToFindThatManySpace(0);
        await PageObjects.spaceSelector.expectNoSpacesFound();
      });
    });

    describe('Spaces Data', () => {
      const spaceId = 'another-space';
      const sampleDataHash = '/tutorial_directory/sampleData';

      const expectDashboardRenders = async (dashName: string) => {
        await listingTable.searchForItemWithName(dashName);
        await listingTable.clickItemLink('dashboard', dashName);
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.dashboard.waitForRenderComplete(); // throws if all items are not rendered
      };

      before(async () => {
        await PageObjects.security.login(undefined, undefined, {
          expectSpaceSelector: true,
        });
        await PageObjects.spaceSelector.clickSpaceCard('default');
        await PageObjects.common.navigateToApp('home', {
          hash: sampleDataHash,
        });
        await PageObjects.home.addSampleDataSet('logs');
        await PageObjects.common.navigateToApp('home', {
          hash: sampleDataHash,
          basePath: `/s/${spaceId}`,
        });
        await PageObjects.home.addSampleDataSet('logs');
      });

      after(async () => {
        // No need to remove the same sample data in both spaces, the index
        // data will be removed in the first call. By feature limitation,
        // the created saved objects in the second space will be broken but removed
        // when we call esArchiver.unload('x-pack/test/functional/es_archives/spaces').
        await PageObjects.common.navigateToApp('home', {
          hash: sampleDataHash,
        });
        await PageObjects.home.removeSampleDataSet('logs');
        await PageObjects.security.forceLogout();
      });

      describe('displays separate data for each space', () => {
        it('in the default space', async () => {
          await PageObjects.common.navigateToApp('dashboard');
          await expectDashboardRenders('[Logs] Web Traffic');
        });

        it('in a custom space', async () => {
          await PageObjects.common.navigateToApp('dashboard', {
            basePath: `/s/${spaceId}`,
          });
          await expectDashboardRenders('[Logs] Web Traffic');
        });
      });
    });
  });
}
