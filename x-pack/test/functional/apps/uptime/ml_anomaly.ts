/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default ({ getService }: FtrProviderContext) => {
  const uptime = getService('uptime');
  const log = getService('log');
  const esArchiver = getService('esArchiver');
  const archive = 'uptime/full_heartbeat';

  describe('uptime ml anomaly', function () {
    this.tags(['skipFirefox']);
    const dateStart = 'Sep 10, 2019 @ 12:40:08.078';
    const dateEnd = 'Sep 11, 2019 @ 19:40:08.078';
    const monitorId = '0000-intermittent';

    before(async () => {
      await esArchiver.loadIfNeeded(archive);
      if (!(await uptime.navigation.checkIfOnMonitorPage(monitorId))) {
        await uptime.navigation.loadDataAndGoToMonitorPage(dateStart, dateEnd, monitorId);
      }
      if (await uptime.ml.alreadyHasJob()) {
        log.info('Jon already exists so lets delete it to start fresh.');
        await uptime.ml.deleteMLJob();
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
      // await uptime.navigation.refreshApp();
    });

    it('can open ML Manage Menu', async () => {
      await uptime.ml.openMLManageMenu();
    });

    it('can delete job successfully', async () => {
      await uptime.ml.deleteMLJob();
    });
  });
};
