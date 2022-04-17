/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { API_URLS } from '@kbn/uptime-plugin/common/constants';
import { expectFixtureEql } from './helper/expect_fixture_eql';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  describe('monitor duration query', () => {
    const supertest = getService('supertest');

    it('will fetch a series of data points for monitor duration and status', async () => {
      const dateStart = '2019-09-11T03:31:04.380Z';
      const dateEnd = '2019-09-11T03:40:34.410Z';

      const monitorId = '0002-up';

      const apiResponse = await supertest.get(API_URLS.MONITOR_DURATION).query({
        monitorId,
        dateStart,
        dateEnd,
      });
      const data = apiResponse.body;
      expectFixtureEql(data, 'monitor_charts');
    });

    it('will fetch empty sets for a date range with no data', async () => {
      const dateStart = '1999-09-11T03:31:04.380Z';
      const dateEnd = '1999-09-11T03:40:34.410Z';

      const monitorId = '0002-up';

      const apiResponse = await supertest.get(API_URLS.MONITOR_DURATION).query({
        monitorId,
        dateStart,
        dateEnd,
      });
      const data = apiResponse.body;

      expectFixtureEql(data, 'monitor_charts_empty_sets');
    });
  });
}
