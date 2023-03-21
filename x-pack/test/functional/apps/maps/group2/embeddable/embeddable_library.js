/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

export default function ({ getPageObjects, getService }) {
  const find = getService('find');
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['common', 'dashboard', 'header', 'maps', 'visualize']);
  const kibanaServer = getService('kibanaServer');
  const security = getService('security');
  const dashboardAddPanel = getService('dashboardAddPanel');
  const dashboardPanelActions = getService('dashboardPanelActions');

  describe('maps in embeddable library', () => {
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
      await kibanaServer.uiSettings.replace({
        defaultIndex: 'c698b940-e149-11e8-a35a-370a8516603a',
      });
      await PageObjects.common.navigateToApp('dashboard');
      await PageObjects.dashboard.clickNewDashboard();
      await dashboardAddPanel.clickEditorMenuButton();
      await PageObjects.visualize.clickMapsApp();
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.maps.waitForLayersToLoad();
      await PageObjects.maps.clickSaveAndReturnButton();
      await PageObjects.dashboard.waitForRenderComplete();
    });

    after(async () => {
      await security.testUser.restoreDefaults();
    });

    it('save map panel to embeddable library', async () => {
      await dashboardPanelActions.saveToLibrary('embeddable library map');
      await testSubjects.existOrFail('addPanelToLibrarySuccess');

      const mapPanel = await testSubjects.find('embeddablePanelHeading-embeddablelibrarymap');
      const libraryActionExists = await testSubjects.descendantExists(
        'embeddablePanelNotification-ACTION_LIBRARY_NOTIFICATION',
        mapPanel
      );
      expect(libraryActionExists).to.be(true);
    });

    it('unlink map panel from embeddable library', async () => {
      const originalPanel = await testSubjects.find('embeddablePanelHeading-embeddablelibrarymap');
      await dashboardPanelActions.unlinkFromLibary(originalPanel);
      await testSubjects.existOrFail('unlinkPanelSuccess');

      const updatedPanel = await testSubjects.find('embeddablePanelHeading-embeddablelibrarymap');
      const libraryActionExists = await testSubjects.descendantExists(
        'embeddablePanelNotification-ACTION_LIBRARY_NOTIFICATION',
        updatedPanel
      );
      expect(libraryActionExists).to.be(false);

      await dashboardAddPanel.clickOpenAddPanel();
      await dashboardAddPanel.filterEmbeddableNames('embeddable library map');
      await find.existsByLinkText('embeddable library map');
      await dashboardAddPanel.closeAddPanel();
    });
  });
}
