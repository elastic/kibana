/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

export default function ({ getService, getPageObjects, updateBaselines }) {
  const screenshot = getService('screenshots');
  const browser = getService('browser');
  const esArchiver = getService('esArchiver');
  const PageObjects = getPageObjects(['common', 'dashboard', 'timePicker', 'visualize', 'header']);

  describe('check metricbeat Dashboard', function () {
    before(async function () {
      await esArchiver.load('metricbeat');

      // this navigateToActualURL takes the place of navigating to the dashboard landing page,
      // filtering on the dashboard name, selecting it, setting the timepicker, and going to full screen
      await PageObjects.common.navigateToActualUrl(
        'dashboard',
        'view/Metricbeat-system-overview-ecs?_g=(filters:!(),refreshInterval:(pause:!t,value:0),' +
          'time:(from:%272020-09-29T19:02:37.902Z%27,to:%272020-09-29T19:06:43.218Z%27))&_a=' +
          '(description:%27Overview%20of%20system%20metrics%27,filters:!(),fullScreenMode:!t,' +
          'options:(darkTheme:!f),query:(language:kuery,query:%27%27),timeRestore:!f,' +
          'title:%27%5BMetricbeat%20System%5D%20Overview%20ECS%27,viewMode:view)',
        {
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: true,
        }
      );
      // await PageObjects.common.navigateToApp('dashboard', { insertTimestamp: false });
      // await PageObjects.dashboard.loadSavedDashboard('[Metricbeat System] Overview ECS');
      // await PageObjects.timePicker.setAbsoluteRange(
      //   'Sep 29, 2020 @ 14:02:37.902',
      //   'Sep 29, 2020 @ 14:06:43.218'
      // );
      // await PageObjects.dashboard.clickFullScreenMode();

      await PageObjects.common.sleep(2000);
      await PageObjects.dashboard.waitForRenderComplete();
      await browser.setScreenshotSize(1600, 1200);
    });

    it('[Metricbeat System] Overview ECS should match snapshot', async function () {
      await PageObjects.header.waitUntilLoadingHasFinished();
      const percentDifference = await screenshot.compareAgainstBaseline(
        'metricbeat_dashboard',
        updateBaselines
      );

      // following steps are to grap a screenshot of one of the tsvb gauge visualizations used in the dashboard
      // to help debug why it intermittently renders in the dashboard
      await PageObjects.common.navigateToActualUrl(
        'visualize',
        'edit/825fdb80-4d1d-11e7-b5f2-2b7c1895bf32-ecs?_g=(filters%3A!()%2CrefreshInterval%3A(pause%3A!t%2Cvalue%3A0)%2Ctime%3A(from%3Anow-15m%2Cto%3Anow))'
      );
      await PageObjects.header.waitUntilLoadingHasFinished();
      await screenshot.take('diskUsedGauge');

      // back to checking the dashboard
      expect(percentDifference).to.be.lessThan(0.01);
    });
  });
}
