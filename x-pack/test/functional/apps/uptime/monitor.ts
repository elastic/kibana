/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const uptimeService = getService('uptime');
  const { uptime } = getPageObjects(['uptime']);
  const archive = 'uptime/full_heartbeat';

  describe('monitor page', function() {
    this.tags(['skipFirefox']);
    const dateStart = 'Sep 10, 2019 @ 12:40:08.078';
    const dateEnd = 'Sep 11, 2019 @ 19:40:08.078';
    const monitorId = '0000-intermittent';
    const monitorName = '0000-intermittent';

    before(async () => {
      await esArchiver.loadIfNeeded(archive);
      await uptimeService.navigation.goToUptime();
    });

    after(async () => {
      await esArchiver.unload(archive);
    });

    it('loads and displays uptime data based on date range', async () => {
      await uptime.loadDataAndGoToMonitorPage(dateStart, dateEnd, monitorId, monitorName);
    });

    it('displays ping data as expected', async () => {
      await uptime.loadDataAndGoToMonitorPage(
        'Sep 10, 2019 @ 12:40:08.078',
        'Sep 11, 2019 @ 19:40:08.078',
        '0000-intermittent'
      );
      await uptime.checkPingListInteractions(
        [
          '2019-09-11T03:40:34.371Z',
          '2019-09-11T03:40:04.370Z',
          '2019-09-11T03:39:34.370Z',
          '2019-09-11T03:39:04.370Z',
          '2019-09-11T03:38:34.370Z',
          '2019-09-11T03:38:04.370Z',
          '2019-09-11T03:37:34.370Z',
          '2019-09-11T03:37:04.371Z',
          '2019-09-11T03:36:34.370Z',
          '2019-09-11T03:36:04.370Z',
        ],
        'mpls',
        'up'
      );
    });
  });
};
