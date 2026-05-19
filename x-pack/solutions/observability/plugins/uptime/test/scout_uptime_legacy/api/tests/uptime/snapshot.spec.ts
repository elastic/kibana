/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RoleApiCredentials } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import { apiTest, testData } from '../../fixtures';
import { makeChecksWithStatus, getChecksDateRange } from '../../fixtures/helpers/make_checks';

apiTest.describe('snapshot count', { tag: '@local-stateful-classic' }, () => {
  let adminCredentials: RoleApiCredentials;

  apiTest.beforeAll(async ({ requestAuth, esArchiver }) => {
    adminCredentials = await requestAuth.getApiKey('admin');
    await esArchiver.load(testData.ES_ARCHIVES.BLANK);
  });

  apiTest.afterAll(async ({ esArchiver }) => {
    await esArchiver.unload(testData.ES_ARCHIVES.BLANK);
  });

  apiTest('returns null snapshot when no data', async ({ apiClient }) => {
    const response = await apiClient.get(testData.API_URLS.SNAPSHOT_COUNT.slice(1), {
      headers: { ...adminCredentials.apiKeyHeader, ...testData.COMMON_HEADERS },
      query: {
        dateRangeStart: new Date().toISOString(),
        dateRangeEnd: new Date().toISOString(),
      },
      responseType: 'json',
    });

    expect(response.body).toStrictEqual({
      total: 0,
      up: 0,
      down: 0,
    });
  });

  for (const includeTimespan of [true, false]) {
    for (const includeObserver of [true, false]) {
      apiTest(
        `counts correctly with timespans=${includeTimespan} and observer=${includeObserver}`,
        async ({ apiClient, esClient }) => {
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

          for (let i = 0; i < 10; i++) {
            promises.push(
              makeChecksWithStatus(esClient, `up-${i}`, 5, 2, 10000, {}, 'up', mogrify)
            );
          }
          for (let i = 0; i < 7; i++) {
            promises.push(
              makeChecksWithStatus(esClient, `down-${i}`, 5, 2, 10000, {}, 'down', mogrify)
            );
          }

          const allResults = await Promise.all(promises);
          const dateRange = getChecksDateRange(allResults);

          const response = await apiClient.get(testData.API_URLS.SNAPSHOT_COUNT.slice(1), {
            headers: { ...adminCredentials.apiKeyHeader, ...testData.COMMON_HEADERS },
            query: {
              dateRangeStart: dateRange.start,
              dateRangeEnd: dateRange.end,
            },
            responseType: 'json',
          });

          expect(response.body).toStrictEqual({
            total: 17,
            up: 10,
            down: 7,
          });
        }
      );
    }
  }
});
