/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';
import { UI_SETTINGS } from '../../../../../src/plugins/data/common';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const retry = getService('retry');
  const browser = getService('browser');
  const kibanaServer = getService('kibanaServer');
  const esArchiver = getService('esArchiver');
  const log = getService('log');
  const elasticChart = getService('elasticChart');
  const find = getService('find');
  const renderable = getService('renderable');
  const dashboardExpect = getService('dashboardExpect');
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
    before(async () => {
      await esArchiver.emptyKibanaIndex();
      await PageObjects.common.sleep(5000);
      await PageObjects.common.navigateToUrl('home', '/tutorial_directory/sampleData', {
        useActualUrl: true,
      });
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.home.addSampleDataSet('flights');
      await retry.tryForTime(10000, async () => {
        const isInstalled = await PageObjects.home.isSampleDataSetInstalled('flights');
        expect(isInstalled).to.be(true);
      });

      // add the range of the sample data so we can pick it in the quick pick list
      const SAMPLE_DATA_RANGE = `[
        {
          "from": "now-30d",
          "to": "now+40d",
          "display": "sample data range"
        },
        {
          "from": "now/d",
          "to": "now/d",
          "display": "Today"
        },
        {
          "from": "now/w",
          "to": "now/w",
          "display": "This week"
        },
        {
          "from": "now-15m",
          "to": "now",
          "display": "Last 15 minutes"
        },
        {
          "from": "now-30m",
          "to": "now",
          "display": "Last 30 minutes"
        },
        {
          "from": "now-1h",
          "to": "now",
          "display": "Last 1 hour"
        },
        {
          "from": "now-24h",
          "to": "now",
          "display": "Last 24 hours"
        },
        {
          "from": "now-7d",
          "to": "now",
          "display": "Last 7 days"
        },
        {
          "from": "now-30d",
          "to": "now",
          "display": "Last 30 days"
        },
        {
          "from": "now-90d",
          "to": "now",
          "display": "Last 90 days"
        },
        {
          "from": "now-1y",
          "to": "now",
          "display": "Last 1 year"
        }
      ]`;

      await kibanaServer.uiSettings.update({
        [UI_SETTINGS.TIMEPICKER_QUICK_RANGES]: SAMPLE_DATA_RANGE,
      });
      // refresh page to make sure ui settings update is picked up
      await browser.refresh();
      await PageObjects.header.waitUntilLoadingHasFinished();
      await appMenu.clickLink('Discover');
      await PageObjects.discover.selectIndexPattern('kibana_sample_data_flights');
      await PageObjects.timePicker.setCommonlyUsedTime('sample_data range');
      await retry.try(async function () {
        const hitCount = parseInt(await PageObjects.discover.getHitCount(), 10);
        expect(hitCount).to.be.greaterThan(0);
      });
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

    it('should launch sample flights data set dashboard', async () => {
      await appMenu.clickLink('Dashboard');
      await PageObjects.dashboard.loadSavedDashboard('[Flights] Global Flight Dashboard');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.timePicker.setCommonlyUsedTime('sample_data range');
      await PageObjects.header.waitUntilLoadingHasFinished();

      // check at least one visualization
      await renderable.waitForRender();
      log.debug('Checking charts rendered');
      await elasticChart.waitForRenderComplete('xyVisChart');

      await appMenu.clickLink('Discover');
      await retry.try(async function () {
        const hitCount = parseInt(await PageObjects.discover.getHitCount(), 10);
        expect(hitCount).to.be.greaterThan(0);
      });
      await appMenu.clickLink('Dashboard');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await renderable.waitForRender();
      log.debug('Checking charts rendered');
      await elasticChart.waitForRenderComplete('xyVisChart');
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
      log.debug('Checking charts rendered');
      await elasticChart.waitForRenderComplete('xyVisChart');
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
      log.debug('Checking charts rendered');
      await elasticChart.waitForRenderComplete('xyVisChart');

      log.debug('Checking saved searches rendered');
      await dashboardExpect.savedSearchRowCount(10);
      log.debug('Checking input controls rendered');
      await dashboardExpect.inputControlItemCount(3);
      log.debug('Checking tag cloud rendered');
      await dashboardExpect.tagCloudWithValuesFound(['Sunny', 'Rain', 'Clear', 'Cloudy', 'Hail']);
      log.debug('Checking vega chart rendered');
      expect(await find.existsByCssSelector('.vgaVis__view')).to.be(true);
    });
  });
}
