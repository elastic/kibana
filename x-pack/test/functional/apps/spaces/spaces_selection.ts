/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { FtrProviderContext } from '../../ftr_provider_context';

export default function spaceSelectorFunctonalTests({
  getService,
  getPageObjects,
}: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const listingTable = getService('listingTable');
  const PageObjects = getPageObjects([
    'common',
    'dashboard',
    'header',
    'home',
    'security',
    'spaceSelector',
  ]);

  // FLAKY: https://github.com/elastic/kibana/issues/51942
  describe.skip('Spaces', function () {
    this.tags('includeFirefox');
    describe('Space Selector', () => {
      before(async () => {
        await esArchiver.load('spaces/selector');
        await PageObjects.security.forceLogout();
      });
      after(async () => await esArchiver.unload('spaces/selector'));

      afterEach(async () => {
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
        await esArchiver.load('spaces/selector');
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
        // when we call esArchiver.unload('spaces').
        await PageObjects.common.navigateToApp('home', {
          hash: sampleDataHash,
        });
        await PageObjects.home.removeSampleDataSet('logs');
        await PageObjects.security.forceLogout();
        await esArchiver.unload('spaces/selector');
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
