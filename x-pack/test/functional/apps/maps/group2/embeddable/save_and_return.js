/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

export default function ({ getPageObjects, getService }) {
  const PageObjects = getPageObjects(['common', 'dashboard', 'header', 'maps', 'visualize']);
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
        await PageObjects.common.navigateToApp('dashboard');
        await PageObjects.dashboard.clickNewDashboard();
        await dashboardAddPanel.clickEditorMenuButton();
        await dashboardAddPanel.clickVisType('maps');
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.maps.waitForLayersToLoad();
      });

      describe('save', () => {
        it('should return to dashboard and add new panel', async () => {
          await PageObjects.maps.saveMap('map created from dashboard save and return');
          await PageObjects.dashboard.waitForRenderComplete();
          const panelCount = await PageObjects.dashboard.getPanelCount();
          expect(panelCount).to.equal(1);
        });
      });

      describe('save and uncheck return to origin switch', () => {
        it('should cut the originator and stay in maps application', async () => {
          await PageObjects.maps.saveMap(
            'map created from dashboard save and return with originator app cut',
            false
          );
          await PageObjects.maps.waitForLayersToLoad();
          await testSubjects.missingOrFail('mapSaveAndReturnButton');
          await testSubjects.existOrFail('mapSaveButton');
        });
      });
    });

    describe('edit existing map', () => {
      beforeEach(async () => {
        await PageObjects.common.navigateToApp('dashboard');
        await PageObjects.dashboard.loadSavedDashboard('map embeddable example');
        await PageObjects.dashboard.switchToEditMode();
        await dashboardPanelActions.editPanelByTitle('join example');
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.maps.waitForLayersToLoad();
      });

      describe('save and return', () => {
        it('should return to dashboard', async () => {
          await PageObjects.maps.clickSaveAndReturnButton();
          await PageObjects.dashboard.waitForRenderComplete();
          const panelCount = await PageObjects.dashboard.getPanelCount();
          expect(panelCount).to.equal(2);
        });

        it('should lose its connection to the dashboard when creating new map', async () => {
          await PageObjects.maps.gotoMapListingPage();
          await PageObjects.maps.openNewMap();
          await PageObjects.maps.expectMissingSaveAndReturnButton();

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
          await PageObjects.maps.saveMap('Clone of map embeddable example');
          await PageObjects.header.waitUntilLoadingHasFinished();
          const panelCount = await PageObjects.dashboard.getPanelCount();
          expect(panelCount).to.equal(3);
        });
      });

      describe('save as and uncheck return to origin switch', () => {
        it('should cut the originator and stay in maps application', async () => {
          await PageObjects.maps.saveMap('Clone 2 of map embeddable example', false);
          await PageObjects.maps.waitForLayersToLoad();
          await testSubjects.missingOrFail('mapSaveAndReturnButton');
          await testSubjects.existOrFail('mapSaveButton');
        });
      });
    });
  });
}
