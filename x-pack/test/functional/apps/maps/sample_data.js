/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { UI_SETTINGS } from '../../../../../src/plugins/data/common';

export default function ({ getPageObjects, getService, updateBaselines }) {
  const PageObjects = getPageObjects(['common', 'maps', 'header', 'home', 'timePicker']);
  const screenshot = getService('screenshots');
  const testSubjects = getService('testSubjects');
  const kibanaServer = getService('kibanaServer');
  const security = getService('security');

  // Only update the baseline images from Jenkins session images after comparing them
  // These tests might fail locally because of scaling factors and resolution.

  describe('maps loaded from sample data', () => {
    before(async () => {
      //installing the sample data with test user with super user role and then switching roles with limited privileges
      await security.testUser.setRoles(['superuser'], { skipBrowserRefresh: true });
      await PageObjects.common.navigateToUrl('home', '/tutorial_directory/sampleData', {
        useActualUrl: true,
      });
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.home.addSampleDataSet('ecommerce');
      await PageObjects.home.addSampleDataSet('flights');
      await PageObjects.home.addSampleDataSet('logs');
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
      //running the rest of the tests with limited roles
      await security.testUser.setRoles(['global_maps_all', 'kibana_sample_read'], {
        skipBrowserRefresh: true,
      });
    });

    after(async () => {
      await security.testUser.restoreDefaults();
      await PageObjects.common.navigateToUrl('home', '/tutorial_directory/sampleData', {
        useActualUrl: true,
      });
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.home.removeSampleDataSet('ecommerce');
      await PageObjects.home.removeSampleDataSet('flights');
      await PageObjects.home.removeSampleDataSet('logs');
    });

    describe('ecommerce', () => {
      before(async () => {
        await PageObjects.maps.loadSavedMap('[eCommerce] Orders by Country');
        await PageObjects.maps.toggleLayerVisibility('Road map - desaturated');
        await PageObjects.maps.toggleLayerVisibility('United Kingdom');
        await PageObjects.maps.toggleLayerVisibility('France');
        await PageObjects.maps.toggleLayerVisibility('United States');
        await PageObjects.maps.toggleLayerVisibility('World Countries');
        await PageObjects.timePicker.setCommonlyUsedTime('sample_data range');
        await PageObjects.maps.enterFullScreen();
        await PageObjects.maps.closeLegend();
        const mapContainerElement = await testSubjects.find('mapContainer');
        await mapContainerElement.moveMouseTo({ xOffset: 0, yOffset: 0 });
      });

      after(async () => {
        await PageObjects.maps.existFullScreen();
      });

      it('should load layers', async () => {
        const percentDifference = await screenshot.compareAgainstBaseline(
          'ecommerce_map',
          updateBaselines
        );
        expect(percentDifference).to.be.lessThan(0.02);
      });
    });

    describe('flights', () => {
      before(async () => {
        await PageObjects.maps.loadSavedMap('[Flights] Origin Time Delayed');
        await PageObjects.maps.toggleLayerVisibility('Road map - desaturated');
        await PageObjects.timePicker.setCommonlyUsedTime('sample_data range');
        await PageObjects.maps.enterFullScreen();
        await PageObjects.maps.closeLegend();
        const mapContainerElement = await testSubjects.find('mapContainer');
        await mapContainerElement.moveMouseTo({ xOffset: 0, yOffset: 0 });
      });

      after(async () => {
        await PageObjects.maps.existFullScreen();
      });

      it('should load saved object and display layers', async () => {
        const percentDifference = await screenshot.compareAgainstBaseline(
          'flights_map',
          updateBaselines
        );
        expect(percentDifference).to.be.lessThan(0.02);
      });
    });

    describe('web logs', () => {
      before(async () => {
        await PageObjects.maps.loadSavedMap('[Logs] Total Requests and Bytes');
        await PageObjects.maps.toggleLayerVisibility('Road map - desaturated');
        await PageObjects.maps.toggleLayerVisibility('Total Requests by Destination');
        await PageObjects.timePicker.setCommonlyUsedTime('sample_data range');
        await PageObjects.maps.enterFullScreen();
        await PageObjects.maps.closeLegend();
        const mapContainerElement = await testSubjects.find('mapContainer');
        await mapContainerElement.moveMouseTo({ xOffset: 0, yOffset: 0 });
      });

      after(async () => {
        await PageObjects.maps.existFullScreen();
      });

      it('should load saved object and display layers', async () => {
        const percentDifference = await screenshot.compareAgainstBaseline(
          'web_logs_map',
          updateBaselines
        );
        expect(percentDifference).to.be.lessThan(0.02);
      });
    });
  });
}
