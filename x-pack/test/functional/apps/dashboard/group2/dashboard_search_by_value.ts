/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const dataGrid = getService('dataGrid');
  const dashboardAddPanel = getService('dashboardAddPanel');
  const dashboardPanelActions = getService('dashboardPanelActions');
  const filterBar = getService('filterBar');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['common', 'dashboard', 'header', 'timePicker', 'discover']);

  describe('saved searches by value', () => {
    before(async () => {
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/dashboard/current/data');
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.importExport.load(
        'test/functional/fixtures/kbn_archiver/dashboard/current/kibana'
      );
      await kibanaServer.uiSettings.replace({
        defaultIndex: '0bf35f60-3dc9-11e8-8660-4d65aa086b3c',
      });
      await PageObjects.common.setTime({
        from: 'Sep 22, 2015 @ 00:00:00.000',
        to: 'Sep 23, 2015 @ 00:00:00.000',
      });
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await PageObjects.common.unsetTime();
    });

    beforeEach(async () => {
      await PageObjects.dashboard.navigateToApp();
      await filterBar.ensureFieldEditorModalIsClosed();
      await PageObjects.dashboard.gotoDashboardLandingPage();
      await PageObjects.dashboard.clickNewDashboard();
    });

    const addSearchEmbeddableToDashboard = async () => {
      await dashboardAddPanel.addSavedSearch('Rendering-Test:-saved-search');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.dashboard.waitForRenderComplete();
      const rows = await dataGrid.getDocTableRows();
      expect(rows.length).to.be.above(0);
    };

    it('should allow cloning a by ref saved search embeddable to a by value embeddable', async () => {
      await addSearchEmbeddableToDashboard();
      let panels = await testSubjects.findAll(`embeddablePanel`);
      expect(panels.length).to.be(1);
      expect(
        await testSubjects.descendantExists(
          'embeddablePanelNotification-ACTION_LIBRARY_NOTIFICATION',
          panels[0]
        )
      ).to.be(true);
      await dashboardPanelActions.clonePanelByTitle('RenderingTest:savedsearch');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.dashboard.waitForRenderComplete();
      panels = await testSubjects.findAll('embeddablePanel');
      expect(panels.length).to.be(2);
      expect(
        await testSubjects.descendantExists(
          'embeddablePanelNotification-ACTION_LIBRARY_NOTIFICATION',
          panels[0]
        )
      ).to.be(true);
      expect(
        await testSubjects.descendantExists(
          'embeddablePanelNotification-ACTION_LIBRARY_NOTIFICATION',
          panels[1]
        )
      ).to.be(false);
    });

    it('should allow unlinking a by ref saved search embeddable from library', async () => {
      await addSearchEmbeddableToDashboard();
      let panels = await testSubjects.findAll(`embeddablePanel`);
      expect(panels.length).to.be(1);
      expect(
        await testSubjects.descendantExists(
          'embeddablePanelNotification-ACTION_LIBRARY_NOTIFICATION',
          panels[0]
        )
      ).to.be(true);
      await dashboardPanelActions.legacyUnlinkFromLibary(panels[0]);
      await testSubjects.existOrFail('unlinkPanelSuccess');
      panels = await testSubjects.findAll('embeddablePanel');
      expect(panels.length).to.be(1);
      expect(
        await testSubjects.descendantExists(
          'embeddablePanelNotification-ACTION_LIBRARY_NOTIFICATION',
          panels[0]
        )
      ).to.be(false);
    });
  });
}
