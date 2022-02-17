/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { resolve } from 'path';
import { REPO_ROOT } from '@kbn/utils';
import { FtrProviderContext } from '../../../functional/ftr_provider_context';

const INTEGRATION_TEST_ROOT = process.env.WORKSPACE || resolve(REPO_ROOT, '../integration-test');
const ARCHIVE = resolve(INTEGRATION_TEST_ROOT, 'test/es_archives/metricbeat');

export default function ({
  getService,
  getPageObjects,
  updateBaselines,
}: FtrProviderContext & { updateBaselines: boolean }) {
  const screenshot = getService('screenshots');
  const browser = getService('browser');
  const log = getService('log');
  const esArchiver = getService('esArchiver');
  const PageObjects = getPageObjects(['common', 'dashboard', 'timePicker']);

  describe('check metricbeat Dashboard', function () {
    before(async function () {
      await esArchiver.load(ARCHIVE);

      // this navigateToActualURL takes the place of navigating to the dashboard landing page,
      // filtering on the dashboard name, selecting it, setting the timepicker, and going to full screen
      await PageObjects.common.navigateToActualUrl(
        'dashboard',
        'view/Metricbeat-system-overview-ecs?_g=(filters:!(),refreshInterval:(pause:!t,value:0),' +
          'time:(from:%272020-09-29T19:02:37.902Z%27,to:%272020-09-29T19:06:43.218Z%27))&_a=' +
          '(description:%27Overview%20of%20system%20metrics%27,filters:!(),' +
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
      await PageObjects.common.dismissBanner();
      await PageObjects.dashboard.waitForRenderComplete();
      await PageObjects.common.sleep(2000);
      await browser.setScreenshotSize(1000, 1337);
      await PageObjects.common.sleep(2000);
    });

    after(async function () {
      await esArchiver.unload(ARCHIVE);
    });

    it('[Metricbeat System] Overview ECS should match snapshot', async function () {
      try {
        const percentDifference = await screenshot.compareAgainstBaseline(
          'metricbeat_dashboard',
          updateBaselines
        );
        expect(percentDifference).to.be.lessThan(0.017);
      } finally {
        log.debug('### Screenshot taken');
      }
    });
  });
}
