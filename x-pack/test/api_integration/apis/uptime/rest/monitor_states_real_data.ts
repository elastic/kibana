/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { isRight } from 'fp-ts/lib/Either';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { API_URLS } from '../../../../../legacy/plugins/uptime/common/constants';
import { expectFixtureEql } from './helper/expect_fixture_eql';
import { MonitorSummaryResultType } from '../../../../../legacy/plugins/uptime/common/runtime_types';

const checkMonitorStatesResponse = (
  response: any,
  statesIds: string[],
  absFrom: number,
  absTo: number,
  size: number,
  prevPagination: null | string,
  nextPagination: null | string
) => {
  const decoded = MonitorSummaryResultType.decode(response);
  expect(isRight(decoded)).to.be.ok();
  if (isRight(decoded)) {
    const { summaries, prevPagePagination, nextPagePagination, totalSummaryCount } = decoded.right;
    expect(summaries).to.have.length(size);
    expect(summaries?.map(s => s.monitor_id)).to.eql(statesIds);
    (summaries ?? []).forEach(s => {
      expect(s.state.url.full).to.be.ok();
      expect(s.histogram?.count).to.be(20);
      (s.histogram?.points ?? []).forEach(point => {
        expect(point.timestamp).to.be.greaterThan(absFrom);
        expect(point.timestamp).to.be.lessThan(absTo);
      });
    });
    expect(totalSummaryCount).to.be(2000);
    expect(prevPagePagination).to.be(prevPagination);
    expect(nextPagePagination).to.eql(nextPagination);
  }
};

export default function({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  describe('monitor states endpoint', () => {
    const from = '2019-09-11T03:30:04.380Z';
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
      const LENGTH = 10;
      const absFrom = new Date(from).valueOf();
      const absTo = new Date(to).valueOf();
      const { body } = await supertest.get(
        `${API_URLS.MONITOR_LIST}?dateRangeStart=${from}&dateRangeEnd=${to}&pageSize=${LENGTH}`
      );
      checkMonitorStatesResponse(
        body,
        [
          '0000-intermittent',
          '0001-up',
          '0002-up',
          '0003-up',
          '0004-up',
          '0005-up',
          '0006-up',
          '0007-up',
          '0008-up',
          '0009-up',
        ],
        absFrom,
        absTo,
        LENGTH,
        null,
        '{"cursorDirection":"AFTER","sortOrder":"ASC","cursorKey":{"monitor_id":"0009-up"}}'
      );
    });
  });
}
