/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaFunctionalTestDefaultProviders } from '../../../types/providers';

// eslint-disable-next-line import/no-default-export
export default ({ getPageObjects, getService }: KibanaFunctionalTestDefaultProviders) => {
  const esArchiver = getService('esArchiver');
  const pageObjects = getPageObjects(['uptime']);
  const archive = 'uptime/full_heartbeat';

  describe('monitor page', async function() {
    this.tags(['skipFirefox']);
    before(async () => {
      await esArchiver.load(archive);
    });
    after(async () => await esArchiver.unload(archive));
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
