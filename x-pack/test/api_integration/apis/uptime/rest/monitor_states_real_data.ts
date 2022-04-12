/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { isRight } from 'fp-ts/lib/Either';
import { FtrProviderContext } from '../../../ftr_provider_context';
import {
  MonitorSummariesResult,
  MonitorSummariesResultType,
} from '../../../../../plugins/uptime/common/runtime_types';
import { API_URLS } from '../../../../../plugins/uptime/common/constants';

interface ExpectedMonitorStatesPage {
  response: any;
  statesIds: string[];
  statuses: string[];
  absFrom: number;
  absTo: number;
  size: number;
  prevPagination: null | string;
  nextPagination: null | string;
}

type PendingExpectedMonitorStatesPage = Pick<
  ExpectedMonitorStatesPage,
  'statesIds' | 'statuses' | 'prevPagination' | 'nextPagination'
>;

const checkMonitorStatesResponse = ({
  response,
  statesIds,
  statuses,
  absFrom,
  absTo,
  size,
  prevPagination,
  nextPagination,
}: ExpectedMonitorStatesPage) => {
  const decoded = MonitorSummariesResultType.decode(response);
  expect(isRight(decoded)).to.be.ok();
  if (isRight(decoded)) {
    const { summaries, prevPagePagination, nextPagePagination } =
      decoded.right as MonitorSummariesResult;
    expect(summaries).to.have.length(size);
    expect(summaries?.map((s) => s.monitor_id)).to.eql(statesIds);
    expect(
      summaries?.map((s) => (s.state.summary?.up && !s.state.summary?.down ? 'up' : 'down'))
    ).to.eql(statuses);
    (summaries ?? []).forEach((s) => {
      expect(s.state.url.full).to.be.ok();
      expect(Array.isArray(s.histogram?.points)).to.be(true);
      (s.histogram?.points ?? []).forEach((point) => {
        expect(point.timestamp).to.be.greaterThan(absFrom);
        expect(point.timestamp).to.be.lessThan(absTo);
      });
    });
    expect(prevPagePagination).to.be(prevPagination);
    expect(nextPagePagination).to.eql(nextPagination);
  }
};

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  describe('monitor states endpoint', () => {
    const from = '2019-09-11T03:30:04.380Z';
    const to = '2019-09-11T03:40:34.410Z';
    const absFrom = new Date(from).valueOf();
    const absTo = new Date(to).valueOf();

    it('will fetch monitor state data for the given filters and range', async () => {
      const statusFilter = 'up';
      const size = 10;
      const filters =
        '{"bool":{"must":[{"match":{"monitor.id":{"query":"0002-up","operator":"and"}}}]}}';
      const apiResponse = await supertest.get(
        `${API_URLS.MONITOR_LIST}?dateRangeStart=${from}&dateRangeEnd=${to}&statusFilter=${statusFilter}&filters=${filters}&pageSize=${size}`
      );
      checkMonitorStatesResponse({
        response: apiResponse.body,
        statesIds: ['0002-up'],
        statuses: ['up'],
        absFrom,
        absTo,
        size: 1,
        prevPagination: null,
        nextPagination: null,
      });
    });

    it('will fetch monitor state data for the given down filters', async () => {
      const statusFilter = 'down';
      const size = 2;
      const { body } = await supertest.get(
        `${API_URLS.MONITOR_LIST}?dateRangeStart=${from}&dateRangeEnd=${to}&statusFilter=${statusFilter}&pageSize=${size}`
      );

      expectSnapshot(body).toMatch();
    });

    it('can navigate forward and backward using pagination', async () => {
      const expectedResultsCount = 100;
      const size = 10;
      const expectedPageCount = expectedResultsCount / size;
      const expectedNextResults: PendingExpectedMonitorStatesPage[] = [
        {
          statesIds: [
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
          statuses: ['up', 'up', 'up', 'up', 'up', 'up', 'up', 'up', 'up', 'up'],
          nextPagination:
            '{"cursorDirection":"AFTER","sortOrder":"ASC","cursorKey":{"monitor_id":"0009-up"}}',
          prevPagination: null,
        },
        {
          statesIds: [
            '0010-down',
            '0011-up',
            '0012-up',
            '0013-up',
            '0014-up',
            '0015-intermittent',
            '0016-up',
            '0017-up',
            '0018-up',
            '0019-up',
          ],
          statuses: ['down', 'up', 'up', 'up', 'up', 'up', 'up', 'up', 'up', 'up'],
          nextPagination:
            '{"cursorDirection":"AFTER","sortOrder":"ASC","cursorKey":{"monitor_id":"0019-up"}}',
          prevPagination:
            '{"cursorKey":{"monitor_id":"0010-down"},"sortOrder":"ASC","cursorDirection":"BEFORE"}',
        },
        {
          statesIds: [
            '0020-down',
            '0021-up',
            '0022-up',
            '0023-up',
            '0024-up',
            '0025-up',
            '0026-up',
            '0027-up',
            '0028-up',
            '0029-up',
          ],
          statuses: ['down', 'up', 'up', 'up', 'up', 'up', 'up', 'up', 'up', 'up'],
          nextPagination:
            '{"cursorDirection":"AFTER","sortOrder":"ASC","cursorKey":{"monitor_id":"0029-up"}}',
          prevPagination:
            '{"cursorKey":{"monitor_id":"0020-down"},"sortOrder":"ASC","cursorDirection":"BEFORE"}',
        },
        {
          statesIds: [
            '0030-intermittent',
            '0031-up',
            '0032-up',
            '0033-up',
            '0034-up',
            '0035-up',
            '0036-up',
            '0037-up',
            '0038-up',
            '0039-up',
          ],
          statuses: ['down', 'up', 'up', 'up', 'up', 'up', 'up', 'up', 'up', 'up'],
          nextPagination:
            '{"cursorDirection":"AFTER","sortOrder":"ASC","cursorKey":{"monitor_id":"0039-up"}}',
          prevPagination:
            '{"cursorKey":{"monitor_id":"0030-intermittent"},"sortOrder":"ASC","cursorDirection":"BEFORE"}',
        },
        {
          statesIds: [
            '0040-down',
            '0041-up',
            '0042-up',
            '0043-up',
            '0044-up',
            '0045-intermittent',
            '0046-up',
            '0047-up',
            '0048-up',
            '0049-up',
          ],
          statuses: ['down', 'up', 'up', 'up', 'up', 'up', 'up', 'up', 'up', 'up'],
          nextPagination:
            '{"cursorDirection":"AFTER","sortOrder":"ASC","cursorKey":{"monitor_id":"0049-up"}}',
          prevPagination:
            '{"cursorKey":{"monitor_id":"0040-down"},"sortOrder":"ASC","cursorDirection":"BEFORE"}',
        },
        {
          statesIds: [
            '0050-down',
            '0051-up',
            '0052-up',
            '0053-up',
            '0054-up',
            '0055-up',
            '0056-up',
            '0057-up',
            '0058-up',
            '0059-up',
          ],
          statuses: ['down', 'up', 'up', 'up', 'up', 'up', 'up', 'up', 'up', 'up'],
          nextPagination:
            '{"cursorDirection":"AFTER","sortOrder":"ASC","cursorKey":{"monitor_id":"0059-up"}}',
          prevPagination:
            '{"cursorKey":{"monitor_id":"0050-down"},"sortOrder":"ASC","cursorDirection":"BEFORE"}',
        },
        {
          statesIds: [
            '0060-intermittent',
            '0061-up',
            '0062-up',
            '0063-up',
            '0064-up',
            '0065-up',
            '0066-up',
            '0067-up',
            '0068-up',
            '0069-up',
          ],
          statuses: ['up', 'up', 'up', 'up', 'up', 'up', 'up', 'up', 'up', 'up'],
          nextPagination:
            '{"cursorDirection":"AFTER","sortOrder":"ASC","cursorKey":{"monitor_id":"0069-up"}}',
          prevPagination:
            '{"cursorKey":{"monitor_id":"0060-intermittent"},"sortOrder":"ASC","cursorDirection":"BEFORE"}',
        },
        {
          statesIds: [
            '0070-down',
            '0071-up',
            '0072-up',
            '0073-up',
            '0074-up',
            '0075-intermittent',
            '0076-up',
            '0077-up',
            '0078-up',
            '0079-up',
          ],
          statuses: ['down', 'up', 'up', 'up', 'up', 'up', 'up', 'up', 'up', 'up'],
          nextPagination:
            '{"cursorDirection":"AFTER","sortOrder":"ASC","cursorKey":{"monitor_id":"0079-up"}}',
          prevPagination:
            '{"cursorKey":{"monitor_id":"0070-down"},"sortOrder":"ASC","cursorDirection":"BEFORE"}',
        },
        {
          statesIds: [
            '0080-down',
            '0081-up',
            '0082-up',
            '0083-up',
            '0084-up',
            '0085-up',
            '0086-up',
            '0087-up',
            '0088-up',
            '0089-up',
          ],
          statuses: ['down', 'up', 'up', 'up', 'up', 'up', 'up', 'up', 'up', 'up'],
          nextPagination:
            '{"cursorDirection":"AFTER","sortOrder":"ASC","cursorKey":{"monitor_id":"0089-up"}}',
          prevPagination:
            '{"cursorKey":{"monitor_id":"0080-down"},"sortOrder":"ASC","cursorDirection":"BEFORE"}',
        },
        {
          statesIds: [
            '0090-intermittent',
            '0091-up',
            '0092-up',
            '0093-up',
            '0094-up',
            '0095-up',
            '0096-up',
            '0097-up',
            '0098-up',
            '0099-up',
          ],
          statuses: ['up', 'up', 'up', 'up', 'up', 'up', 'up', 'up', 'up', 'up'],
          nextPagination: null,
          prevPagination:
            '{"cursorKey":{"monitor_id":"0090-intermittent"},"sortOrder":"ASC","cursorDirection":"BEFORE"}',
        },
      ];

      const expectedPrevResults: PendingExpectedMonitorStatesPage[] = [
        {
          statesIds: [
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
          statuses: ['up', 'up', 'up', 'up', 'up', 'up', 'up', 'up', 'up', 'up'],
          nextPagination:
            '{"cursorKey":{"monitor_id":"0009-up"},"sortOrder":"ASC","cursorDirection":"AFTER"}',
          prevPagination: null,
        },
        {
          statesIds: [
            '0010-down',
            '0011-up',
            '0012-up',
            '0013-up',
            '0014-up',
            '0015-intermittent',
            '0016-up',
            '0017-up',
            '0018-up',
            '0019-up',
          ],
          statuses: ['down', 'up', 'up', 'up', 'up', 'up', 'up', 'up', 'up', 'up'],
          nextPagination:
            '{"cursorKey":{"monitor_id":"0019-up"},"sortOrder":"ASC","cursorDirection":"AFTER"}',
          prevPagination:
            '{"cursorKey":{"monitor_id":"0010-down"},"sortOrder":"ASC","cursorDirection":"BEFORE"}',
        },
        {
          statesIds: [
            '0020-down',
            '0021-up',
            '0022-up',
            '0023-up',
            '0024-up',
            '0025-up',
            '0026-up',
            '0027-up',
            '0028-up',
            '0029-up',
          ],
          statuses: ['down', 'up', 'up', 'up', 'up', 'up', 'up', 'up', 'up', 'up'],
          nextPagination:
            '{"cursorKey":{"monitor_id":"0029-up"},"sortOrder":"ASC","cursorDirection":"AFTER"}',
          prevPagination:
            '{"cursorKey":{"monitor_id":"0020-down"},"sortOrder":"ASC","cursorDirection":"BEFORE"}',
        },
        {
          statesIds: [
            '0030-intermittent',
            '0031-up',
            '0032-up',
            '0033-up',
            '0034-up',
            '0035-up',
            '0036-up',
            '0037-up',
            '0038-up',
            '0039-up',
          ],
          statuses: ['down', 'up', 'up', 'up', 'up', 'up', 'up', 'up', 'up', 'up'],
          nextPagination:
            '{"cursorKey":{"monitor_id":"0039-up"},"sortOrder":"ASC","cursorDirection":"AFTER"}',
          prevPagination:
            '{"cursorKey":{"monitor_id":"0030-intermittent"},"sortOrder":"ASC","cursorDirection":"BEFORE"}',
        },
        {
          statesIds: [
            '0040-down',
            '0041-up',
            '0042-up',
            '0043-up',
            '0044-up',
            '0045-intermittent',
            '0046-up',
            '0047-up',
            '0048-up',
            '0049-up',
          ],
          statuses: ['down', 'up', 'up', 'up', 'up', 'up', 'up', 'up', 'up', 'up'],
          nextPagination:
            '{"cursorKey":{"monitor_id":"0049-up"},"sortOrder":"ASC","cursorDirection":"AFTER"}',
          prevPagination:
            '{"cursorKey":{"monitor_id":"0040-down"},"sortOrder":"ASC","cursorDirection":"BEFORE"}',
        },
        {
          statesIds: [
            '0050-down',
            '0051-up',
            '0052-up',
            '0053-up',
            '0054-up',
            '0055-up',
            '0056-up',
            '0057-up',
            '0058-up',
            '0059-up',
          ],
          statuses: ['down', 'up', 'up', 'up', 'up', 'up', 'up', 'up', 'up', 'up'],
          nextPagination:
            '{"cursorKey":{"monitor_id":"0059-up"},"sortOrder":"ASC","cursorDirection":"AFTER"}',
          prevPagination:
            '{"cursorKey":{"monitor_id":"0050-down"},"sortOrder":"ASC","cursorDirection":"BEFORE"}',
        },
        {
          statesIds: [
            '0060-intermittent',
            '0061-up',
            '0062-up',
            '0063-up',
            '0064-up',
            '0065-up',
            '0066-up',
            '0067-up',
            '0068-up',
            '0069-up',
          ],
          statuses: ['up', 'up', 'up', 'up', 'up', 'up', 'up', 'up', 'up', 'up'],
          nextPagination:
            '{"cursorKey":{"monitor_id":"0069-up"},"sortOrder":"ASC","cursorDirection":"AFTER"}',
          prevPagination:
            '{"cursorKey":{"monitor_id":"0060-intermittent"},"sortOrder":"ASC","cursorDirection":"BEFORE"}',
        },
        {
          statesIds: [
            '0070-down',
            '0071-up',
            '0072-up',
            '0073-up',
            '0074-up',
            '0075-intermittent',
            '0076-up',
            '0077-up',
            '0078-up',
            '0079-up',
          ],
          statuses: ['down', 'up', 'up', 'up', 'up', 'up', 'up', 'up', 'up', 'up'],
          nextPagination:
            '{"cursorKey":{"monitor_id":"0079-up"},"sortOrder":"ASC","cursorDirection":"AFTER"}',
          prevPagination:
            '{"cursorKey":{"monitor_id":"0070-down"},"sortOrder":"ASC","cursorDirection":"BEFORE"}',
        },
        {
          statesIds: [
            '0080-down',
            '0081-up',
            '0082-up',
            '0083-up',
            '0084-up',
            '0085-up',
            '0086-up',
            '0087-up',
            '0088-up',
            '0089-up',
          ],
          statuses: ['down', 'up', 'up', 'up', 'up', 'up', 'up', 'up', 'up', 'up'],
          nextPagination:
            '{"cursorKey":{"monitor_id":"0089-up"},"sortOrder":"ASC","cursorDirection":"AFTER"}',
          prevPagination:
            '{"cursorKey":{"monitor_id":"0080-down"},"sortOrder":"ASC","cursorDirection":"BEFORE"}',
        },
      ];

      let pagination: string | null = null;
      for (let page = 1; page <= expectedPageCount; page++) {
        const baseUrl = `${API_URLS.MONITOR_LIST}?dateRangeStart=${from}&dateRangeEnd=${to}&pageSize=${size}`;
        const nextUrl: string = baseUrl + `&pagination=${pagination ?? ''}`;
        const nextApiResponse = await supertest.get(nextUrl);
        const nextData = nextApiResponse.body;
        pagination = nextData.nextPagePagination;
        checkMonitorStatesResponse({
          response: nextData,
          ...expectedNextResults[page - 1],
          absFrom,
          absTo,
          size,
        });

        // Test to see if the previous page pagination works on every page (other than the first)
        if (page > 1) {
          const prevUrl: string = baseUrl + `&pagination=${nextData.prevPagePagination}`;
          const prevApiResponse = await supertest.get(prevUrl);
          const prevData = prevApiResponse.body;
          checkMonitorStatesResponse({
            response: prevData,
            ...expectedPrevResults[page - 2],
            absFrom,
            absTo,
            size,
          });
        }
      }
    });

    it('will fetch monitor state data for the given date range', async () => {
      const LENGTH = 10;
      const { body } = await supertest.get(
        `${API_URLS.MONITOR_LIST}?dateRangeStart=${from}&dateRangeEnd=${to}&pageSize=${LENGTH}`
      );
      checkMonitorStatesResponse({
        response: body,
        statesIds: [
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
        statuses: ['up', 'up', 'up', 'up', 'up', 'up', 'up', 'up', 'up', 'up'],
        absFrom,
        absTo,
        size: LENGTH,
        prevPagination: null,
        nextPagination:
          '{"cursorDirection":"AFTER","sortOrder":"ASC","cursorKey":{"monitor_id":"0009-up"}}',
      });
    });
  });
}
