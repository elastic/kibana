/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { expectFixtureEql } from './helpers/expect_fixture_eql';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { makeChecksWithStatus } from './helpers/make_checks';
import { monitorStatesQueryString } from '../../../../../legacy/plugins/uptime/public/queries/monitor_states_query';
import { MonitorSummary } from '../../../../../legacy/plugins/uptime/common/graphql/types';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  let dateRangeStart: string;
  let dateRangeEnd: string;

  const getMonitorStates = async (variables: { [key: string]: any } = {}) => {
    const query = {
      operationName: 'MonitorStates',
      query: monitorStatesQueryString,
      variables: {
        dateRangeStart,
        dateRangeEnd,
        pageSize: 10,
        ...variables,
      },
    };

    const {
      body: { data },
    } = await supertest
      .post('/api/uptime/graphql')
      .set('kbn-xsrf', 'foo')
      .send({ ...query });

    return data;
  };

  describe('monitor states', async () => {
    describe('with real world data', () => {
      before('load heartbeat data', () => getService('esArchiver').load('uptime/full_heartbeat'));
      after('unload heartbeat index', () =>
        getService('esArchiver').unload('uptime/full_heartbeat')
      );

      before('set start/end', () => {
        dateRangeStart = '2019-09-11T03:31:04.380Z';
        dateRangeEnd = '2019-09-11T03:40:34.410Z';
      });

      it('will fetch monitor state data for the given filters and range', async () => {
        const data: any = await getMonitorStates({
          statusFilter: 'up',
          filters:
            '{"bool":{"must":[{"match":{"monitor.id":{"query":"0002-up","operator":"and"}}}]}}',
        });
        // await new Promise(r => setTimeout(r, 90000));
        expectFixtureEql(data, 'monitor_states_id_filtered');
      });

      it('will fetch monitor state data for the given date range', async () => {
        expectFixtureEql(await getMonitorStates(), 'monitor_states');
      });

      it('can navigate forward and backward using pagination', async () => {
        const expectedResultsCount = 100;
        const expectedPageCount = expectedResultsCount / 10;

        let pagination: string | null = null;
        for (let page = 1; page <= expectedPageCount; page++) {
          const data: any = await getMonitorStates({ pagination });
          pagination = data.monitorStates.nextPagePagination;
          expectFixtureEql(data, `monitor_states_page_${page}`);

          // Test to see if the previous page pagination works on every page (other than the first)
          if (page > 1) {
            const prevData = await getMonitorStates({
              pagination: data.monitorStates.prevPagePagination,
            });
            expectFixtureEql(prevData, `monitor_states_page_${page}_previous`);
          }
        }
      });
    });

    describe('monitor state scoping', async () => {
      const numIps = 4; // Must be > 2 for IP uniqueness checks

      before('load heartbeat data', () => getService('esArchiver').load('uptime/blank'));
      after('unload heartbeat index', () => getService('esArchiver').unload('uptime/blank'));

      describe('query document scoping with mismatched check statuses', async () => {
        let checks: any[] = [];
        let nonSummaryIp: string | null = null;
        const testMonitorId = 'scope-test-id';
        const makeApiParams = (monitorId: string, filterClauses: any[] = []): any => {
          return {
            filters: JSON.stringify({
              bool: {
                filter: [{ match: { 'monitor.id': monitorId } }, ...filterClauses],
              },
            }),
          };
        };

        before(async () => {
          const es = getService('legacyEs');
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

        it('should return all IPs', async () => {
          const res = await getMonitorStates(makeApiParams(testMonitorId));

          const uniqueIps = new Set<string>();
          res.monitorStates.summaries[0].state.checks.forEach((c: any) =>
            uniqueIps.add(c.monitor.ip)
          );

          expect(uniqueIps.size).to.eql(4);
        });

        it('should match non summary documents without a status filter', async () => {
          const params = makeApiParams(testMonitorId, [{ match: { 'monitor.ip': nonSummaryIp } }]);

          const nonSummaryRes = await getMonitorStates(params);
          expect(nonSummaryRes.monitorStates.summaries.length).to.eql(1);
        });

        it('should not match non summary documents if the check status does not match the document status', async () => {
          const params = makeApiParams(testMonitorId, [{ match: { 'monitor.ip': nonSummaryIp } }]);
          params.statusFilter = 'down';

          const nonSummaryRes = await getMonitorStates(params);
          expect(nonSummaryRes.monitorStates.summaries.length).to.eql(0);
        });

        it('should not non match non summary documents if the check status does not match', async () => {
          const params = makeApiParams(testMonitorId, [{ match: { 'monitor.ip': nonSummaryIp } }]);
          params.statusFilter = 'up';

          const nonSummaryRes = await getMonitorStates(params);
          expect(nonSummaryRes.monitorStates.summaries.length).to.eql(0);
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
            const params = makeApiParams(testMonitorId);
            params.statusFilter = 'up';

            const nonSummaryRes = await getMonitorStates(params);
            expect(nonSummaryRes.monitorStates.summaries.length).to.eql(0);
          });
        });
      });
    });

    describe(' test status filter', async () => {
      const upMonitorId = 'up-test-id';
      const downMonitorId = 'down-test-id';
      const mixMonitorId = 'mix-test-id';
      before('generate three monitors with up, down, mix state', async () => {
        await getService('esArchiver').load('uptime/blank');

        const es = getService('legacyEs');

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

      after('unload heartbeat index', () => getService('esArchiver').unload('uptime/blank'));

      it('should return all monitor when no status filter', async () => {
        const { monitorStates } = await getMonitorStates({});
        expect(monitorStates.summaries.length).to.eql(3);
        // Summaries are by default sorted by monitor names
        expect(
          monitorStates.summaries.map((summary: MonitorSummary) => summary.monitor_id)
        ).to.eql([downMonitorId, mixMonitorId, upMonitorId]);
      });

      it('should return a monitor with mix state if check status filter is down', async () => {
        const { monitorStates } = await getMonitorStates({ statusFilter: 'down' });
        expect(monitorStates.summaries.length).to.eql(2);
        monitorStates.summaries.forEach((summary: MonitorSummary) => {
          expect(summary.monitor_id).to.not.eql(upMonitorId);
        });
      });

      it('should not return a monitor with mix state if check status filter is up', async () => {
        const { monitorStates } = await getMonitorStates({ statusFilter: 'up' });

        expect(monitorStates.summaries.length).to.eql(1);
        expect(monitorStates.summaries[0].monitor_id).to.eql(upMonitorId);
      });
    });
  });
}
