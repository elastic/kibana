/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import semver from 'semver';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const find = getService('find');
  const log = getService('log');
  const renderable = getService('renderable');
  const dashboardExpect = getService('dashboardExpect');
  const PageObjects = getPageObjects(['common', 'header', 'home', 'dashboard', 'timePicker']);
  const browser = getService('browser');

  describe('upgrade dashboard smoke tests', function describeIndexTests() {
    const spaces = [
      { space: 'default', basePath: '' },
      { space: 'automation', basePath: 's/automation' },
    ];

    const dashboardTests = [
      { name: 'flights', numPanels: 15 },
      { name: 'logs', numPanels: 10 },
      { name: 'ecommerce', numPanels: 11 },
    ];

    spaces.forEach(({ space, basePath }) => {
      describe('space: ' + space, () => {
        beforeEach(async () => {
          await PageObjects.common.navigateToActualUrl('home', '/tutorial_directory/sampleData', {
            basePath,
          });
          await PageObjects.header.waitUntilLoadingHasFinished();
          await browser.refresh();
        });
        dashboardTests.forEach(({ name, numPanels }) => {
          it('should launch sample ' + name + ' data set dashboard', async () => {
            await PageObjects.home.launchSampleDashboard(name);
            await PageObjects.timePicker.setCommonlyUsedTime('Last_1 year');
            await PageObjects.header.waitUntilLoadingHasFinished();
            await renderable.waitForRender();
            const panelCount = await PageObjects.dashboard.getPanelCount();
            expect(panelCount).to.be.above(numPanels);
          });
        });
        it('should render visualizations', async () => {
          await PageObjects.home.launchSampleDashboard('flights');
          await PageObjects.header.waitUntilLoadingHasFinished();
          await PageObjects.timePicker.setCommonlyUsedTime('Last_1 year');
          await renderable.waitForRender();
          log.debug('Checking saved searches rendered');
          await dashboardExpect.savedSearchRowCount(49);
          log.debug('Checking input controls rendered');
          if (semver.lt(process.env.ORIGINAL_VERSION!, '8.6.0-SNAPSHOT')) {
            await dashboardExpect.inputControlItemCount(3);
          } else {
            await dashboardExpect.controlCount(3);
          }
          log.debug('Checking tag cloud rendered');
          await dashboardExpect.tagCloudWithValuesFound([
            'Sunny',
            'Rain',
            'Clear',
            'Cloudy',
            'Hail',
          ]);
          log.debug('Checking vega chart rendered');
          const tsvb = await find.existsByCssSelector('.vgaVis__view');
          expect(tsvb).to.be(true);
        });
      });
    });
  });
}
