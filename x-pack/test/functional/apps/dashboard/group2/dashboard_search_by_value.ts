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
  const { common, dashboard, header } = getPageObjects(['common', 'dashboard', 'header']);

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
      await common.setTime({
        from: 'Sep 22, 2015 @ 00:00:00.000',
        to: 'Sep 23, 2015 @ 00:00:00.000',
      });
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await common.unsetTime();
    });

    beforeEach(async () => {
      await dashboard.navigateToApp();
      await filterBar.ensureFieldEditorModalIsClosed();
      await dashboard.gotoDashboardLandingPage();
      await dashboard.clickNewDashboard();
    });

    const addSearchEmbeddableToDashboard = async () => {
      await dashboardAddPanel.addSavedSearch('Rendering-Test:-saved-search');
      await header.waitUntilLoadingHasFinished();
      await dashboard.waitForRenderComplete();
      const rows = await dataGrid.getDocTableRows();
      expect(rows.length).to.be.above(0);
    };

    it('should allow cloning a by ref saved search embeddable to a by value embeddable', async () => {
      await addSearchEmbeddableToDashboard();
      let titles = await dashboard.getPanelTitles();
      expect(titles.length).to.be(1);
      await dashboardPanelActions.expectLinkedToLibrary(titles[0]);
      await dashboardPanelActions.clonePanel(titles[0]);
      await header.waitUntilLoadingHasFinished();
      await dashboard.waitForRenderComplete();
      titles = await dashboard.getPanelTitles();
      expect(titles.length).to.be(2);
      await dashboardPanelActions.expectLinkedToLibrary(titles[0]);
      await dashboardPanelActions.expectNotLinkedToLibrary(titles[1]);
    });

    it('should allow unlinking a by ref saved search embeddable from library', async () => {
      await addSearchEmbeddableToDashboard();
      let titles = await dashboard.getPanelTitles();
      expect(titles.length).to.be(1);
      await dashboardPanelActions.expectLinkedToLibrary(titles[0]);
      await dashboardPanelActions.unlinkFromLibrary(titles[0]);
      titles = await dashboard.getPanelTitles();
      expect(titles.length).to.be(1);
      await dashboardPanelActions.expectNotLinkedToLibrary(titles[0]);
    });
  });
}
