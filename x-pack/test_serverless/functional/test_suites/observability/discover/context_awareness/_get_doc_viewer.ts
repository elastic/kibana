/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import kbnRison from '@kbn/rison';
import type { FtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'discover', 'svlCommonPage', 'header']);
  const testSubjects = getService('testSubjects');
  const dataViews = getService('dataViews');
  const dataGrid = getService('dataGrid');
  const browser = getService('browser');

  describe('extension getDocViewer', () => {
    before(async () => {
      await PageObjects.svlCommonPage.loginAsAdmin();
    });

    describe('ES|QL mode', () => {
      it('should render logs overview tab for logs data source', async () => {
        const state = kbnRison.encode({
          dataSource: { type: 'esql' },
          query: { esql: 'from my-example-logs | sort @timestamp desc' },
        });
        await PageObjects.common.navigateToActualUrl('discover', `?_a=${state}`, {
          ensureCurrentUrl: false,
        });
        await PageObjects.discover.waitUntilSearchingHasFinished();
        await dataGrid.clickRowToggle();
        await testSubjects.existOrFail('docViewerTab-doc_view_table');
        await testSubjects.existOrFail('docViewerTab-doc_view_logs_overview');
        await dataGrid.clickDocViewerTab('doc_view_logs_overview');
        await testSubjects.existOrFail('unifiedDocViewLogsOverviewHeader');
      });

      it('should not render logs overview tab for non-logs data source', async () => {
        const state = kbnRison.encode({
          dataSource: { type: 'esql' },
          query: { esql: 'from my-example-metrics | sort @timestamp desc' },
        });
        await PageObjects.common.navigateToActualUrl('discover', `?_a=${state}`, {
          ensureCurrentUrl: false,
        });
        await PageObjects.discover.waitUntilSearchingHasFinished();
        await dataGrid.clickRowToggle();
        await testSubjects.existOrFail('docViewerTab-doc_view_table');
        await testSubjects.missingOrFail('docViewerTab-doc_view_logs_overview');
      });
    });

    describe('data view mode', () => {
      it('should render logs overview tab for logs data source', async () => {
        await PageObjects.common.navigateToActualUrl('discover', undefined, {
          ensureCurrentUrl: false,
        });
        await dataViews.switchTo('my-example-logs');
        await PageObjects.discover.waitUntilSearchingHasFinished();
        await dataGrid.clickRowToggle();
        await testSubjects.existOrFail('docViewerTab-doc_view_table');
        await testSubjects.existOrFail('docViewerTab-doc_view_logs_overview');
        await dataGrid.clickDocViewerTab('doc_view_logs_overview');
        await testSubjects.existOrFail('unifiedDocViewLogsOverviewHeader');

        // check Surrounding docs page
        const [, surroundingActionEl] = await dataGrid.getRowActions();
        await surroundingActionEl.click();
        await PageObjects.header.waitUntilLoadingHasFinished();
        await browser.refresh();
        await PageObjects.header.waitUntilLoadingHasFinished();

        await dataGrid.clickRowToggle({ isAnchorRow: true });
        await testSubjects.existOrFail('docViewerTab-doc_view_table');
        await testSubjects.existOrFail('docViewerTab-doc_view_logs_overview');
        await dataGrid.clickDocViewerTab('doc_view_logs_overview');
        await testSubjects.existOrFail('unifiedDocViewLogsOverviewHeader');

        // check Single doc page
        const [singleDocActionEl] = await dataGrid.getRowActions();
        await singleDocActionEl.click();
        await PageObjects.header.waitUntilLoadingHasFinished();
        await browser.refresh();
        await PageObjects.header.waitUntilLoadingHasFinished();

        await testSubjects.existOrFail('docViewerTab-doc_view_table');
        await testSubjects.existOrFail('docViewerTab-doc_view_logs_overview');
        await dataGrid.clickDocViewerTab('doc_view_logs_overview');
        await testSubjects.existOrFail('unifiedDocViewLogsOverviewHeader');
      });

      it('should not render logs overview tab for non-logs data source', async () => {
        await PageObjects.common.navigateToActualUrl('discover', undefined, {
          ensureCurrentUrl: false,
        });
        await dataViews.switchTo('my-example-metrics');
        await PageObjects.discover.waitUntilSearchingHasFinished();
        await dataGrid.clickRowToggle();
        await testSubjects.existOrFail('docViewerTab-doc_view_table');
        await testSubjects.missingOrFail('docViewerTab-doc_view_logs_overview');

        // check Surrounding docs page
        const [, surroundingActionEl] = await dataGrid.getRowActions();
        await surroundingActionEl.click();
        await PageObjects.header.waitUntilLoadingHasFinished();
        await browser.refresh();
        await PageObjects.header.waitUntilLoadingHasFinished();

        await dataGrid.clickRowToggle({ isAnchorRow: true });
        await testSubjects.existOrFail('docViewerTab-doc_view_table');
        await testSubjects.missingOrFail('docViewerTab-doc_view_logs_overview');

        // check Single doc page
        const [singleDocActionEl] = await dataGrid.getRowActions();
        await singleDocActionEl.click();
        await PageObjects.header.waitUntilLoadingHasFinished();
        await browser.refresh();
        await PageObjects.header.waitUntilLoadingHasFinished();

        await testSubjects.existOrFail('docViewerTab-doc_view_table');
        await testSubjects.missingOrFail('docViewerTab-doc_view_logs_overview');
      });
    });
  });
}
