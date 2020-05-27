/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { expectFixtureEql } from './helper/expect_fixture_eql';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { assertCloseTo } from '../../../../../plugins/uptime/server/lib/helper';

export default function ({ getService }: FtrProviderContext) {
  describe('pingHistogram', () => {
    const supertest = getService('supertest');

    it('will fetch histogram data for all monitors', async () => {
      const dateStart = '2019-09-11T03:31:04.380Z';
      const dateEnd = '2019-09-11T03:40:34.410Z';

      const apiResponse = await supertest.get(
        `/api/uptime/ping/histogram?dateStart=${dateStart}&dateEnd=${dateEnd}`
      );
      const data = apiResponse.body;

      // manually testing this value and then removing it to avoid flakiness
      const { interval } = data;
      assertCloseTo(interval, 22801, 100);
      delete data.interval;
      expectFixtureEql(data, 'ping_histogram');
    });

    it('will fetch histogram data for a given monitor id', async () => {
      const dateStart = '2019-09-11T03:31:04.380Z';
      const dateEnd = '2019-09-11T03:40:34.410Z';
      const monitorId = '0002-up';

      const apiResponse = await supertest.get(
        `/api/uptime/ping/histogram?monitorId=${monitorId}&dateStart=${dateStart}&dateEnd=${dateEnd}`
      );
      const data = apiResponse.body;

      const { interval } = data;
      assertCloseTo(interval, 22801, 100);
      delete data.interval;
      expectFixtureEql(data, 'ping_histogram_by_id');
    });

    it('will fetch histogram data for a given filter', async () => {
      const dateStart = '2019-09-11T03:31:04.380Z';
      const dateEnd = '2019-09-11T03:40:34.410Z';
      const filters =
        '{"bool":{"must":[{"match":{"monitor.status":{"query":"up","operator":"and"}}}]}}';

      const apiResponse = await supertest.get(
        `/api/uptime/ping/histogram?dateStart=${dateStart}&dateEnd=${dateEnd}&filters=${filters}`
      );
      const data = apiResponse.body;

      const { interval } = data;
      assertCloseTo(interval, 22801, 100);
      delete data.interval;
      expectFixtureEql(data, 'ping_histogram_by_filter');
    });
  });
}
