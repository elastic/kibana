/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';
import { UI_SETTINGS } from '../../../../../src/plugins/data/common';

export default function ({
  getPageObjects,
  getService,
  updateBaselines,
}: FtrProviderContext & { updateBaselines: boolean }) {
  const PageObjects = getPageObjects(['common', 'maps', 'header', 'home', 'timePicker']);
  const screenshot = getService('screenshots');
  const testSubjects = getService('testSubjects');
  const kibanaServer = getService('kibanaServer');
  const browser = getService('browser');
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

  // Only update the baseline images from Jenkins session images after comparing them
  // These tests might fail locally because of scaling factors and resolution.

  describe('maps smoke tests', function describeIndexTests() {
    const spaces = [
      { space: 'default', basePath: '' },
      { space: 'automation', basePath: 's/automation' },
    ];

    before(async () => {
      await kibanaServer.uiSettings.update(
        { [UI_SETTINGS.TIMEPICKER_QUICK_RANGES]: SAMPLE_DATA_RANGE },
        { space: 'default' }
      );
      await kibanaServer.uiSettings.update(
        { [UI_SETTINGS.TIMEPICKER_QUICK_RANGES]: SAMPLE_DATA_RANGE },
        { space: 'automation' }
      );
      await browser.refresh();
    });

    spaces.forEach(({ space, basePath }) => {
      describe('space ' + space + ' ecommerce', () => {
        before(async () => {
          await PageObjects.common.navigateToActualUrl('home', '/tutorial_directory/sampleData', {
            basePath,
          });
          await PageObjects.header.waitUntilLoadingHasFinished();
          await PageObjects.home.launchSampleMap('ecommerce');
          await PageObjects.header.waitUntilLoadingHasFinished();
          await PageObjects.maps.waitForLayersToLoad();
          await PageObjects.maps.toggleLayerVisibility('Road map');
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
        it('should load layers', async () => {
          const percentDifference = await screenshot.compareAgainstBaseline(
            'ecommerce_map',
            updateBaselines
          );
          expect(percentDifference.toFixed(3)).to.be.lessThan(0.031);
        });
      });
      describe('space ' + space + ' flights', () => {
        before(async () => {
          await PageObjects.common.navigateToActualUrl('home', '/tutorial_directory/sampleData', {
            basePath,
          });
          await PageObjects.header.waitUntilLoadingHasFinished();
          await PageObjects.home.launchSampleMap('flights');
          await PageObjects.header.waitUntilLoadingHasFinished();
          await PageObjects.maps.waitForLayersToLoad();
          await PageObjects.maps.toggleLayerVisibility('Road map');
          await PageObjects.timePicker.setCommonlyUsedTime('sample_data range');
          await PageObjects.maps.enterFullScreen();
          await PageObjects.maps.closeLegend();
          const mapContainerElement = await testSubjects.find('mapContainer');
          await mapContainerElement.moveMouseTo({ xOffset: 0, yOffset: 0 });
        });
        it('should load saved object and display layers', async () => {
          const percentDifference = await screenshot.compareAgainstBaseline(
            'flights_map',
            updateBaselines
          );
          expect(percentDifference.toFixed(3)).to.be.lessThan(0.031);
        });
      });
      describe('space ' + space + ' web logs', () => {
        before(async () => {
          await PageObjects.common.navigateToActualUrl('home', '/tutorial_directory/sampleData', {
            basePath,
          });
          await PageObjects.header.waitUntilLoadingHasFinished();
          await PageObjects.home.launchSampleMap('logs');
          await PageObjects.header.waitUntilLoadingHasFinished();
          await PageObjects.maps.waitForLayersToLoad();
          await PageObjects.maps.toggleLayerVisibility('Road map');
          await PageObjects.maps.toggleLayerVisibility('Total Requests by Country');
          await PageObjects.timePicker.setCommonlyUsedTime('sample_data range');
          await PageObjects.maps.enterFullScreen();
          await PageObjects.maps.closeLegend();
          const mapContainerElement = await testSubjects.find('mapContainer');
          await mapContainerElement.moveMouseTo({ xOffset: 0, yOffset: 0 });
        });
        it('should load saved object and display layers', async () => {
          const percentDifference = await screenshot.compareAgainstBaseline(
            'web_logs_map',
            updateBaselines
          );
          expect(percentDifference.toFixed(3)).to.be.lessThan(0.031);
        });
      });
    });
  });
}
