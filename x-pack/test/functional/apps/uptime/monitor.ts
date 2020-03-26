/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const uptimeService = getService('uptime');
  const pageObjects = getPageObjects(['uptime']);
  const archive = 'uptime/full_heartbeat';

  describe('monitor page', function() {
    this.tags(['skipFirefox']);
    const dateStart = 'Sep 10, 2019 @ 12:40:08.078';
    const dateEnd = 'Sep 11, 2019 @ 19:40:08.078';
    const monitorId = '0000-intermittent';
    const monitorName = '0000-intermittent';
    before(async () => {
      await Promise.all([
        // start with an empty .kibana index
        esArchiver.load('empty_kibana'),
        // load some basic heartbeat data only if the index doesn't exist
        esArchiver.loadIfNeeded(archive),
      ]);
      await uptimeService.navigation.goToUptime();
    });
    after(async () => {
      await esArchiver.unload('empty_kibana');
    });
    it('loads and displays uptime data based on date range', async () => {
      await pageObjects.uptime.loadDataAndGoToMonitorPage(
        dateStart,
        dateEnd,
        monitorId,
        monitorName
      );
    });
  });
};
