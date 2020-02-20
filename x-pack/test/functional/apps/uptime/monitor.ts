/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const pageObjects = getPageObjects(['uptime']);
  const archive = 'uptime/full_heartbeat';

  describe('monitor page', function() {
    this.tags(['skipFirefox']);
    before(async () => {
      await esArchiver.load(archive);
    });
    after(async () => await esArchiver.unload(archive));
    it('loads and displays uptime data based on date range', async () => {
      await pageObjects.uptime.loadDataAndGoToMonitorPage(
        'Sep 10, 2019 @ 12:40:08.078',
        'Sep 11, 2019 @ 19:40:08.078',
        '0000-intermittent',
        '0000-intermittent'
      );
    });
  });
};
