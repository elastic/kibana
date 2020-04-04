/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default ({ getService }: FtrProviderContext) => {
  const uptime = getService('uptime');

  describe('uptime ml anomaly', function() {
    this.tags(['skipFirefox']);
    const dateStart = 'Sep 10, 2019 @ 12:40:08.078';
    const dateEnd = 'Sep 11, 2019 @ 19:40:08.078';
    const monitorId = '0000-intermittent';

    beforeEach(async () => {
      if (!(await uptime.navigation.checkIfOnMonitorPage(monitorId))) {
        await uptime.navigation.loadDataAndGoToMonitorPage(dateStart, dateEnd, monitorId);
      }
    });

    it('loads and displays uptime data based on date range', async () => {
      await uptime.ml.openMLFlyoutOrMenu();
    });

    it('loads and displays uptime data based on date range1', async () => {
      await uptime.ml.openMLFlyoutOrMenu();
    });

    it('can create and delete ML anomaly job', async () => {
      if (await uptime.ml.alreadyHasJob()) {
        await uptime.ml.deleteMLJob();
        await uptime.navigation.refreshApp();
        await uptime.ml.createMLJob();
      } else {
        await uptime.ml.createMLJob();
        await uptime.navigation.refreshApp();
        await uptime.ml.deleteMLJob();
      }
    });
  });
};
