/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { makeChecksWithStatus } from '../../../api_integration/apis/uptime/rest/helper/make_checks';
import { FtrProviderContext } from '../../ftr_provider_context';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const { uptime: uptimePage, header } = getPageObjects(['uptime', 'header']);
  const uptime = getService('uptime');
  const esArchiver = getService('esArchiver');

  const archive = 'x-pack/test/functional/es_archives/uptime/blank';

  const monitor = () => uptime.monitor;

  describe('Ping redirects', () => {
    const start = '~ 15 minutes ago';
    const end = 'now';

    const MONITOR_ID = 'redirect-testing-id';

    before(async () => {
      await esArchiver.loadIfNeeded(archive);
    });

    after('unload', async () => {
      await esArchiver.unload(archive);
    });

    beforeEach(async () => {
      await makeChecksWithStatus(
        getService('es'),
        MONITOR_ID,
        5,
        2,
        10000,
        {
          http: {
            rtt: { total: { us: 157784 } },
            response: {
              status_code: 200,
              redirects: ['http://localhost:3000/first', 'https://www.washingtonpost.com/'],
              body: {
                bytes: 642102,
                hash: '597a8cfb33ff8e09bff16283306553c3895282aaf5386e1843d466d44979e28a',
              },
            },
          },
        },
        'up'
      );
      await delay(1000);
    });

    it('loads and goes to details page', async () => {
      await uptime.navigation.goToUptime();
      await uptimePage.loadDataAndGoToMonitorPage(start, end, MONITOR_ID);
    });

    it('display redirect info in detail panel', async () => {
      await header.waitUntilLoadingHasFinished();
      await monitor().hasRedirectInfo();
    });

    it('displays redirects in ping list expand row', async () => {
      await monitor().hasRedirectInfoInPingList();
    });
  });
};
