/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { COMPARATORS } from '@kbn/alerting-comparators';
import type { DataSchemaFormat, InventoryItemType } from '@kbn/metrics-data-access-plugin/common';
import type { InventoryMetricConditions } from '../../../../../common/alerting/metrics';
import type { InfraSource } from '../../../sources';
import { doFieldsExist } from '../../common/utils';
import { createRequest } from './create_request';
import { getData } from './get_data';

jest.mock('./create_request', () => {
  const actual = jest.requireActual('./create_request');
  return {
    ...actual,
    createRequest: jest.fn(),
  };
});

jest.mock('../../common/utils', () => {
  const actual = jest.requireActual('../../common/utils');
  return {
    ...actual,
    doFieldsExist: jest.fn(),
  };
});

const mockedCreateRequest = createRequest as jest.MockedFunction<typeof createRequest>;
const mockedDoFieldsExist = doFieldsExist as jest.MockedFunction<typeof doFieldsExist>;

const condition: InventoryMetricConditions = {
  metric: 'cpu',
  timeSize: 1,
  timeUnit: 'm',
  threshold: [1],
  comparator: COMPARATORS.GREATER_THAN,
};

const timerange = {
  from: 1_605_705_000_000,
  to: 1_605_706_200_000,
  interval: '1m',
};

const source: InfraSource = {
  id: 'default',
  origin: 'internal',
  configuration: {
    name: 'Default',
    description: '',
    logIndices: {
      type: 'index_pattern',
      indexPatternId: 'some-test-id',
    },
    metricAlias: 'metrics-*',
    inventoryDefaultView: 'default',
    metricsExplorerDefaultView: 'default',
    anomalyThreshold: 70,
    logColumns: [],
  },
};

// Intentional `as Logger` type assertion as the test stub only implements the log methods getData calls;
const logger = { debug: jest.fn(), trace: jest.fn() } as unknown as Logger;

const callGetData = ({
  nodeType,
  schema,
  search,
}: {
  nodeType: InventoryItemType;
  schema?: DataSchemaFormat;
  search: ElasticsearchClient['search'];
}) =>
  getData({
    // Intentional `as ElasticsearchClient` type assertion as the test only stubs `search`;
    esClient: { search } as ElasticsearchClient,
    nodeType,
    metric: 'cpu',
    timerange,
    source,
    logQueryFields: undefined,
    compositeSize: 10,
    condition,
    logger,
    schema,
  });

describe('getData additionalContext schema', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedCreateRequest.mockResolvedValue({
      index: 'metrics-*',
      size: 0,
    });
    mockedDoFieldsExist.mockResolvedValue({});
  });

  it('reads ECS _source context for a pod rule stored as semconv', async () => {
    const search = jest.fn().mockResolvedValue({
      aggregations: {
        nodes: {
          buckets: [
            {
              key: { node: 'pod-uid-1' },
              doc_count: 1,
              shouldWarn: { value: 0 },
              shouldTrigger: { value: 1 },
              cpu: { value: 0.42 },
              additionalContext: {
                hits: {
                  hits: [
                    {
                      _source: {
                        host: { name: 'node-1' },
                        labels: { env: 'test' },
                        tags: ['inventory'],
                        orchestrator: { cluster: { name: 'cluster-a' } },
                      },
                    },
                  ],
                },
              },
            },
          ],
        },
      },
    });

    const response = await callGetData({
      nodeType: 'pod',
      schema: 'semconv',
      search,
    });

    expect(mockedCreateRequest).toHaveBeenCalledWith(
      'metrics-*',
      'pod',
      'cpu',
      timerange,
      10,
      undefined,
      condition,
      undefined,
      undefined,
      {},
      'ecs'
    );

    expect(response['pod-uid-1']).toEqual(
      expect.objectContaining({
        value: 0.42,
        trigger: true,
        warn: false,
        host: { name: 'node-1' },
        labels: { env: 'test' },
        tags: ['inventory'],
        orchestrator: { cluster: { name: 'cluster-a' } },
      })
    );
  });

  it('reads SemConv docvalue fields for a host rule stored as semconv', async () => {
    const search = jest.fn().mockResolvedValue({
      aggregations: {
        nodes: {
          buckets: [
            {
              key: { node: 'host-1' },
              doc_count: 1,
              shouldWarn: { value: 0 },
              shouldTrigger: { value: 0 },
              cpu: { value: 0.1 },
              additionalContext: {
                hits: {
                  hits: [
                    {
                      fields: {
                        'host.name': ['host-1'],
                        'host.hostname': ['host-1.local'],
                        tags: ['otel'],
                      },
                    },
                  ],
                },
              },
            },
          ],
        },
      },
    });

    const response = await callGetData({
      nodeType: 'host',
      schema: 'semconv',
      search,
    });

    expect(mockedCreateRequest).toHaveBeenCalledWith(
      'metrics-*',
      'host',
      'cpu',
      timerange,
      10,
      undefined,
      condition,
      undefined,
      undefined,
      null,
      'semconv'
    );

    expect(response['host-1']).toEqual(
      expect.objectContaining({
        value: 0.1,
        host: {
          name: 'host-1',
          hostname: 'host-1.local',
        },
        tags: ['otel'],
      })
    );
  });
});
