/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

export default function ({ getService, getPageObjects, updateBaselines }) {
  const screenshot = getService('screenshots');
  const browser = getService('browser');
  const PageObjects = getPageObjects(['common', 'maps']);

  describe('check Elastic Maps Server', function () {
    before(async function () {
      // this navigateToActualURL takes the place of navigating to the maps landing page,
      // filtering on the map name, selecting it and setting the timepicker
      //await PageObjects.common.navigateToActualUrl(
      //  'maps',
      //  '7f72db90-4a8d-11eb-9e7a-8996af36387e#?_g=(filters:!(),refreshInterval:(pause:!t,value:0),' +
      //    'time:(from:now-1y,to:now))&_a=(filters:!())',
      //  {
      //    ensureCurrentUrl: false,
      //    shouldLoginIfPrompted: true,
      //  }
      //);
      await PageObjects.maps.loadSavedMap('EMS Test');
      await PageObjects.common.sleep(2000);
      await browser.setScreenshotSize(1000, 1000);
    });

    it('[ElasticMapsService] EMS Test should match screenshot', async function () {
      const percentDifference = await screenshot.compareAgainstBaseline(
        'ems_test',
        updateBaselines
      );
      expect(percentDifference).to.be.lessThan(0.01);
    });
  });
}
