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

  it('evaluates a pod rule stored as semconv on kubernetes.pod.uid', async () => {
    // Leftover semconv on a pod rule evaluates as ecs until the flyout owns Schema.
    const request = await createRequest(
      'metrics-*',
      'pod',
      'cpu',
      timerange,
      10,
      undefined,
      condition,
      undefined,
      undefined,
      undefined,
      'semconv'
    );
    const body = JSON.stringify(request);

    expect(body).toContain('"field":"kubernetes.pod.uid"');
    expect(body).not.toContain('k8s.pod.uid');
    expect(body).toContain('"event.module":"kubernetes"');
    expect(body).not.toContain('kubeletstatsreceiver.otel');
    expect(body).toContain('"docvalue_fields":[]');
  });

  it('keeps host.name for SemConv hosts', async () => {
    const request = await createRequest(
      'metrics-*',
      'host',
      'cpu',
      timerange,
      10,
      undefined,
      condition,
      undefined,
      undefined,
      undefined,
      'semconv'
    );

    expect(JSON.stringify(request)).toContain('hostmetricsreceiver.otel');
    await expectCompositeIdField('host', 'host.name', 'semconv');
  });

  it('leaves an omitted host schema unfiltered', async () => {
    const request = await createRequest(
      'metrics-*',
      'host',
      'cpu',
      timerange,
      10,
      undefined,
      condition
    );
    const query = JSON.stringify(request.query);

    expect(query).not.toContain('event.module');
    expect(query).not.toContain('data_stream.dataset');
  });
});
