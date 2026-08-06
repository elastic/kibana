/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RoleApiCredentials } from '@kbn/scout-oblt';
import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import { decodeOrThrow } from '@kbn/io-ts-utils';
import { metricsExplorerResponseRT } from '../../../../common/http_api/metrics_explorer';
import { apiTest, testData } from '../fixtures';

const METRICS_EXPLORER_PATH = '/api/infra/metrics_explorer';
const { min, max } = testData.HOSTS_7_0_0_DATES;

apiTest.describe('Metrics Explorer API', { tag: tags.stateful.all }, () => {
  let viewerApiCredentials: RoleApiCredentials;

  apiTest.beforeAll(async ({ requestAuth, esArchiver }) => {
    viewerApiCredentials = await requestAuth.getApiKey('viewer');
    await esArchiver.loadIfNeeded(testData.ES_ARCHIVES.hosts7_0_0);
  });

  apiTest('works for multiple metrics', async ({ apiClient }) => {
    const response = await apiClient.post(METRICS_EXPLORER_PATH, {
      headers: {
        ...viewerApiCredentials.apiKeyHeader,
        ...testData.INTERNAL_HEADERS,
      },
      responseType: 'json',
      body: {
        timerange: {
          field: '@timestamp',
          to: max,
          from: min,
          interval: '>=1m',
        },
        indexPattern: 'metricbeat-*',
        metrics: [
          {
            aggregation: 'avg',
            field: 'system.cpu.user.pct',
          },
          {
            aggregation: 'count',
          },
        ],
      },
    });

    expect(response).toHaveStatusCode(200);
    const body = decodeOrThrow(metricsExplorerResponseRT)(response.body);
    expect(body.series).toHaveLength(1);
    const firstSeries = body.series[0];
    expect(firstSeries).toMatchObject({ id: '*' });
    expect(firstSeries.columns).toStrictEqual([
      { name: 'timestamp', type: 'date' },
      { name: 'metric_0', type: 'number' },
      { name: 'metric_1', type: 'number' },
    ]);
    expect(firstSeries.rows).toHaveLength(8);
  });

  apiTest('applies filterQuery to data', async ({ apiClient }) => {
    const response = await apiClient.post(METRICS_EXPLORER_PATH, {
      headers: {
        ...viewerApiCredentials.apiKeyHeader,
        ...testData.INTERNAL_HEADERS,
      },
      responseType: 'json',
      body: {
        timerange: {
          field: '@timestamp',
          to: max,
          from: min,
          interval: '>=1m',
        },
        indexPattern: 'metricbeat-*',
        filterQuery:
          '{"bool":{"should":[{"range":{"system.cpu.user.pct":{"gt":0.01}}}],"minimum_should_match":1}}',
        metrics: [
          {
            aggregation: 'avg',
            field: 'system.cpu.user.pct',
          },
        ],
      },
    });

    expect(response).toHaveStatusCode(200);
    const body = decodeOrThrow(metricsExplorerResponseRT)(response.body);
    expect(body.series).toHaveLength(1);
    const firstSeries = body.series[0];
    expect(firstSeries).toMatchObject({ id: '*' });
    expect(firstSeries.columns).toStrictEqual([
      { name: 'timestamp', type: 'date' },
      { name: 'metric_0', type: 'number' },
    ]);
    expect(firstSeries.rows).toHaveLength(8);
  });

  apiTest('works for empty metrics', async ({ apiClient }) => {
    const response = await apiClient.post(METRICS_EXPLORER_PATH, {
      headers: {
        ...viewerApiCredentials.apiKeyHeader,
        ...testData.INTERNAL_HEADERS,
      },
      responseType: 'json',
      body: {
        timerange: {
          field: '@timestamp',
          to: max,
          from: min,
          interval: '>=1m',
        },
        indexPattern: 'metricbeat-*',
        metrics: [],
      },
    });

    expect(response).toHaveStatusCode(200);
    const body = decodeOrThrow(metricsExplorerResponseRT)(response.body);
    expect(body.series).toHaveLength(1);
    const firstSeries = body.series[0];
    expect(firstSeries).toMatchObject({ id: '*' });
    expect(firstSeries.columns).toStrictEqual([]);
    expect(firstSeries.rows).toHaveLength(0);
  });

  apiTest('works for custom metrics', async ({ apiClient }) => {
    const response = await apiClient.post(METRICS_EXPLORER_PATH, {
      headers: {
        ...viewerApiCredentials.apiKeyHeader,
        ...testData.INTERNAL_HEADERS,
      },
      responseType: 'json',
      body: {
        timerange: {
          field: '@timestamp',
          to: max,
          from: min,
          interval: '>=1m',
        },
        indexPattern: 'metricbeat-*',
        metrics: [
          {
            aggregation: 'custom',
            custom_metrics: [
              { name: 'A', aggregation: 'avg', field: 'system.cpu.user.pct' },
              { name: 'B', aggregation: 'avg', field: 'system.cpu.user.pct' },
            ],
            equation: '((A + A + B + B) / 2) * 100',
          },
        ],
      },
    });

    expect(response).toHaveStatusCode(200);
    const body = decodeOrThrow(metricsExplorerResponseRT)(response.body);
    expect(body.series).toHaveLength(1);
    const firstSeries = body.series[0];
    expect(firstSeries).toMatchObject({ id: '*' });
    expect(firstSeries.columns).toStrictEqual([
      { name: 'timestamp', type: 'date' },
      { name: 'metric_0', type: 'number' },
    ]);
    expect(firstSeries.rows).toHaveLength(8);
    expect(firstSeries.rows).toStrictEqual([
      { timestamp: 1547571300000, metric_0: 1.0666666666666667 },
      { timestamp: 1547571360000, metric_0: 0.4333333333333334 },
      { timestamp: 1547571420000, metric_0: 0.36666666666666664 },
      { timestamp: 1547571480000, metric_0: 0.30000000000000004 },
      { timestamp: 1547571540000, metric_0: 0.33333333333333337 },
      { timestamp: 1547571600000, metric_0: 0.26666666666666666 },
      { timestamp: 1547571660000, metric_0: 0.36666666666666664 },
      { timestamp: 1547571720000, metric_0: 0.36666666666666664 },
    ]);
  });

  apiTest('works with groupBy', async ({ apiClient }) => {
    const response = await apiClient.post(METRICS_EXPLORER_PATH, {
      headers: {
        ...viewerApiCredentials.apiKeyHeader,
        ...testData.INTERNAL_HEADERS,
      },
      responseType: 'json',
      body: {
        timerange: {
          field: '@timestamp',
          to: max,
          from: min,
          interval: '>=1m',
        },
        indexPattern: 'metricbeat-*',
        groupBy: 'event.dataset',
        limit: 3,
        afterKey: 'system.cpu',
        metrics: [
          {
            aggregation: 'count',
          },
        ],
      },
    });

    expect(response).toHaveStatusCode(200);
    const body = decodeOrThrow(metricsExplorerResponseRT)(response.body);
    expect(body.series).toHaveLength(3);
    const firstSeries = body.series[0];
    expect(firstSeries).toMatchObject({ id: 'system.diskio' });
    expect(firstSeries.columns).toStrictEqual([
      { name: 'timestamp', type: 'date' },
      { name: 'metric_0', type: 'number' },
      { name: 'groupBy', type: 'string' },
    ]);
    expect(firstSeries.rows).toHaveLength(8);
    expect(body.pageInfo).toStrictEqual({
      afterKey: { groupBy0: 'system.fsstat' },
      total: 12,
    });
  });

  apiTest('works with multiple groupBy', async ({ apiClient }) => {
    const response = await apiClient.post(METRICS_EXPLORER_PATH, {
      headers: {
        ...viewerApiCredentials.apiKeyHeader,
        ...testData.INTERNAL_HEADERS,
      },
      responseType: 'json',
      body: {
        timerange: {
          field: '@timestamp',
          to: max,
          from: min,
          interval: '>=1m',
        },
        indexPattern: 'metricbeat-*',
        groupBy: ['host.name', 'system.network.name'],
        limit: 3,
        afterKey: null,
        metrics: [
          {
            aggregation: 'rate',
            field: 'system.network.out.bytes',
          },
        ],
      },
    });

    expect(response).toHaveStatusCode(200);
    const body = decodeOrThrow(metricsExplorerResponseRT)(response.body);
    expect(body.series).toHaveLength(3);
    const firstSeries = body.series[0];
    expect(firstSeries).toMatchObject({ id: 'demo-stack-mysql-01 / eth0' });
    expect(firstSeries.columns).toStrictEqual([
      { name: 'timestamp', type: 'date' },
      { name: 'metric_0', type: 'number' },
      { name: 'groupBy', type: 'string' },
    ]);
    expect(firstSeries.rows).toHaveLength(8);
    expect(body.pageInfo).toStrictEqual({
      afterKey: { groupBy0: 'demo-stack-mysql-01', groupBy1: 'eth2' },
      total: 4,
    });
  });

  apiTest('returns 400 when requesting more than 20 metrics', async ({ apiClient }) => {
    const response = await apiClient.post(METRICS_EXPLORER_PATH, {
      headers: {
        ...viewerApiCredentials.apiKeyHeader,
        ...testData.INTERNAL_HEADERS,
      },
      responseType: 'json',
      body: {
        timerange: {
          field: '@timestamp',
          to: max,
          from: min,
          interval: '>=1m',
        },
        indexPattern: 'metricbeat-*',
        groupBy: ['host.name', 'system.network.name'],
        limit: 3,
        afterKey: null,
        metrics: Array(21).fill({
          aggregation: 'rate',
          field: 'system.network.out.bytes',
        }),
      },
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest('works when there is no data', async ({ apiClient }) => {
    const response = await apiClient.post(METRICS_EXPLORER_PATH, {
      headers: {
        ...viewerApiCredentials.apiKeyHeader,
        ...testData.INTERNAL_HEADERS,
      },
      responseType: 'json',
      body: {
        timerange: {
          field: '@timestamp',
          to: Date.now(),
          from: Date.now() - 15 * 60 * 1000,
          interval: '>=1m',
        },
        indexPattern: 'metricbeat-*',
        metrics: [
          {
            aggregation: 'avg',
            field: 'system.cpu.user.pct',
          },
        ],
      },
    });

    expect(response).toHaveStatusCode(200);
    const body = decodeOrThrow(metricsExplorerResponseRT)(response.body);
    expect(body.series).toHaveLength(0);
  });

  apiTest('works when there is no data with groupBy', async ({ apiClient }) => {
    const response = await apiClient.post(METRICS_EXPLORER_PATH, {
      headers: {
        ...viewerApiCredentials.apiKeyHeader,
        ...testData.INTERNAL_HEADERS,
      },
      responseType: 'json',
      body: {
        timerange: {
          field: '@timestamp',
          to: Date.now(),
          from: Date.now() - 15 * 60 * 1000,
          interval: '>=1m',
        },
        groupBy: 'host.name',
        indexPattern: 'metricbeat-*',
        metrics: [
          {
            aggregation: 'avg',
            field: 'system.cpu.user.pct',
          },
        ],
      },
    });

    expect(response).toHaveStatusCode(200);
    const body = decodeOrThrow(metricsExplorerResponseRT)(response.body);
    expect(body.series).toHaveLength(0);
    expect(body.pageInfo).toStrictEqual({
      afterKey: null,
      total: 0,
    });
  });
});
