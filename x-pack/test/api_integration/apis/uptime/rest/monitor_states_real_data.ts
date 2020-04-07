/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';
import { API_URLS } from '../../../../../legacy/plugins/uptime/common/constants';
import { expectFixtureEql } from './helper/expect_fixture_eql';

export default function({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  describe('monitor states endpoint', () => {
    const from = '2019-09-11T03:31:04.380Z';
    const to = '2019-09-11T03:40:34.410Z';

    it('will fetch monitor state data for the given filters and range', async () => {
      const statusFilter = 'up';
      const filters =
        '{"bool":{"must":[{"match":{"monitor.id":{"query":"0002-up","operator":"and"}}}]}}';
      const apiResponse = await supertest.get(
        `${API_URLS.MONITOR_LIST}?dateRangeStart=${from}&dateRangeEnd=${to}&statusFilter=${statusFilter}&filters=${filters}&pageSize=10`
      );
      expectFixtureEql(apiResponse.body, 'monitor_states_id_filtered');
    });

    it('can navigate forward and backward using pagination', async () => {
      const expectedResultsCount = 100;
      const expectedPageCount = expectedResultsCount / 10;

      let pagination: string | null = null;
      for (let page = 1; page <= expectedPageCount; page++) {
        const baseUrl = `${API_URLS.MONITOR_LIST}?dateRangeStart=${from}&dateRangeEnd=${to}&pageSize=10`;
        const nextUrl: string = baseUrl + `&pagination=${pagination ?? ''}`;
        const nextApiResponse = await supertest.get(nextUrl);
        const nextData = nextApiResponse.body;
        pagination = nextData.nextPagePagination;
        expectFixtureEql(nextData, `monitor_states_page_${page}`);

        // Test to see if the previous page pagination works on every page (other than the first)
        if (page > 1) {
          const prevUrl: string = baseUrl + `&pagination=${nextData.prevPagePagination}`;
          const prevApiResponse = await supertest.get(prevUrl);
          const prevData = prevApiResponse.body;
          expectFixtureEql(prevData, `monitor_states_page_${page}_previous`);
        }
      }
    });

    it('will fetch monitor state data for the given date range', async () => {
      expectFixtureEql(
        await (
          await supertest.get(
            `${API_URLS.MONITOR_LIST}?dateRangeStart=${from}&dateRangeEnd=${to}&pageSize=10`
          )
        ).body,
        'monitor_states'
      );
    });
  });
}
