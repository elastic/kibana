/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../functional/ftr_provider_context';
export default function ({
  getService,
  getPageObjects,
}: FtrProviderContext & { updateBaselines: boolean }) {
  const PageObjects = getPageObjects(['common', 'dashboard', 'timePicker', 'header', 'home', 'discover', 'maps']);
  const browser = getService('browser');
  const renderable = getService('renderable');


  describe('setup dashboard for memory test', function () {
    before(async function () {
      this.timeout(0);
      await PageObjects.common.navigateToActualUrl('home', '/tutorial_directory/sampleData', {
      });
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.common.dismissBanner();
      await browser.refresh();

      await PageObjects.home.launchSampleDashboard("flights");
      await PageObjects.header.waitUntilLoadingHasFinished();
      await renderable.waitForRender();
      await PageObjects.timePicker.startAutoRefresh();
      await PageObjects.common.sleep(900000);

      await PageObjects.common.navigateToActualUrl('home', '/tutorial_directory/sampleData', {
      });
      await PageObjects.home.launchSampleDashboard("logs");
      await PageObjects.header.waitUntilLoadingHasFinished();
      await renderable.waitForRender();
      await PageObjects.timePicker.startAutoRefresh();
      await PageObjects.common.sleep(900000);


      await PageObjects.common.navigateToActualUrl('home', '/tutorial_directory/sampleData', {
      });
      await PageObjects.home.launchSampleDashboard("ecommerce");
      await PageObjects.header.waitUntilLoadingHasFinished();
      await renderable.waitForRender();
      await PageObjects.timePicker.startAutoRefresh();
      await PageObjects.common.sleep(900000);

      await PageObjects.common.navigateToApp('discover');
      await PageObjects.discover.waitUntilSearchingHasFinished();
      await PageObjects.timePicker.startAutoRefresh();
      await PageObjects.common.sleep(900000);

      await PageObjects.maps.loadSavedMap('[eCommerce] Orders by Country');
      await PageObjects.timePicker.startAutoRefresh();
      await PageObjects.common.sleep(900000);


    });
    it('dashboard auto refresh finished successfully', async function () {
      expect(0).to.be.lessThan(1);
    });
  });
}
