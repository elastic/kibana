/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const browser = getService('browser');
  const dataGrid = getService('dataGrid');
  const dashboardAddPanel = getService('dashboardAddPanel');
  const dashboardPanelActions = getService('dashboardPanelActions');
  const filterBar = getService('filterBar');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const testSubjects = getService('testSubjects');
  const { common, dashboard, header } = getPageObjects(['common', 'dashboard', 'header']);

  describe('discover saved search embeddable', () => {
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

    const addSearchEmbeddableToDashboard = async (title = 'Rendering-Test:-saved-search') => {
      await dashboardAddPanel.addSavedSearch(title);
      await header.waitUntilLoadingHasFinished();
      await dashboard.waitForRenderComplete();
      const rows = await dataGrid.getDocTableRows();
      expect(rows.length).to.be.above(0);
    };

    const refreshDashboardPage = async (requireRenderComplete = false) => {
      await browser.refresh();
      await header.waitUntilLoadingHasFinished();
      if (requireRenderComplete) {
        await dashboard.waitForRenderComplete();
      }
    };

    it('should allow removing the dashboard panel after the underlying saved search has been deleted', async () => {
      const searchTitle = 'TempSearch';
      const searchId = '90943e30-9a47-11e8-b64d-95841ca0b247';
      await kibanaServer.savedObjects.create({
        type: 'search',
        id: searchId,
        overwrite: false,
        attributes: {
          title: searchTitle,
          description: '',
          columns: ['agent', 'bytes', 'clientip'],
          sort: [['@timestamp', 'desc']],
          kibanaSavedObjectMeta: {
            searchSourceJSON:
              '{"highlightAll":true,"version":true,"query":{"language":"lucene","query":""},"filter":[],"indexRefName":"kibanaSavedObjectMeta.searchSourceJSON.index"}',
          },
        },
        references: [
          {
            id: '0bf35f60-3dc9-11e8-8660-4d65aa086b3c',
            name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
            type: 'index-pattern',
          },
        ],
      });
      await addSearchEmbeddableToDashboard(searchTitle);
      await dashboard.saveDashboard('Dashboard with deleted saved search', {
        waitDialogIsClosed: true,
        exitFromEditMode: false,
        saveAsNew: true,
      });
      await kibanaServer.savedObjects.delete({
        type: 'search',
        id: searchId,
      });
      await refreshDashboardPage();
      await testSubjects.existOrFail('embeddableError');
      const panels = await dashboard.getDashboardPanels();
      await dashboardPanelActions.removePanel(panels[0]);
      await header.waitUntilLoadingHasFinished();
      await testSubjects.missingOrFail('embeddableError');
    });
  });
}
