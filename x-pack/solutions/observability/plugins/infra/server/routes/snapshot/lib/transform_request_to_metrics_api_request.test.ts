/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformRequestToMetricsAPIRequest } from './transform_request_to_metrics_api_request';
import type { InfraSource } from '../../../lib/sources';
import type { SnapshotRequest } from '../../../../common/http_api';
import type { MetricsAPIRequest } from '@kbn/metrics-data-access-plugin/common';
import type { ESSearchClient } from '@kbn/metrics-data-access-plugin/server';

jest.mock('./create_timerange_with_interval', () => {
  return {
    createTimeRangeWithInterval: () => ({
      interval: '60s',
      from: 1605705900000,
      to: 1605706200000,
    }),
  };
});

const source: InfraSource = {
  id: 'default',
  version: 'WzkzNjk5LDVd',
  updatedAt: 1617384456384,
  origin: 'stored',
  configuration: {
    name: 'Default',
    description: '',
    metricAlias: 'metrics-*,metricbeat-*',
    logIndices: {
      type: 'index_pattern',
      indexPatternId: 'kibana_index_pattern',
    },
    inventoryDefaultView: '0',
    metricsExplorerDefaultView: '0',
    logColumns: [
      { timestampColumn: { id: '5e7f964a-be8a-40d8-88d2-fbcfbdca0e2f' } },
      { fieldColumn: { id: ' eb9777a8-fcd3-420e-ba7d-172fff6da7a2', field: 'event.dataset' } },
      { messageColumn: { id: 'b645d6da-824b-4723-9a2a-e8cece1645c0' } },
      { fieldColumn: { id: '906175e0-a293-42b2-929f-87a203e6fbec', field: 'agent.name' } },
    ],
    anomalyThreshold: 50,
  },
};

const snapshotRequest: SnapshotRequest = {
  metrics: [{ type: 'cpu' }],
  groupBy: [],
  nodeType: 'pod',
  timerange: { interval: '1m', to: 1605706200000, from: 1605705000000, lookbackSize: 5 },
  kuery: '',
  sourceId: 'default',
  accountId: '',
  region: '',
  includeTimeseries: true,
};

const metricsApiRequest: MetricsAPIRequest = {
  indexPattern: 'metrics-*,metricbeat-*',
  timerange: { from: 1605705900000, to: 1605706200000, interval: '60s' },
  metrics: [
    {
      id: 'cpu',
      aggregations: {
        cpu_with_limit: { avg: { field: 'kubernetes.pod.cpu.usage.limit.pct' } },
        cpu_without_limit: { avg: { field: 'kubernetes.pod.cpu.usage.node.pct' } },
        cpu: {
          bucket_script: {
            buckets_path: { with_limit: 'cpu_with_limit', without_limit: 'cpu_without_limit' },
            script: {
              source: 'params.with_limit > 0.0 ? params.with_limit : params.without_limit',
              lang: 'painless',
            },
            gap_policy: 'insert_zeros',
          },
        },
      },
    },
    {
      id: '__metadata__',
      aggregations: {
        __metadata__: {
          top_metrics: {
            metrics: [{ field: 'kubernetes.pod.name' }, { field: 'kubernetes.pod.ip' }],
            size: 1,
            sort: { '@timestamp': 'desc' },
          },
        },
      },
    },
  ],
  filters: {
    bool: {
      filter: [
        {
          term: {
            'event.module': 'kubernetes',
          },
        },
      ],
    },
  },
  limit: 3000,
  alignDataToEnd: true,
  dropPartialBuckets: true,
  groupBy: ['kubernetes.pod.uid'],
  includeTimeseries: true,
};

