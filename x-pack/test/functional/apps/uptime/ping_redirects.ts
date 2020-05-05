/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import { makeChecksWithStatus } from '../../../api_integration/apis/uptime/rest/helper/make_checks';
import { FtrProviderContext } from '../../ftr_provider_context';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const { uptime: uptimePage } = getPageObjects(['uptime']);
  const uptime = getService('uptime');
  const esArchiver = getService('esArchiver');
  const archive = 'uptime/blank';

  const monitor = () => uptime.monitor;

  describe('Ping redirects', () => {
    const start = moment()
      .subtract('15', 'm')
      .toISOString();
    const end = moment().toISOString();

    const MONITOR_ID = 'redirect-testing-id';

    before(async () => {
      await esArchiver.loadIfNeeded(archive);
    });

    beforeEach(async () => {
      await makeChecksWithStatus(
        getService('legacyEs'),
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
    });

    it('loads and goes to details page', async () => {
      await uptime.navigation.goToUptime();
      await uptimePage.loadDataAndGoToMonitorPage(start, end, MONITOR_ID);
    });

    it('display redirect info in detail panel', async () => {
      await monitor().hasRedirectInfo();
    });

    it('displays redirects in ping list expand row', async () => {
      await monitor().hasRedirectInfoInPingList();
    });
  });
};
