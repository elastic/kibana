/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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
  ]);
  const dashboardPanelActions = getService('dashboardPanelActions');
  const inspector = getService('inspector');
  const pieChart = getService('pieChart');
  const find = getService('find');
  const dashboardExpect = getService('dashboardExpect');
  const queryBar = getService('queryBar');
  const browser = getService('browser');
  const sendToBackground = getService('sendToBackground');

  describe('send to background with relative time', () => {
    before(async () => {
      await PageObjects.common.sleep(5000); // this part was copied from `x-pack/test/functional/apps/dashboard/_async_dashboard.ts` and this was sleep was needed because of flakiness
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
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.timePicker.pauseAutoRefresh(); // sample data has auto-refresh on
      await queryBar.submitQuery();
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.dashboard.waitForRenderComplete();
      await checkSampleDashboardLoaded();

      await sendToBackground.expectState('completed');
      await sendToBackground.save();
      await sendToBackground.expectState('backgroundCompleted');
      const savedSessionId = await dashboardPanelActions.getSearchSessionIdByTitle(
        '[Flights] Airline Carrier'
      );
      const resolvedTimeRange = await getResolvedTimeRangeFromPanel('[Flights] Airline Carrier');

      // load URL to restore a saved session
      const url = await browser.getCurrentUrl();
      const savedSessionURL = `${url}&searchSessionId=${savedSessionId}`
        .replace('now-24h', `'${resolvedTimeRange.gte}'`)
        .replace('now', `'${resolvedTimeRange.lte}'`);
      log.debug('Trying to restore session by URL:', savedSessionId);
      await browser.get(savedSessionURL);
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.dashboard.waitForRenderComplete();
      await checkSampleDashboardLoaded();

      // Check that session is restored
      await sendToBackground.expectState('restored');
    });
  });

  // HELPERS

  async function getResolvedTimeRangeFromPanel(
    panelTitle: string
  ): Promise<{ gte: string; lte: string }> {
    await dashboardPanelActions.openInspectorByTitle(panelTitle);
    await inspector.openInspectorRequestsView();
    await (await inspector.getOpenRequestDetailRequestButton()).click();
    const request = JSON.parse(await inspector.getCodeEditorValue());
    return request.query.bool.filter.find((f: any) => f.range).range.timestamp;
  }

  async function checkSampleDashboardLoaded() {
    log.debug('Checking no error labels');
    await testSubjects.missingOrFail('embeddableErrorLabel');
    log.debug('Checking pie charts rendered');
    await pieChart.expectPieSliceCount(4);
    log.debug('Checking area, bar and heatmap charts rendered');
    await dashboardExpect.seriesElementCount(15);
    log.debug('Checking saved searches rendered');
    await dashboardExpect.savedSearchRowCount(50);
    log.debug('Checking input controls rendered');
    await dashboardExpect.inputControlItemCount(3);
    log.debug('Checking tag cloud rendered');
    await dashboardExpect.tagCloudWithValuesFound(['Sunny', 'Rain', 'Clear', 'Cloudy', 'Hail']);
    log.debug('Checking vega chart rendered');
    const tsvb = await find.existsByCssSelector('.vgaVis__view');
    expect(tsvb).to.be(true);
  }
}
