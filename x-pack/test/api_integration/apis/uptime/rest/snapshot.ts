/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { API_URLS } from '@kbn/uptime-plugin/common/constants';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { makeChecksWithStatus, getChecksDateRange } from './helper/make_checks';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('snapshot count', () => {
    const dateRangeStart = new Date().toISOString();
    const dateRangeEnd = new Date().toISOString();

    describe('when no data is present', async () => {
      it('returns a null snapshot', async () => {
        const apiResponse = await supertest.get(API_URLS.SNAPSHOT_COUNT).query({
          dateRangeStart,
          dateRangeEnd,
        });

        expect(apiResponse.body).to.eql({
          total: 0,
          up: 0,
          down: 0,
        });
      });
    });

    describe('when data is present', async () => {
      const numUpMonitors = 10;
      const numDownMonitors = 7;
      const numIps = 2;
      const checksPerMonitor = 5;
      const scheduleEvery = 10000; // fake monitor checks every 10s
      let dateRange: { start: string; end: string };

      [true, false].forEach((includeTimespan: boolean) => {
        [true, false].forEach((includeObserver: boolean) => {
          describe(`with timespans=${includeTimespan} and observer=${includeObserver}`, async () => {
            before(async () => {
              const promises: Array<Promise<any>> = [];

              const mogrify = (d: any) => {
                if (!includeTimespan) {
                  delete d.monitor.timespan;
                }
                if (!includeObserver) {
                  delete d.observer;
                }
                return d;
              };

              const makeMonitorChecks = async (monitorId: string, status: 'up' | 'down') => {
                return makeChecksWithStatus(
                  getService('es'),
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
              const apiResponse = await supertest.get(API_URLS.SNAPSHOT_COUNT).query({
                dateRangeStart: dateRange.start,
                dateRangeEnd: dateRange.end,
              });

              expect(apiResponse.body).to.eql({
                total: 17,
                up: 10,
                down: 7,
              });
            });
          });
        });
      });
    });
  });
}
