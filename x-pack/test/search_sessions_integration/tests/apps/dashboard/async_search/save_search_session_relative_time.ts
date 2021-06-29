/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const log = getService('log');
  const retry = getService('retry');
  const PageObjects = getPageObjects([
    'common',
    'header',
    'dashboard',
    'visChart',
    'home',
    'timePicker',
    'maps',
    'searchSessionsManagement',
  ]);
  const dashboardPanelActions = getService('dashboardPanelActions');
  const inspector = getService('inspector');
  const pieChart = getService('pieChart');
  const find = getService('find');
  const dashboardExpect = getService('dashboardExpect');
  const searchSessions = getService('searchSessions');

  describe('save a search sessions with relative time', () => {
    before(async () => {
      await PageObjects.common.navigateToUrl('home', '/tutorial_directory/sampleData', {
        useActualUrl: true,
      });
      await PageObjects.header.waitUntilLoadingHasFinished();
      // use sample data set because it has recent relative time range and bunch of different visualizations
      await PageObjects.home.addSampleDataSet('flights');
      await retry.tryForTime(10000, async () => {
        const isInstalled = await PageObjects.home.isSampleDataSetInstalled('flights');
        expect(isInstalled).to.be(true);
      });
      await PageObjects.common.navigateToApp('dashboard');
    });

    after(async () => {
      await PageObjects.common.navigateToUrl('home', '/tutorial_directory/sampleData', {
        useActualUrl: true,
      });
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.home.removeSampleDataSet('flights');
      const isInstalled = await PageObjects.home.isSampleDataSetInstalled('flights');
      expect(isInstalled).to.be(false);
    });

    it('Saves and restores a session with relative time ranges', async () => {
      await PageObjects.dashboard.loadSavedDashboard('[Flights] Global Flight Dashboard');
      await PageObjects.dashboard.waitForRenderComplete();
      await PageObjects.timePicker.pauseAutoRefresh(); // sample data has auto-refresh on
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.dashboard.waitForRenderComplete();

      // saving dashboard to populate map buffer. See https://github.com/elastic/kibana/pull/91148 for more info
      // This can be removed after a fix to https://github.com/elastic/kibana/issues/98180 is completed
      await PageObjects.dashboard.switchToEditMode();
      await PageObjects.dashboard.clickQuickSave();
      await PageObjects.dashboard.clickCancelOutOfEditMode();

      await searchSessions.expectState('completed');
      await searchSessions.save();
      await searchSessions.expectState('backgroundCompleted');

      await checkSampleDashboardLoaded();

      // load URL to restore a saved session
      await PageObjects.searchSessionsManagement.goTo();
      const searchSessionList = await PageObjects.searchSessionsManagement.getList();

      // navigate to dashboard
      await searchSessionList[0].view();

      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.dashboard.waitForRenderComplete();
      await checkSampleDashboardLoaded();

      // Check that session is restored
      await searchSessions.expectState('restored');
    });
  });

  // HELPERS

  async function checkSampleDashboardLoaded() {
    log.debug('Checking no error labels');
    await testSubjects.missingOrFail('embeddableErrorLabel');
    log.debug('Checking pie charts rendered');
    await pieChart.expectPieSliceCount(4);
    log.debug('Checking area, bar and heatmap charts rendered');
    await dashboardExpect.seriesElementCount(15);
    log.debug('Checking saved searches rendered');
    await dashboardExpect.savedSearchRowCount(11);
    log.debug('Checking input controls rendered');
    await dashboardExpect.inputControlItemCount(3);
    log.debug('Checking tag cloud rendered');
    await dashboardExpect.tagCloudWithValuesFound(['Sunny', 'Rain', 'Clear', 'Cloudy', 'Hail']);
    log.debug('Checking vega chart rendered');
    const tsvb = await find.existsByCssSelector('.vgaVis__view');
    expect(tsvb).to.be(true);
    log.debug('Checking map rendered');
    await dashboardPanelActions.openInspectorByTitle(
      '[Flights] Origin and Destination Flight Time'
    );
    await testSubjects.click('inspectorRequestChooser');
    await testSubjects.click(`inspectorRequestChooserFlight Origin Location`);
    const requestStats = await inspector.getTableData();
    const totalHits = PageObjects.maps.getInspectorStatRowHit(requestStats, 'Hits');
    expect(totalHits).to.equal('0');
    await inspector.close();
  }
}
