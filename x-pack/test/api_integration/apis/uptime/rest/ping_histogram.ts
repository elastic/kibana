/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expectFixtureEql } from './helper/expect_fixture_eql';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { API_URLS } from '../../../../../plugins/synthetics/common/constants';

export default function ({ getService }: FtrProviderContext) {
  describe('pingHistogram', () => {
    const supertest = getService('supertest');

    it('will fetch histogram data for all monitors', async () => {
      const dateStart = '2019-09-11T03:31:04.380Z';
      const dateEnd = '2019-09-11T03:40:34.410Z';

      const apiResponse = await supertest.get(API_URLS.PING_HISTOGRAM).query({
        dateStart,
        dateEnd,
      });
      const data = apiResponse.body;

      expectFixtureEql(data, 'ping_histogram');
    });

    it('will fetch histogram data for a given monitor id', async () => {
      const dateStart = '2019-09-11T03:31:04.380Z';
      const dateEnd = '2019-09-11T03:40:34.410Z';
      const monitorId = '0002-up';

      const apiResponse = await supertest.get(API_URLS.PING_HISTOGRAM).query({
        monitorId,
        dateStart,
        dateEnd,
      });
      const data = apiResponse.body;

      expectFixtureEql(data, 'ping_histogram_by_id');
    });

    it('will fetch histogram data for a given filter', async () => {
      const dateStart = '2019-09-11T03:31:04.380Z';
      const dateEnd = '2019-09-11T03:40:34.410Z';
      const filters =
        '{"bool":{"must":[{"match":{"monitor.status":{"query":"up","operator":"and"}}}]}}';

      const apiResponse = await supertest.get(API_URLS.PING_HISTOGRAM).query({
        dateStart,
        dateEnd,
        filters,
      });
      const data = apiResponse.body;

      expectFixtureEql(data, 'ping_histogram_by_filter');
    });
  });
}
