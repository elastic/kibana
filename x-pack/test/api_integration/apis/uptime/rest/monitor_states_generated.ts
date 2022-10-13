/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { MonitorSummary } from '@kbn/synthetics-plugin/common/runtime_types';
import { API_URLS } from '@kbn/synthetics-plugin/common/constants';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { makeChecksWithStatus } from './helper/make_checks';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const retry = getService('retry');

  describe('monitor state scoping', async () => {
    const numIps = 4; // Must be > 2 for IP uniqueness checks

    let dateRangeStart: string;
    let dateRangeEnd: string;

    const getBaseUrl = (from: string, to: string) =>
      `${API_URLS.MONITOR_LIST}?dateRangeStart=${from}&dateRangeEnd=${to}&pageSize=10`;

    before('load heartbeat data', () =>
      getService('esArchiver').load('x-pack/test/functional/es_archives/uptime/blank')
    );
    after('unload heartbeat index', () =>
      getService('esArchiver').unload('x-pack/test/functional/es_archives/uptime/blank')
    );

    // In this case we don't actually have any monitors to display
    // but the query should still return successfully. This has
    // caused bugs in the past because a bucket of monitor data
    // was available and the query code assumed at least one
    // event would be a summary for each monitor.
    // See https://github.com/elastic/kibana/issues/81950
    describe('checks with no summaries', async () => {
      const testMonitorId = 'scope-test-id';
      before(async () => {
        const es = getService('es');
        dateRangeStart = new Date().toISOString();
        await makeChecksWithStatus(es, testMonitorId, 1, numIps, 1, {}, 'up', (d) => {
          delete d.summary;
          return d;
        });
      });

      it('should return no monitors and have no errors', async () => {
        const url = getBaseUrl(dateRangeStart, new Date().toISOString());
        const apiResponse = await supertest.get(url);
        expect(apiResponse.status).to.equal(200);
      });
    });

    describe('query document scoping with mismatched check statuses', async () => {
      let checks: any[] = [];
      let nonSummaryIp: string | null = null;
      const testMonitorId = 'scope-test-id';
      const makeApiParams = (monitorId: string, filterClauses: any[] = []): any => {
        return JSON.stringify({
          bool: {
            filter: [{ match: { 'monitor.id': monitorId } }, ...filterClauses],
          },
        });
      };

      before(async () => {
        const es = getService('es');
        dateRangeStart = new Date().toISOString();
        checks = await makeChecksWithStatus(es, testMonitorId, 1, numIps, 1, {}, 'up', (d) => {
          // turn an all up status into having at least one down
          if (d.summary) {
            d.monitor.status = 'down';
            d.summary.up--;
            d.summary.down++;
          }
          return d;
        });

        dateRangeEnd = new Date().toISOString();
        nonSummaryIp = checks[0][0].monitor.ip;
      });

      it('should not match non summary documents if the check status does not match the document status', async () => {
        const filters = makeApiParams(testMonitorId, [{ match: { 'monitor.ip': nonSummaryIp } }]);
        const url =
          getBaseUrl(dateRangeStart, dateRangeEnd) + `&filters=${filters}&statusFilter=down`;

        const apiResponse = await supertest.get(url);
        const nonSummaryRes = apiResponse.body;
        expect(nonSummaryRes.summaries.length).to.eql(0);
      });

      it('should not non match non summary documents if the check status does not match', async () => {
        const filters = makeApiParams(testMonitorId, [{ match: { 'monitor.ip': nonSummaryIp } }]);
        const url =
          getBaseUrl(dateRangeStart, dateRangeEnd) + `&filters=${filters}&statusFilter=up`;

        const apiResponse = await supertest.get(url);
        const nonSummaryRes = apiResponse.body;
        expect(nonSummaryRes.summaries.length).to.eql(0);
      });

      describe('matching outside of the date range', async () => {
        before('set date range to future', () => {
          const futureDate = new Date();

          // Set dateRangeStart to one day from now
          futureDate.setDate(futureDate.getDate() + 1);
          dateRangeStart = futureDate.toISOString();

          // Set dateRangeStart to two days from now
          futureDate.setDate(futureDate.getDate() + 1);
          dateRangeEnd = futureDate.toISOString();
        });

        it('should not match any documents', async () => {
          const filters = makeApiParams(testMonitorId);
          const url =
            getBaseUrl(dateRangeStart, dateRangeEnd) + `&filters=${filters}&statusFilter=up`;

          const apiResponse = await supertest.get(url);
          const nonSummaryRes = apiResponse.body;
          expect(nonSummaryRes.summaries.length).to.eql(0);
        });
      });
    });

    describe('test status filter', async () => {
      const upMonitorId = 'up-test-id';
      const downMonitorId = 'down-test-id';
      const mixMonitorId = 'mix-test-id';
      before('generate three monitors with up, down, mix state', async () => {
        await getService('esArchiver').load('x-pack/test/functional/es_archives/uptime/blank');

        const es = getService('es');

        const observer = {
          geo: {
            name: 'US-East',
            location: '40.7128, -74.0060',
          },
        };

        // Generating three monitors each with two geo locations,
        // One in a down state ,
        // One in an up state,
        // One in a mix state

        dateRangeStart = new Date().toISOString();

        await makeChecksWithStatus(es, upMonitorId, 1, 4, 1, {}, 'up');
        await makeChecksWithStatus(es, upMonitorId, 1, 4, 1, { observer }, 'up');

        await makeChecksWithStatus(es, downMonitorId, 1, 4, 1, {}, 'down');
        await makeChecksWithStatus(es, downMonitorId, 1, 4, 1, { observer }, 'down');

        await makeChecksWithStatus(es, mixMonitorId, 1, 4, 1, {}, 'up');
        await makeChecksWithStatus(es, mixMonitorId, 1, 4, 1, { observer }, 'down');

        dateRangeEnd = new Date().toISOString();
      });

      after('unload heartbeat index', () =>
        getService('esArchiver').unload('x-pack/test/functional/es_archives/uptime/blank')
      );

      it('should return all monitor when no status filter', async () => {
        const apiResponse = await supertest.get(getBaseUrl(dateRangeStart, dateRangeEnd));
        const { summaries } = apiResponse.body;
        expect(summaries.length).to.eql(3);
        // Summaries are by default sorted by monitor names
        expect(summaries.map((summary: MonitorSummary) => summary.monitor_id)).to.eql([
          downMonitorId,
          mixMonitorId,
          upMonitorId,
        ]);
      });

      it('should return a monitor with mix state if check status filter is down', async () => {
        const apiResponse = await supertest.get(
          getBaseUrl(dateRangeStart, dateRangeEnd) + '&statusFilter=down'
        );
        const { summaries } = apiResponse.body;
        expect(summaries.length).to.eql(2);
        summaries.forEach((summary: MonitorSummary) => {
          expect(summary.monitor_id).to.not.eql(upMonitorId);
        });
      });

      it('should not return a monitor with mix state if check status filter is up', async () => {
        await retry.try(async () => {
          const apiResponse = await supertest.get(
            getBaseUrl(dateRangeStart, dateRangeEnd) + '&statusFilter=up'
          );
          const { summaries } = apiResponse.body;

          expect(summaries.length).to.eql(1);
          expect(summaries[0].monitor_id).to.eql(upMonitorId);
        });
      });
    });
  });
}
