/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

export default function ({ getPageObjects, getService }) {
  const PageObjects = getPageObjects([
    'common',
    'dashboard',
    'header',
    'maps',
    'timeToVisualize',
    'visualize',
  ]);

  const listingTable = getService('listingTable');
  const testSubjects = getService('testSubjects');
  const security = getService('security');

  describe('maps add-to-dashboard save flow', () => {
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

    it('should allow new map be added by value to a new dashboard', async () => {
      await PageObjects.maps.openNewMap();
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.maps.waitForLayersToLoad();

      await testSubjects.click('mapSaveButton');
      await PageObjects.timeToVisualize.saveFromModal('map 1', {
        addToDashboard: 'new',
        saveToLibrary: false,
      });

      await PageObjects.dashboard.waitForRenderComplete();

      const panelCount = await PageObjects.dashboard.getPanelCount();
      expect(panelCount).to.eql(1);

      const isInLibrary = await PageObjects.timeToVisualize.libraryNotificationExists('map 1');
      expect(isInLibrary).to.be(false);
      await PageObjects.timeToVisualize.resetNewDashboard();
    });

    it('should allow existing maps be added by value to a new dashboard', async () => {
      await PageObjects.maps.loadSavedMap('document example');

      await testSubjects.click('mapSaveButton');
      await PageObjects.timeToVisualize.saveFromModal('document example copy', {
        saveToLibrary: false,
        addToDashboard: 'new',
        saveAsNew: true,
      });

      await PageObjects.dashboard.waitForRenderComplete();

      const panelCount = await PageObjects.dashboard.getPanelCount();
      expect(panelCount).to.eql(1);

      const isInLibrary = await PageObjects.timeToVisualize.libraryNotificationExists(
        'document example copy'
      );
      expect(isInLibrary).to.be(false);
      await PageObjects.timeToVisualize.resetNewDashboard();
    });

    it('should allow new map be added by value to an existing dashboard', async () => {
      await PageObjects.common.navigateToApp('dashboard');
      await PageObjects.dashboard.clickNewDashboard();

      await PageObjects.dashboard.saveDashboard('My Very Cool Dashboard');
      await PageObjects.dashboard.gotoDashboardLandingPage();
      await listingTable.searchAndExpectItemsCount('dashboard', 'My Very Cool Dashboard', 1);

      await PageObjects.maps.openNewMap();
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.maps.waitForLayersToLoad();

      await testSubjects.click('mapSaveButton');
      await PageObjects.timeToVisualize.saveFromModal('My New Map 2', {
        saveToLibrary: false,
        addToDashboard: 'existing',
        dashboardId: 'My Very Cool Dashboard',
      });

      await PageObjects.dashboard.waitForRenderComplete();

      const panelCount = await PageObjects.dashboard.getPanelCount();
      expect(panelCount).to.eql(1);

      const isInLibrary = await PageObjects.timeToVisualize.libraryNotificationExists(
        'My New Map 2'
      );
      expect(isInLibrary).to.be(false);
    });

    it('should allow existing maps be added by value to an existing dashboard', async () => {
      await PageObjects.common.navigateToApp('dashboard');
      await PageObjects.dashboard.clickNewDashboard();

      await PageObjects.dashboard.saveDashboard('My Wonderful Dashboard');
      await PageObjects.dashboard.gotoDashboardLandingPage();
      await listingTable.searchAndExpectItemsCount('dashboard', 'My Wonderful Dashboard', 1);

      await PageObjects.maps.loadSavedMap('document example');

      await testSubjects.click('mapSaveButton');
      await PageObjects.timeToVisualize.saveFromModal('document example copy 2', {
        saveToLibrary: false,
        addToDashboard: 'existing',
        dashboardId: 'My Wonderful Dashboard',
        saveAsNew: true,
      });

      await PageObjects.dashboard.waitForRenderComplete();

      const panelCount = await PageObjects.dashboard.getPanelCount();
      expect(panelCount).to.eql(1);

      const isInLibrary = await PageObjects.timeToVisualize.libraryNotificationExists(
        'document example copy 2'
      );
      expect(isInLibrary).to.be(false);
    });

    it('should allow new map be added by reference to a new dashboard', async () => {
      await PageObjects.maps.openNewMap();
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.maps.waitForLayersToLoad();

      await testSubjects.click('mapSaveButton');
      await PageObjects.timeToVisualize.saveFromModal('map 1', {
        addToDashboard: 'new',
        saveToLibrary: true,
      });

      await PageObjects.dashboard.waitForRenderComplete();

      const panelCount = await PageObjects.dashboard.getPanelCount();
      expect(panelCount).to.eql(1);

      const isInLibrary = await PageObjects.timeToVisualize.libraryNotificationExists('map 1');
      expect(isInLibrary).to.be(true);
      await PageObjects.timeToVisualize.resetNewDashboard();
    });

    it('should allow existing maps be added by reference to a new dashboard', async () => {
      await PageObjects.maps.loadSavedMap('document example');

      await testSubjects.click('mapSaveButton');
      await PageObjects.timeToVisualize.saveFromModal('document example copy', {
        saveToLibrary: true,
        addToDashboard: 'new',
        saveAsNew: true,
      });

      await PageObjects.dashboard.waitForRenderComplete();

      const panelCount = await PageObjects.dashboard.getPanelCount();
      expect(panelCount).to.eql(1);

      const isInLibrary = await PageObjects.timeToVisualize.libraryNotificationExists(
        'document example copy'
      );
      expect(isInLibrary).to.be(true);
      await PageObjects.timeToVisualize.resetNewDashboard();
    });

    it('should allow new map be added by reference to an existing dashboard', async () => {
      await PageObjects.common.navigateToApp('dashboard');
      await PageObjects.dashboard.clickNewDashboard();

      await PageObjects.dashboard.saveDashboard('My Super Cool Dashboard');
      await PageObjects.dashboard.gotoDashboardLandingPage();
      await listingTable.searchAndExpectItemsCount('dashboard', 'My Super Cool Dashboard', 1);

      await PageObjects.maps.openNewMap();
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.maps.waitForLayersToLoad();

      await testSubjects.click('mapSaveButton');
      await PageObjects.timeToVisualize.saveFromModal('My New Map 2', {
        saveToLibrary: true,
        addToDashboard: 'existing',
        dashboardId: 'My Super Cool Dashboard',
      });

      await PageObjects.dashboard.waitForRenderComplete();

      const panelCount = await PageObjects.dashboard.getPanelCount();
      expect(panelCount).to.eql(1);

      const isInLibrary = await PageObjects.timeToVisualize.libraryNotificationExists(
        'My New Map 2'
      );
      expect(isInLibrary).to.be(true);
    });

    it('should allow existing maps be added by reference to an existing dashboard', async () => {
      await PageObjects.common.navigateToApp('dashboard');
      await PageObjects.dashboard.clickNewDashboard();

      await PageObjects.dashboard.saveDashboard('My Amazing Dashboard');
      await PageObjects.dashboard.gotoDashboardLandingPage();
      await listingTable.searchAndExpectItemsCount('dashboard', 'My Amazing Dashboard', 1);

      await PageObjects.maps.loadSavedMap('document example');

      await testSubjects.click('mapSaveButton');
      await PageObjects.timeToVisualize.saveFromModal('document example copy 2', {
        saveToLibrary: true,
        addToDashboard: 'existing',
        dashboardId: 'My Amazing Dashboard',
        saveAsNew: true,
      });

      await PageObjects.dashboard.waitForRenderComplete();

      const panelCount = await PageObjects.dashboard.getPanelCount();
      expect(panelCount).to.eql(1);

      const isInLibrary = await PageObjects.timeToVisualize.libraryNotificationExists(
        'document example copy 2'
      );
      expect(isInLibrary).to.be(true);
    });
  });
}
