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
  // const esArchiver = getService('esArchiver');
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

  describe('Spaces', function () {
    before(async () => {
      // await esArchiver.load('x-pack/test/functional/es_archives/spaces/selector');
      await spacesService.create({
        id: 'another-space',
        name: 'Another Space',
        disabledFeatures: [],
      });
      await spacesService.create({
        id: 'space-1',
        name: 'Space 1',
        disabledFeatures: [],
      });

      await spacesService.create({
        id: 'space-2',
        name: 'Space 2',
        disabledFeatures: [],
      });

      await spacesService.create({
        id: 'space-3',
        name: 'Space 3',
        disabledFeatures: [],
      });

      await spacesService.create({
        id: 'space-4',
        name: 'Space 4',
        disabledFeatures: [],
      });

      await spacesService.create({
        id: 'space-5',
        name: 'Space 5',
        disabledFeatures: [],
      });

      await spacesService.create({
        id: 'space-6',
        name: 'Space 6',
        disabledFeatures: [],
      });

      await spacesService.create({
        id: 'space-7',
        name: 'Space 7',
        disabledFeatures: [],
      });

      await spacesService.create({
        id: 'space-8',
        name: 'Space 8',
        disabledFeatures: [],
      });

      await spacesService.create({
        id: 'space-9',
        name: 'Space 9',
        disabledFeatures: [],
      });
    });
    after(async () => {
      // await esArchiver.unload('x-pack/test/functional/es_archives/spaces/selector')
      await spacesService.delete('another-space');
      await spacesService.delete('space-1');
      await spacesService.delete('space-2');
      await spacesService.delete('space-3');
      await spacesService.delete('space-4');
      await spacesService.delete('space-5');
      await spacesService.delete('space-6');
      await spacesService.delete('space-7');
      await spacesService.delete('space-8');
      await spacesService.delete('space-9');
    });

    this.tags('includeFirefox');
    describe('Space Selector', () => {
      before(async () => {
        await PageObjects.security.forceLogout();
      });

      afterEach(async () => {
        // NOTE: Logout needs to happen before anything else to avoid flaky behavior
        await PageObjects.security.forceLogout();
      });

      it('allows user to navigate to different spaces', async () => {
        const spaceId = 'another-space';

        await PageObjects.security.login(undefined, undefined, {
          expectSpaceSelector: true,
        });

        await PageObjects.spaceSelector.clickSpaceCard(spaceId);

        await PageObjects.spaceSelector.expectHomePage(spaceId);

        await PageObjects.spaceSelector.openSpacesNav();

        // change spaces

        await PageObjects.spaceSelector.clickSpaceAvatar('default');

        await PageObjects.spaceSelector.expectHomePage('default');
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

      it('search for "ce 1" and find one space', async () => {
        await PageObjects.spaceSelector.setSearchBoxInSpacesSelector('ce 1');
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
