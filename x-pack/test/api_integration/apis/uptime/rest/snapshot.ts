/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { expectFixtureEql } from '../graphql/helpers/expect_fixture_eql';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { makeChecksWithStatus, getChecksDateRange } from '../graphql/helpers/make_checks';

export default function({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('snapshot count', () => {
    const dateRangeStart = new Date().toISOString();
    const dateRangeEnd = new Date().toISOString();

    describe('when no data is present', async () => {
      it('returns a null snapshot', async () => {
        const apiResponse = await supertest.get(
          `/api/uptime/snapshot/count?dateRangeStart=${dateRangeStart}&dateRangeEnd=${dateRangeEnd}&filters=`
        );

        expectFixtureEql(apiResponse.body, 'snapshot_empty');
      });
    });

    describe('when data is present', async () => {
      const numUpMonitors = 10;
      const numDownMonitors = 7;
      const numIps = 2;
      const checksPerMonitor = 5;
      const scheduleEvery = 10000; // fake monitor checks every 10s
      let dateRange: { start: string; end: string };

      [true, false].forEach(async (includeTimespan: boolean) => {
        describe(`with timespans ${includeTimespan ? 'included' : 'missing'}`, async () => {
          before(async () => {
            const promises: Array<Promise<any>> = [];

            // When includeTimespan is false we have to remove the values there.
            let mogrify = (d: any) => d;
            if ((includeTimespan = false)) {
              mogrify = (d: any): any => {
                d.monitor.delete('timespan');
                return d;
              };
            }

            const makeMonitorChecks = async (monitorId: string, status: 'up' | 'down') => {
              return makeChecksWithStatus(
                getService('legacyEs'),
                monitorId,
                checksPerMonitor,
                numIps,
                scheduleEvery,
                {},
                status,
                mogrify
              );
            };

            for (let i = 0; i < numUpMonitors; i++) {
              promises.push(makeMonitorChecks(`up-${i}`, 'up'));
            }
            for (let i = 0; i < numDownMonitors; i++) {
              promises.push(makeMonitorChecks(`down-${i}`, 'down'));
            }

            const allResults = await Promise.all(promises);
            dateRange = getChecksDateRange(allResults);
          });

          it('will count all statuses correctly', async () => {
            const apiResponse = await supertest.get(
              `/api/uptime/snapshot/count?dateRangeStart=${dateRange.start}&dateRangeEnd=${dateRange.end}`
            );

            expectFixtureEql(apiResponse.body, 'snapshot');
          });

          it('will fetch a monitor snapshot filtered by down status', async () => {
            const statusFilter = 'down';
            const apiResponse = await supertest.get(
              `/api/uptime/snapshot/count?dateRangeStart=${dateRange.start}&dateRangeEnd=${dateRange.end}&statusFilter=${statusFilter}`
            );

            expectFixtureEql(apiResponse.body, 'snapshot_filtered_by_down');
          });

          it('will fetch a monitor snapshot filtered by up status', async () => {
            const statusFilter = 'up';
            const apiResponse = await supertest.get(
              `/api/uptime/snapshot/count?dateRangeStart=${dateRange.start}&dateRangeEnd=${dateRange.end}&statusFilter=${statusFilter}`
            );
            expectFixtureEql(apiResponse.body, 'snapshot_filtered_by_up');
          });
        });
      });
    });
  });
}
