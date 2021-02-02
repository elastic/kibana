/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

export default function ({ getPageObjects, getService }) {
  const find = getService('find');
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['common', 'dashboard', 'maps']);
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
        false
      );
      await kibanaServer.uiSettings.replace({
        defaultIndex: 'c698b940-e149-11e8-a35a-370a8516603a',
      });
      await PageObjects.common.navigateToApp('dashboard');
      await PageObjects.dashboard.clickNewDashboard();
    });

    after(async () => {
      await security.testUser.restoreDefaults();
    });

    it('unlink lens panel from embeddable library', async () => {
      await PageObjects.common.navigateToApp('dashboard');
      await PageObjects.dashboard.clickNewDashboard();
      await dashboardAddPanel.clickOpenAddPanel();
      await dashboardAddPanel.filterEmbeddableNames('document example');
      await find.clickByButtonText('document example');
      await dashboardAddPanel.closeAddPanel();

      const originalPanel = await testSubjects.find('embeddablePanelHeading-documentexample');
      await dashboardPanelActions.unlinkFromLibary(originalPanel);
      await testSubjects.existOrFail('unlinkPanelSuccess');

      const updatedPanel = await testSubjects.find('embeddablePanelHeading-documentexample');
      const libraryActionExists = await testSubjects.descendantExists(
        'embeddablePanelNotification-ACTION_LIBRARY_NOTIFICATION',
        updatedPanel
      );
      expect(libraryActionExists).to.be(false);
    });

    it('save lens panel to embeddable library', async () => {
      const originalPanel = await testSubjects.find('embeddablePanelHeading-documentexample');
      await dashboardPanelActions.saveToLibrary('document example - copy', originalPanel);
      await testSubjects.click('confirmSaveSavedObjectButton');
      await testSubjects.existOrFail('addPanelToLibrarySuccess');

      const updatedPanel = await testSubjects.find('embeddablePanelHeading-documentexample-copy');
      const libraryActionExists = await testSubjects.descendantExists(
        'embeddablePanelNotification-ACTION_LIBRARY_NOTIFICATION',
        updatedPanel
      );
      expect(libraryActionExists).to.be(true);
    });
  });
}
