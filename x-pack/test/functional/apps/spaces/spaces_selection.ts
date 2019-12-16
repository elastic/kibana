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
  const security = getService('security');
  const PageObjects = getPageObjects(['common', 'dashboard', 'header', 'home', 'spaceSelector']);

  describe('Spaces', function() {
    this.tags('smoke');
    describe('Space Selector', () => {
      before(async () => await esArchiver.load('spaces/selector'));
      after(async () => await esArchiver.unload('spaces/selector'));

      afterEach(async () => {
        await security.logout();
      });

      it('allows user to navigate to different spaces', async () => {
        const spaceId = 'another-space';

        await security.loginAsSuperUser({
          expect: 'spaceSelector',
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
      const sampleDataHash = '/home/tutorial_directory/sampleData';

      const expectDashboardRenders = async (dashName: string) => {
        await PageObjects.dashboard.searchForDashboardWithName(dashName);
        await PageObjects.dashboard.selectDashboard(dashName);
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.dashboard.waitForRenderComplete(); // throws if all items are not rendered
      };

      before(async () => {
        await esArchiver.load('spaces/selector');
        await security.loginAsSuperUser({
          expect: 'spaceSelector',
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
        await security.logout();
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
