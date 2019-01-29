/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { TestInvoker } from './lib/types';

// tslint:disable:no-default-export
export default function spaceSelectorFunctonalTests({ getService, getPageObjects }: TestInvoker) {
  const esArchiver = getService('esArchiver');
  const PageObjects = getPageObjects(['dashboard', 'header', 'home', 'security', 'spaceSelector']);

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

        // change spaces
        await PageObjects.spaceSelector.switchToSpace('default');
        await PageObjects.spaceSelector.expectHomePage('default');
      });
    });

    describe('Spaces Data', () => {
      const spaceId = 'another-space';
      const paths = {
        dashboard: '/dashboard',
        sampleData: '/home/tutorial_directory/sampleData',
      };
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
        await PageObjects.spaceSelector.switchToSpace('default', {
          redirectPath: paths.sampleData,
        });
        await PageObjects.home.addSampleDataSet('logs');
        await PageObjects.spaceSelector.switchToSpace(spaceId, {
          redirectPath: paths.sampleData,
        });
        await PageObjects.home.addSampleDataSet('flights');
      });

      after(async () => {
        await PageObjects.spaceSelector.switchToSpace('default', {
          redirectPath: paths.sampleData,
        });
        await PageObjects.home.removeSampleDataSet('logs');
        await PageObjects.spaceSelector.switchToSpace(spaceId, {
          redirectPath: paths.sampleData,
        });
        await PageObjects.home.removeSampleDataSet('flights');
        await PageObjects.security.logout();
        await esArchiver.unload('spaces');
      });

      describe('displays separate data for each space', async () => {
        it('in the default space', async () => {
          await PageObjects.spaceSelector.switchToSpace('default', {
            redirectPath: paths.dashboard,
          });
          await expectDashboardRenders('[Logs] Web Traffic');
        });

        it('in a custom space', async () => {
          await PageObjects.spaceSelector.switchToSpace(spaceId, {
            redirectPath: paths.dashboard,
          });
          await expectDashboardRenders('[Flights] Global Flight Dashboard');
        });
      });
    });
  });
}
