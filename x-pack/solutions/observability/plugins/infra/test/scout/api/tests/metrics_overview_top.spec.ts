/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import { decodeOrThrow } from '@kbn/io-ts-utils';
import type { TopNodesRequest } from '../../../../common/http_api/overview_api';
import { TopNodesResponseRT } from '../../../../common/http_api/overview_api';
import { apiTest, testData } from '../fixtures';

/**
 * `/api/metrics/overview/top` does not accept `schema` in the request body;
 * preferred schema comes from source config (issue #264011).
 */
apiTest.describe(
  'API /api/metrics/overview/top',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let headers: Record<string, string>;

    apiTest.beforeAll(async ({ samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      headers = { ...testData.COMMON_HEADERS, ...cookieHeader };
    });

    apiTest('returns top hosts for the 7.0 archive window', async ({ apiClient, esArchiver }) => {
      await esArchiver.loadIfNeeded(testData.ES_ARCHIVES.HOSTS_7_0_0);
      const { min, max } = testData.DATES['7.0.0'].hosts;
      const body: TopNodesRequest = {
        sourceId: 'default',
        bucketSize: '300s',
        size: 5,
        timerange: { from: min, to: max },
      };

      const response = await apiClient.post('api/metrics/overview/top', {
        headers,
        responseType: 'json',
        body,
      });

      expect(response).toHaveStatusCode(200);

      const { series } = decodeOrThrow(TopNodesResponseRT)(response.body);
      expect(series).toHaveLength(1);
      expect(series[0].id).toBe('demo-stack-mysql-01');
      expect(series[0].timeseries[1].timestamp - series[0].timeseries[0].timestamp).toBe(300_000);
    });

    apiTest(
      'returns sorted rx/tx calculations for the 8.0 hosts_and_network archive',
      async ({ apiClient, esArchiver }) => {
        await esArchiver.loadIfNeeded(testData.ES_ARCHIVES.HOSTS_AND_NETWORK_8_0_0);
        const { min, max } = testData.DATES['8.0.0'].hosts_and_network;
        const body: TopNodesRequest = {
          sourceId: 'default',
          bucketSize: '300s',
          size: 5,
          timerange: { from: min, to: max },
          sort: 'rx',
          sortDirection: 'asc',
        };

        const response = await apiClient.post('api/metrics/overview/top', {
          headers,
          responseType: 'json',
          body,
        });

        expect(response).toHaveStatusCode(200);

        const { series } = decodeOrThrow(TopNodesResponseRT)(response.body);
        const hosts = series.map(({ name, rx, tx }) => ({ name, rx, tx }));
        expect(hosts).toHaveLength(3);
        expect(hosts[0]).toStrictEqual({ name: 'metricbeat-2', rx: 8000, tx: 16860 });
        expect(hosts[1]).toStrictEqual({ name: 'metricbeat-1', rx: 11250, tx: 25290.5 });
        expect(hosts[2]).toStrictEqual({ name: 'metricbeat-3', rx: null, tx: null });
      }
    );
  }
);
