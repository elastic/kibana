/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { expectFixtureEql } from '../graphql/helpers/expect_fixture_eql';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { makeChecks, makeChecksWithStatus } from '../graphql/helpers/make_checks';

export default function({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('snapshot count', () => {
    let dateRangeStart = new Date().toISOString();
    let dateRangeEnd = new Date().toISOString();

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

      before(async () => {
        dateRangeStart = new Date().toISOString();

        const promises: Array<Promise<any>> = [];
        const makeMonitorChecks = async (monitorName: string, status: 'up' | 'down') => {
          return makeChecksWithStatus(
            getService('legacyEs'),
            'heartbeat-8.0.0',
            monitorName,
            checksPerMonitor,
            numIps,
            {},
            status
          );
        };

        for (let i = 0; i < numUpMonitors; i++) {
          promises.push(makeMonitorChecks(`up-${i}`, 'up'));
        }
        for (let i = 0; i < numDownMonitors; i++) {
          promises.push(makeMonitorChecks(`down-${i}`, 'down'));
        }

        await Promise.all(promises);
        dateRangeEnd = new Date().toISOString();
        return null;
      });

      it('will count all statuses correctly', async () => {
        const apiResponse = await supertest.get(
          `/api/uptime/snapshot/count?dateRangeStart=${dateRangeStart}&dateRangeEnd=${dateRangeEnd}`
        );

        expectFixtureEql(apiResponse.body, 'snapshot');
      });

      it('will fetch a monitor snapshot filtered by down status', async () => {
        const filters = `{"bool":{"must":[{"match":{"monitor.status":{"query":"down","operator":"and"}}}]}}`;
        const statusFilter = 'down';
        const apiResponse = await supertest.get(
          `/api/uptime/snapshot/count?dateRangeStart=${dateRangeStart}&dateRangeEnd=${dateRangeEnd}&filters=${filters}&statusFilter=${statusFilter}`
        );
        expectFixtureEql(apiResponse.body, 'snapshot_filtered_by_down');
      });

      it('will fetch a monitor snapshot filtered by up status', async () => {
        const filters = `{"bool":{"must":[{"match":{"monitor.status":{"query":"up","operator":"and"}}}]}}`;
        const statusFilter = 'up';
        const apiResponse = await supertest.get(
          `/api/uptime/snapshot/count?dateRangeStart=${dateRangeStart}&dateRangeEnd=${dateRangeEnd}&filters=${filters}&statusFilter=${statusFilter}`
        );
        expectFixtureEql(apiResponse.body, 'snapshot_filtered_by_up');
      });
    });
  });
}
