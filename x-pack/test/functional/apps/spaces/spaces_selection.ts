/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { TestInvoker } from './lib/types';

// tslint:disable:no-default-export
export default function spaceSelectorFunctonalTests({ getService, getPageObjects }: TestInvoker) {
  const config = getService('config');
  const esArchiver = getService('esArchiver');
  const PageObjects = getPageObjects([
    'common',
    'dashboard',
    'header',
    'home',
    'security',
    'spaceSelector',
  ]);

  describe('Spaces', () => {
    describe('Space Selector', () => {
      before(async () => await esArchiver.load('spaces'));
      after(async () => await esArchiver.unload('spaces'));

      afterEach(async () => {
        await PageObjects.security.logout();
      });

      it('allows user to navigate to different spaces', async () => {
        const spaceId = 'another-space';

        await PageObjects.security.login(null, null, {
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
      const dashboardPath = config.get(['apps', 'dashboard']).pathname;
      const homePath = config.get(['apps', 'home']).pathname;
      const sampleDataHash = '/home/tutorial_directory/sampleData';

      const expectDashboardRenders = async (dashName: string) => {
        await PageObjects.dashboard.searchForDashboardWithName(dashName);
        await PageObjects.dashboard.selectDashboard(dashName);
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.dashboard.waitForRenderComplete(); // throws if all items are not rendered
      };

      before(async () => {
        await esArchiver.load('spaces');
        await PageObjects.security.login(null, null, {
          expectSpaceSelector: true,
        });
        await PageObjects.spaceSelector.clickSpaceCard('default');
        await PageObjects.common.navigateToApp('home', {
          appConfig: {
            hash: sampleDataHash,
          },
        });
        await PageObjects.home.addSampleDataSet('logs');
        await PageObjects.common.navigateToApp('home', {
          appConfig: {
            hash: sampleDataHash,
            pathname: `/s/${spaceId}${homePath}`,
          },
        });
        await PageObjects.home.addSampleDataSet('flights');
      });

      after(async () => {
        await PageObjects.common.navigateToApp('home', {
          appConfig: {
            hash: sampleDataHash,
          },
        });
        await PageObjects.home.removeSampleDataSet('logs');
        await PageObjects.common.navigateToApp('home', {
          appConfig: {
            hash: sampleDataHash,
            pathname: `/s/${spaceId}${homePath}`,
          },
        });
        await PageObjects.home.removeSampleDataSet('flights');
        await PageObjects.security.logout();
        await esArchiver.unload('spaces');
      });

      describe('displays separate data for each space', async () => {
        it('in the default space', async () => {
          await PageObjects.common.navigateToApp('dashboard');
          await expectDashboardRenders('[Logs] Web Traffic');
        });

        it('in a custom space', async () => {
          await PageObjects.common.navigateToApp('dashboard', {
            appConfig: {
              pathname: `/s/${spaceId}${dashboardPath}`,
            },
          });
          await expectDashboardRenders('[Flights] Global Flight Dashboard');
        });
      });
    });
  });
}
