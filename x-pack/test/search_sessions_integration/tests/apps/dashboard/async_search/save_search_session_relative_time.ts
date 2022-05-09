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
  const elasticChart = getService('elasticChart');
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
      await PageObjects.header.waitUntilLoadingHasFinished();

      await searchSessions.expectState('completed');
      await searchSessions.save();
      await searchSessions.expectState('backgroundCompleted');

      await checkSampleDashboardLoaded('xyVisChart');

      // load URL to restore a saved session
      await PageObjects.searchSessionsManagement.goTo();
      const searchSessionList = await PageObjects.searchSessionsManagement.getList();

      // navigate to dashboard
      await searchSessionList[0].view();

      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.dashboard.waitForRenderComplete();
      await checkSampleDashboardLoaded('xyVisChart');

      // Check that session is restored
      await searchSessions.expectState('restored');
    });
  });

  // HELPERS

  async function checkSampleDashboardLoaded(visualizationContainer?: string) {
    log.debug('Checking no error labels');
    await testSubjects.missingOrFail('embeddableErrorLabel');
    log.debug('Checking charts rendered');
    await elasticChart.waitForRenderComplete(visualizationContainer ?? 'lnsVisualizationContainer');
    log.debug('Checking saved searches rendered');
    await dashboardExpect.savedSearchRowCount(11);
    log.debug('Checking input controls rendered');
    await dashboardExpect.inputControlItemCount(3);
    log.debug('Checking tag cloud rendered');
    await dashboardExpect.tagCloudWithValuesFound(['Sunny', 'Rain', 'Clear', 'Cloudy', 'Hail']);
    log.debug('Checking vega chart rendered');
    expect(await find.existsByCssSelector('.vgaVis__view')).to.be(true);
    log.debug('Checking map rendered');
    await dashboardPanelActions.openInspectorByTitle('[Flights] Origin Time Delayed');
    const requestStats = await inspector.getTableData();
    const totalHits = PageObjects.maps.getInspectorStatRowHit(requestStats, 'Hits');
    expect(totalHits).to.equal('0');
    await inspector.close();
  }
}
