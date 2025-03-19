/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const { dashboard, header, maps, timePicker } = getPageObjects([
    'dashboard',
    'header',
    'maps',
    'timePicker',
  ]);
  const dashboardAddPanel = getService('dashboardAddPanel');
  const dashboardPanelActions = getService('dashboardPanelActions');
  const testSubjects = getService('testSubjects');
  const security = getService('security');

  describe('save and return work flow', () => {
    before(async () => {
      await security.testUser.setRoles(
        [
          'test_logstash_reader',
          'global_maps_all',
          'geoshape_data_reader',
          'global_dashboard_all',
          'meta_for_geoshape_data_reader',
        ],
        { skipBrowserRefresh: true }
      );
    });

    after(async () => {
      await security.testUser.restoreDefaults();
    });

    describe('new map', () => {
      beforeEach(async () => {
        await dashboard.navigateToApp();
        await dashboard.clickNewDashboard();
        await dashboardAddPanel.clickAddMapPanel();
        await header.waitUntilLoadingHasFinished();
        await maps.waitForLayersToLoad();
      });

      describe('save', () => {
        it('should return to dashboard and add new panel', async () => {
          await maps.saveMap('map created from dashboard save and return');
          await dashboard.waitForRenderComplete();
          const panelCount = await dashboard.getPanelCount();
          expect(panelCount).to.equal(1);
        });
      });

      describe('save and uncheck return to origin switch', () => {
        it('should cut the originator and stay in maps application', async () => {
          await maps.saveMap(
            'map created from dashboard save and return with originator app cut',
            false
          );
          await maps.waitForLayersToLoad();
          await testSubjects.missingOrFail('mapSaveAndReturnButton');
          await testSubjects.existOrFail('mapSaveButton');
        });
      });
    });

    describe('edit existing map', () => {
      beforeEach(async () => {
        await dashboard.navigateToApp();
        await dashboard.loadSavedDashboard('map embeddable example');
        await dashboard.switchToEditMode();
        await dashboardPanelActions.editPanelByTitle('join example');
        await header.waitUntilLoadingHasFinished();
        await maps.waitForLayersToLoad();
      });

      describe('save and return', () => {
        it('should use dashboard instead of time stored in map state', async () => {
          // join example map's time is "last 17 minutes"
          // ensure map has dashboard time
          const timeConfig = await timePicker.getTimeConfig();
          expect(timeConfig.start).to.equal('Sep 20, 2015 @ 00:00:00.000');
          expect(timeConfig.end).to.equal('Sep 20, 2015 @ 01:00:00.000');
        });

        it('should return to dashboard', async () => {
          await maps.clickSaveAndReturnButton();
          await dashboard.waitForRenderComplete();
          const panelCount = await dashboard.getPanelCount();
          expect(panelCount).to.equal(2);
        });

        it('should lose its connection to the dashboard when creating new map', async () => {
          await maps.gotoMapListingPage();
          await maps.openNewMap();
          await maps.expectMissingSaveAndReturnButton();

          // return to origin should not be present in save modal
          await testSubjects.click('mapSaveButton');
          const redirectToOriginCheckboxExists = await testSubjects.exists(
            'returnToOriginModeSwitch'
          );
          expect(redirectToOriginCheckboxExists).to.be(false);
        });
      });

      describe('save as', () => {
        it('should return to dashboard and add new panel', async () => {
          await maps.saveMap('Clone of map embeddable example');
          await header.waitUntilLoadingHasFinished();
          const panelCount = await dashboard.getPanelCount();
          expect(panelCount).to.equal(3);
        });
      });

      describe('save as and uncheck return to origin switch', () => {
        it('should cut the originator and stay in maps application', async () => {
          await maps.saveMap('Clone 2 of map embeddable example', false);
          await maps.waitForLayersToLoad();
          await testSubjects.missingOrFail('mapSaveAndReturnButton');
          await testSubjects.existOrFail('mapSaveButton');
        });
      });
    });
  });
}
