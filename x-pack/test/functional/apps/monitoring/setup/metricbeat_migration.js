/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { getLifecycleMethods } from '../_get_lifecycle_methods';

export default function ({ getService, getPageObjects }) {
  const deployment = getService('deployment');
  const setupMode = getService('monitoringSetupMode');
  const PageObjects = getPageObjects(['common', 'console']);

  // FLAKY: https://github.com/elastic/kibana/issues/74327
  describe.skip('Setup mode metricbeat migration', function () {
    describe('setup mode btn', () => {
      const { setup, tearDown } = getLifecycleMethods(getService, getPageObjects);

      before(async () => {
        await setup('monitoring/setup/collection/es_and_kibana_mb', {
          from: 'Apr 9, 2019 @ 00:00:00.741',
          to: 'Apr 9, 2019 @ 23:59:59.741',
          useSuperUser: true,
        });
      });

      after(async () => {
        await tearDown();
      });

      it('should exist', async () => {
        expect(await setupMode.doesSetupModeBtnAppear()).to.be(true);
      });

      it('should be clickable and show the bottom bar', async () => {
        await setupMode.clickSetupModeBtn();
        await PageObjects.common.sleep(1000); // bottom drawer animation
        expect(await setupMode.doesBottomBarAppear()).to.be(true);
      });

      it('should not show metricbeat migration if cloud', async () => {
        const isCloud = await deployment.isCloud();
        expect(await setupMode.doesMetricbeatMigrationTooltipAppear()).to.be(!isCloud);
      });

      // TODO: this does not work because TLS isn't enabled in the test env
      // it('should show alerts all the time', async () => {
      //   expect(await setupMode.doesAlertsTooltipAppear()).to.be(true);
      // });
    });
  });
}
