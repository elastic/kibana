/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  describe('uptime anomaly alert', () => {
    const pageObjects = getPageObjects(['common', 'uptime']);
    const supertest = getService('supertest');
    const retry = getService('retry');

    const monitorId = '0000-intermittent';

    const uptime = getService('uptime');

    const DEFAULT_DATE_START = 'Sep 10, 2019 @ 12:40:08.078';
    const DEFAULT_DATE_END = 'Sep 11, 2019 @ 19:40:08.078';
    let alerts: any;
    const alertId = 'uptime-anomaly-alert';

    before(async () => {
      alerts = getService('uptime').alerts;

      await uptime.navigation.goToUptime();

      await uptime.navigation.loadDataAndGoToMonitorPage(
        DEFAULT_DATE_START,
        DEFAULT_DATE_END,
        monitorId
      );
    });

    it('can delete existing job', async () => {
      if (await uptime.ml.alreadyHasJob()) {
        await uptime.ml.openMLManageMenu();
        await uptime.ml.deleteMLJob();
        await uptime.navigation.refreshApp();
      }
    });

    it('can open ml flyout', async () => {
      await uptime.ml.openMLFlyout();
    });

    it('has permission to  create job', async () => {
      expect(uptime.ml.canCreateJob()).to.eql(true);
      expect(uptime.ml.hasNoLicenseInfo()).to.eql(false);
    });

    it('can create job successfully', async () => {
      await uptime.ml.createMLJob();
      await pageObjects.common.closeToast();
      await uptime.ml.cancelAlertFlyout();
    });

    it('can open ML Manage Menu', async () => {
      await uptime.ml.openMLManageMenu();
    });

    it('can open anomaly alert flyout', async () => {
      await uptime.ml.openAlertFlyout();
    });

    it('can set alert name', async () => {
      await alerts.setAlertName(alertId);
    });

    it('can set alert tags', async () => {
      await alerts.setAlertTags(['uptime', 'anomaly-alert']);
    });

    it('can change anomaly alert threshold', async () => {
      await uptime.ml.changeAlertThreshold('major');
    });

    it('can save alert', async () => {
      await alerts.clickSaveAlertButton();
      await pageObjects.common.closeToast();
    });

    it('has created a valid alert with expected parameters', async () => {
      let alert: any;
      await retry.tryForTime(15000, async () => {
        const apiResponse = await supertest.get(`/api/alerts/_find?search=${alertId}`);
        const alertsFromThisTest = apiResponse.body.data.filter(
          ({ name }: { name: string }) => name === alertId
        );
        expect(alertsFromThisTest).to.have.length(1);
        alert = alertsFromThisTest[0];
      });

      // Ensure the parameters and other stateful data
      // on the alert match up with the values we provided
      // for our test helper to input into the flyout.
      const { actions, alertTypeId, consumer, id, params, tags } = alert;
      try {
        expect(actions).to.eql([]);
        expect(alertTypeId).to.eql('xpack.uptime.alerts.durationAnomaly');
        expect(consumer).to.eql('uptime');
        expect(tags).to.eql(['uptime', 'anomaly-alert']);
        expect(params.monitorId).to.eql(monitorId);
        expect(params.severity).to.eql(50);
      } finally {
        await supertest.delete(`/api/alerts/alert/${id}`).set('kbn-xsrf', 'true').expect(204);
      }
    });

    it('change button to disable anomaly alert', async () => {
      await uptime.ml.openMLManageMenu();
      expect(uptime.ml.disableAnomalyAlertIsVisible()).to.eql(true);
    });

    it('can delete job successfully', async () => {
      await uptime.ml.deleteMLJob();
    });

    it('verifies that alert is also deleted', async () => {
      await retry.tryForTime(15000, async () => {
        const apiResponse = await supertest.get(`/api/alerts/_find?search=${alertId}`);
        const alertsFromThisTest = apiResponse.body.data.filter(
          ({ name }: { name: string }) => name === alertId
        );
        expect(alertsFromThisTest).to.have.length(0);
      });
    });
  });
};
