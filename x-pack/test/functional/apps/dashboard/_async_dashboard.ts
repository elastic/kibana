/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
// import moment from 'moment';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const retry = getService('retry');
  // const find = getService('find');
  const log = getService('log');
  // const security = getService('security');
  const pieChart = getService('pieChart');
  const renderable = getService('renderable');
  // const dashboardExpect = getService('dashboardExpect');
  const appMenu = getService('appsMenu');
  const PageObjects = getPageObjects([
    'common',
    'header',
    'home',
    'discover',
    'dashboard',
    'timePicker',
  ]);

  describe('sample data dashboard', function describeIndexTests() {
    this.tags('smoke');

    before(async () => {
      // await security.testUser.setRoles(['kibana_admin', 'kibana_sample_admin', 'superuser']);
      await PageObjects.common.sleep(5000);
      await PageObjects.common.navigateToUrl('home', 'tutorial_directory/sampleData');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.home.addSampleDataSet('flights');
      const isInstalled = await PageObjects.home.isSampleDataSetInstalled('flights');
      expect(isInstalled).to.be(true);
      // go to Discover, select flight data index, expand timespan to 1 yr
      await appMenu.clickLink('Discover');
      await PageObjects.discover.selectIndexPattern('kibana_sample_data_flights');
      await PageObjects.timePicker.setCommonlyUsedTime('superDatePickerCommonlyUsed_Last_1 year');
      await retry.try(async function () {
        const hitCount = parseInt(await PageObjects.discover.getHitCount(), 10);
        expect(hitCount).to.be.greaterThan(0);
      });
    });

    after(async () => {
      await PageObjects.common.navigateToUrl('home', 'tutorial_directory/sampleData');
      await PageObjects.home.removeSampleDataSet('flights');
      const isInstalled = await PageObjects.home.isSampleDataSetInstalled('flights');
      expect(isInstalled).to.be(false);
      // await security.testUser.restoreDefaults();
    });

    it('should launch sample flights data set dashboard', async () => {
      await appMenu.clickLink('Dashboard');
      await PageObjects.dashboard.loadSavedDashboard('[Flights] Global Flight Dashboard');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.timePicker.setCommonlyUsedTime('superDatePickerCommonlyUsed_Last_1 year');
      await PageObjects.header.waitUntilLoadingHasFinished();

      // check at least one visualization
      await renderable.waitForRender();
      log.debug('Checking pie charts rendered');
      await pieChart.expectPieSliceCount(4);

      await appMenu.clickLink('Discover');
      await retry.try(async function () {
        const hitCount = parseInt(await PageObjects.discover.getHitCount(), 10);
        expect(hitCount).to.be.greaterThan(0);
      });
      await appMenu.clickLink('Dashboard');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await renderable.waitForRender();
      log.debug('Checking pie charts rendered');
      await pieChart.expectPieSliceCount(4);
    });

    it('toggle from Discover to Dashboard attempt 1', async () => {
      await appMenu.clickLink('Discover');
      await retry.try(async function () {
        const hitCount = parseInt(await PageObjects.discover.getHitCount(), 10);
        expect(hitCount).to.be.greaterThan(0);
      });
      await appMenu.clickLink('Dashboard');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await renderable.waitForRender();
      log.debug('Checking pie charts rendered');
      await pieChart.expectPieSliceCount(4);
    });

    it('toggle from Discover to Dashboard attempt 2', async () => {
      await appMenu.clickLink('Discover');
      await retry.try(async function () {
        const hitCount = parseInt(await PageObjects.discover.getHitCount(), 10);
        expect(hitCount).to.be.greaterThan(0);
      });
      await appMenu.clickLink('Dashboard');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await renderable.waitForRender();
      log.debug('Checking pie charts rendered');
      await pieChart.expectPieSliceCount(4);
    });

    // since we're loading sameple data and not picking a time range which is guaranteed to
    // contain all the sample data, we probably can't check all of these

    // log.debug('Checking area, bar and heatmap charts rendered');
    // await dashboardExpect.seriesElementCount(15);
    // log.debug('Checking saved searches rendered');
    // await dashboardExpect.savedSearchRowCount(50);
    // log.debug('Checking input controls rendered');
    // await dashboardExpect.inputControlItemCount(3);
    // log.debug('Checking tag cloud rendered');
    // await dashboardExpect.tagCloudWithValuesFound(['Sunny', 'Rain', 'Clear', 'Cloudy', 'Hail']);
    // log.debug('Checking vega chart rendered');
    // const tsvb = await find.existsByCssSelector('.vgaVis__view');
    // expect(tsvb).to.be(true);
  });
}
