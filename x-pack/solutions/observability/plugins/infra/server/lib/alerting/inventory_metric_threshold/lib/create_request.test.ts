/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { COMPARATORS } from '@kbn/alerting-comparators';
import type { DataSchemaFormat, InventoryItemType } from '@kbn/metrics-data-access-plugin/common';
import type { InventoryMetricConditions } from '../../../../../common/alerting/metrics';
import { createRequest } from './create_request';

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

const expectCompositeIdField = async (
  nodeType: InventoryItemType,
  expectedField: string,
  schema?: DataSchemaFormat
): Promise<void> => {
  const request = await createRequest(
    'metrics-*',
    nodeType,
    'cpu',
    timerange,
    10,
    undefined,
    condition,
    undefined,
    undefined,
    undefined,
    schema
  );

  expect(request.aggs).toEqual(
    expect.objectContaining({
      nodes: expect.objectContaining({
        composite: expect.objectContaining({
          sources: [{ node: { terms: { field: expectedField } } }],
        }),
      }),
    })
  );
};

describe('createRequest composite identity', () => {
  it('groups ECS pods by kubernetes.pod.uid when schema is omitted', async () => {
    await expectCompositeIdField('pod', 'kubernetes.pod.uid');
  });

  it('groups ECS pods by kubernetes.pod.uid', async () => {
    await expectCompositeIdField('pod', 'kubernetes.pod.uid', 'ecs');
  });

  it('groups SemConv pods by k8s.pod.uid', async () => {
    await expectCompositeIdField('pod', 'k8s.pod.uid', 'semconv');
  });

  it('keeps host.name for SemConv hosts', async () => {
    await expectCompositeIdField('host', 'host.name', 'semconv');
  });
});
