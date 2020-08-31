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

  describe('monitor page', function () {
    this.tags(['skipFirefox']);
    const dateStart = 'Sep 10, 2019 @ 12:40:08.078';
    const dateEnd = 'Sep 11, 2019 @ 19:40:08.078';
    const monitorId = '0000-intermittent';

    before(async () => {
      await esArchiver.loadIfNeeded(archive);
      await uptimeService.navigation.goToUptime();
    });

    after(async () => {
      await esArchiver.unload(archive);
    });

    describe('navigation to monitor page', () => {
      before(async () => {
        await uptime.loadDataAndGoToMonitorPage(dateStart, dateEnd, monitorId);
      });

      it('displays ping data as expected', async () => {
        await uptime.checkPingListInteractions(
          [
            'XZtoHm0B0I9WX_CznN-6',
            '7ZtoHm0B0I9WX_CzJ96M',
            'pptnHm0B0I9WX_Czst5X',
            'I5tnHm0B0I9WX_CzPd46',
            'y5tmHm0B0I9WX_Czx93x',
            'XZtmHm0B0I9WX_CzUt3H',
            '-JtlHm0B0I9WX_Cz3dyX',
            'k5tlHm0B0I9WX_CzaNxm',
            'NZtkHm0B0I9WX_Cz89w9',
            'zJtkHm0B0I9WX_CzftsN',
          ],
          'mpls',
          'up'
        );
      });
    });
  });
};
