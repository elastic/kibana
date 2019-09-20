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

  describe('monitor page', () => {
    before(async () => {
      await esArchiver.load(archive);
    });
    after(async () => await esArchiver.unload(archive));
    // TODO: update this test when states index is finalized
    it('loads and displays uptime data based on date range', async () => {
      await pageObjects.uptime.loadDataAndGoToMonitorPage(
        '2019-01-28 12:40:08.078',
        '2019-01-29 12:40:08.078',
        'auto-http-0X131221E73F825974',
        'auto-http-0X131221E73F825974'
      );
    });
  });
};
