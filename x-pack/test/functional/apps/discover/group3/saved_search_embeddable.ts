/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const browser = getService('browser');
  const dataGrid = getService('dataGrid');
  const dashboardAddPanel = getService('dashboardAddPanel');
  const dashboardPanelActions = getService('dashboardPanelActions');
  const dashboardDrilldownPanelActions = getService('dashboardDrilldownPanelActions');
  const dashboardDrilldownsManage = getService('dashboardDrilldownsManage');
  const filterBar = getService('filterBar');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const queryBar = getService('queryBar');
  const { common, dashboard, header, discover } = getPageObjects([
    'common',
    'dashboard',
    'header',
    'discover',
  ]);

  describe('discover saved search embeddable', () => {
    before(async () => {
      await esArchiver.loadIfNeeded(
        'src/platform/test/functional/fixtures/es_archiver/logstash_functional'
      );
      await esArchiver.loadIfNeeded(
        'src/platform/test/functional/fixtures/es_archiver/dashboard/current/data'
      );
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.importExport.load(
        'src/platform/test/functional/fixtures/kbn_archiver/dashboard/current/kibana'
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

    it('should support URL drilldown', async () => {
      await addSearchEmbeddableToDashboard();
      await dashboardDrilldownPanelActions.clickCreateDrilldown();
      const drilldownName = 'URL drilldown';
      const urlTemplate =
        "{{kibanaUrl}}/app/discover#/?_g=(filters:!(),refreshInterval:(pause:!t,value:0),time:(from:'{{context.panel.timeRange.from}}',to:'{{context.panel.timeRange.to}}'))" +
        "&_a=(columns:!(_source),filters:{{rison context.panel.filters}},index:'{{context.panel.indexPatternId}}',interval:auto," +
        "query:(language:{{context.panel.query.language}},query:'clientip:239.190.189.77'),sort:!())";
      await testSubjects.click('actionFactoryItem-URL_DRILLDOWN');
      await dashboardDrilldownsManage.fillInDashboardToURLDrilldownWizard({
        drilldownName,
        destinationURLTemplate: urlTemplate,
        trigger: 'CONTEXT_MENU_TRIGGER',
      });
      await testSubjects.click('urlDrilldownAdditionalOptions');
      await testSubjects.click('urlDrilldownOpenInNewTab');
      await dashboardDrilldownsManage.saveChanges();
      await dashboard.saveDashboard('Dashboard with URL drilldown', {
        saveAsNew: true,
        waitDialogIsClosed: true,
        exitFromEditMode: true,
      });
      await browser.refresh();
      await header.waitUntilLoadingHasFinished();
      await dashboard.waitForRenderComplete();
      await dashboardPanelActions.openContextMenu();
      await find.clickByLinkText(drilldownName);
      await discover.waitForDiscoverAppOnScreen();
      await header.waitUntilLoadingHasFinished();
      await discover.waitForDocTableLoadingComplete();
      expect(await queryBar.getQueryString()).to.be('clientip:239.190.189.77');
      expect(await discover.getHitCount()).to.be('6');
    });
  });
}