describe('transformRequestToMetricsAPIRequest', () => {
  test('returns a MetricsApiRequest for pods with kubernetes module filter', async () => {
    const compositeSize = 3000;
    const result = await transformRequestToMetricsAPIRequest({
      client: {} as ESSearchClient,
      source,
      snapshotRequest,
      compositeSize,
    });
    expect(result).toEqual(metricsApiRequest);
  });

  test('returns a MetricsApiRequest for host with ECS schema filter', async () => {
    const compositeSize = 3000;
    const hostRequest: SnapshotRequest = {
      ...snapshotRequest,
      nodeType: 'host',
      schema: 'ecs',
    };

    const result = await transformRequestToMetricsAPIRequest({
      client: {} as ESSearchClient,
      source,
      snapshotRequest: hostRequest,
      compositeSize,
    });

    expect(result.filters).toEqual({
      bool: {
        filter: [
          {
            bool: {
              should: [
                { term: { 'event.module': 'system' } },
                { term: { 'metricset.module': 'system' } },
              ],
              minimum_should_match: 1,
            },
          },
        ],
      },
    });
    expect(result.groupBy).toContain('host.name');
  });

  test('returns a MetricsApiRequest for host with semconv schema filter', async () => {
    const compositeSize = 3000;
    const hostRequest: SnapshotRequest = {
      ...snapshotRequest,
      nodeType: 'host',
      schema: 'semconv',
    };

    const result = await transformRequestToMetricsAPIRequest({
      client: {} as ESSearchClient,
      source,
      snapshotRequest: hostRequest,
      compositeSize,
    });

    expect(result.filters).toEqual({
      bool: {
        filter: [
          {
            bool: {
              filter: [{ term: { 'data_stream.dataset': 'hostmetricsreceiver.otel' } }],
            },
          },
        ],
      },
    });
    expect(result.groupBy).toContain('host.name');
  });

  test('returns a MetricsApiRequest for containers with multiple module filters', async () => {
    const compositeSize = 3000;
    const containerRequest: SnapshotRequest = {
      ...snapshotRequest,
      nodeType: 'container',
    };

    const result = await transformRequestToMetricsAPIRequest({
      client: {} as ESSearchClient,
      source,
      snapshotRequest: containerRequest,
      compositeSize,
    });

    expect(result.filters).toEqual({
      bool: {
        filter: [
          {
            bool: {
              should: [
                { term: { 'event.module': 'docker' } },
                { term: { 'event.module': 'kubernetes' } },
                { term: { 'event.module': 'system' } },
              ],
              minimum_should_match: 1,
            },
          },
        ],
      },
    });
    expect(result.groupBy).toContain('container.id');
  });

  test('returns a MetricsApiRequest for AWS EC2 with aws module filter', async () => {
    const compositeSize = 3000;
    const ec2Request: SnapshotRequest = {
      ...snapshotRequest,
      nodeType: 'awsEC2',
    };

    const result = await transformRequestToMetricsAPIRequest({
      client: {} as ESSearchClient,
      source,
      snapshotRequest: ec2Request,
      compositeSize,
    });

    expect(result.filters).toEqual({
      bool: {
        filter: [{ term: { 'event.module': 'aws' } }],
      },
    });
    expect(result.groupBy).toContain('cloud.instance.id');
  });

  test('returns a MetricsApiRequest for AWS S3 with aws module filter', async () => {
    const compositeSize = 3000;
    const s3Request: SnapshotRequest = {
      ...snapshotRequest,
      nodeType: 'awsS3',
    };

    const result = await transformRequestToMetricsAPIRequest({
      client: {} as ESSearchClient,
      source,
      snapshotRequest: s3Request,
      compositeSize,
    });

    expect(result.filters).toEqual({
      bool: {
        filter: [{ term: { 'event.module': 'aws' } }],
      },
    });
    expect(result.groupBy).toContain('aws.s3.bucket.name');
  });

  test('returns a MetricsApiRequest for AWS RDS with aws module filter', async () => {
    const compositeSize = 3000;
    const rdsRequest: SnapshotRequest = {
      ...snapshotRequest,
      nodeType: 'awsRDS',
    };

    const result = await transformRequestToMetricsAPIRequest({
      client: {} as ESSearchClient,
      source,
      snapshotRequest: rdsRequest,
      compositeSize,
    });

    expect(result.filters).toEqual({
      bool: {
        filter: [{ term: { 'event.module': 'aws' } }],
      },
    });
    expect(result.groupBy).toContain('aws.rds.db_instance.arn');
  });

  test('returns a MetricsApiRequest for AWS SQS with aws module filter', async () => {
    const compositeSize = 3000;
    const sqsRequest: SnapshotRequest = {
      ...snapshotRequest,
      nodeType: 'awsSQS',
    };

    const result = await transformRequestToMetricsAPIRequest({
      client: {} as ESSearchClient,
      source,
      snapshotRequest: sqsRequest,
      compositeSize,
    });

    expect(result.filters).toEqual({
      bool: {
        filter: [{ term: { 'event.module': 'aws' } }],
      },
    });
    expect(result.groupBy).toContain('aws.sqs.queue.name');
  });

  test('applies additional filters like accountId and region', async () => {
    const compositeSize = 3000;
    const ec2RequestWithFilters: SnapshotRequest = {
      ...snapshotRequest,
      nodeType: 'awsEC2',
      accountId: 'test-account-123',
      region: 'us-east-1',
    };

    const result = await transformRequestToMetricsAPIRequest({
      client: {} as ESSearchClient,
      source,
      snapshotRequest: ec2RequestWithFilters,
      compositeSize,
    });

    expect(result.filters).toEqual({
      bool: {
        filter: [
          { term: { 'cloud.account.id': 'test-account-123' } },
          { term: { 'cloud.region': 'us-east-1' } },
          { term: { 'event.module': 'aws' } },
        ],
      },
    });
  });
});
