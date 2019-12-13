/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { monitorStatesQueryString } from '../../../../../legacy/plugins/uptime/public/queries/monitor_states_query';
import { expectFixtureEql } from './helpers/expect_fixture_eql';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { makeChecks } from './helpers/make_checks';

export default function({ getService }: FtrProviderContext) {
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
          const index = 'heartbeat-8.0.0';

          const es = getService('legacyEs');
          dateRangeStart = new Date().toISOString();
          checks = await makeChecks(es, index, testMonitorId, 1, numIps, {}, d => {
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
  });
}
