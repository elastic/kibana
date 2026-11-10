/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { identifyMetricsEntities } from './identify_metrics_entities';

const catalogueColumns = [
  { name: 'metric_name', type: 'keyword' },
  { name: 'data_stream', type: 'keyword' },
  { name: 'unit', type: 'keyword' },
  { name: 'metric_type', type: 'keyword' },
  { name: 'field_type', type: 'keyword' },
  { name: 'dimension_fields', type: 'keyword' },
];

const workloadColumns = [
  { name: 'orchestrator.cluster.name', type: 'keyword' },
  { name: 'kubernetes.namespace', type: 'keyword' },
  { name: 'kind', type: 'keyword' },
  { name: 'workload', type: 'keyword' },
  { name: 'replicas', type: 'long' },
  { name: 'last_seen', type: 'date' },
];

const nodeColumns = [
  { name: 'orchestrator.cluster.name', type: 'keyword' },
  { name: 'kubernetes.node.name', type: 'keyword' },
  { name: 'last_seen', type: 'date' },
];

const sourceEsql =
  'FROM metrics-gcp-us-central1:metrics-kubernetes.*,-metrics-gcp-us-central1:metrics-kubernetes.apiserver-* | WHERE orchestrator.cluster.name == "cluster-a"';

type TestCell = string | number | null | readonly string[];

const createHarness = (responses: Array<{ columns: object[]; values: TestCell[][] }>) => {
  const query = jest.fn();
  responses.forEach((response) => query.mockResolvedValueOnce(response));
  const bulk = jest.fn().mockResolvedValue({ applied: 1, skipped: 0 });
  const getDefaultExpiresAt = jest.fn().mockReturnValue('2026-12-10T12:00:00.000Z');
  const info = jest.fn();

  return {
    esClient: { esql: { query } } as never,
    query,
    kiClient: { bulk, getDefaultExpiresAt } as never,
    bulk,
    logger: { info } as never,
    info,
  };
};

describe('identifyMetricsEntities', () => {
  it('writes complete workload and node rows and drops an incomplete workload', async () => {
    const firstCataloguePage = {
      columns: catalogueColumns,
      values: Array.from({ length: 100 }, (_, index) => [
        `kubernetes.pod.metric.${String(index).padStart(3, '0')}`,
        ['metrics-kubernetes.pod-default'],
        'percent',
        'gauge',
        'double',
        ['orchestrator.cluster.name', 'kubernetes.namespace'],
      ]),
    };
    const secondCataloguePage = {
      columns: catalogueColumns,
      values: Array.from({ length: 16 }, (_, index) => [
        `kubernetes.node.metric.${String(index).padStart(3, '0')}`,
        ['metrics-kubernetes.node-default'],
        'percent',
        'gauge',
        'double',
        ['orchestrator.cluster.name', 'kubernetes.node.name'],
      ]),
    };
    const workloads = {
      columns: workloadColumns,
      values: [
        ['cluster-a', 'payments', 'deployment', 'checkout', 3, '2026-11-10T12:00:00.000Z'],
        ['cluster-a', null, 'deployment', 'missing-namespace', 1, '2026-11-10T12:00:00.000Z'],
      ],
    };
    const nodes = {
      columns: nodeColumns,
      values: [['cluster-a', 'node-a', '2026-11-10T12:00:00.000Z']],
    };
    const harness = createHarness([firstCataloguePage, secondCataloguePage, workloads, nodes]);

    const result = await identifyMetricsEntities({
      esClient: harness.esClient,
      esql: sourceEsql,
      sourceId: 'gcp-k8s-csp-ecs',
      kiClient: harness.kiClient,
      logger: harness.logger,
    });

    expect(result).toEqual(
      expect.objectContaining({
        metricsEntitiesCount: 2,
        metricsCatalogueRowsCount: 116,
        matchedEntityKeyRowsCount: 2,
        metricsEntityRowsCount: 3,
        droppedIncompleteRowsCount: 1,
        droppedOverflowRowsCount: 0,
        errors: [],
      })
    );
    expect(harness.bulk).toHaveBeenCalledTimes(1);
    const operations = harness.bulk.mock.calls[0][1];
    expect(operations).toHaveLength(2);
    expect(
      operations.map(({ index }: { index: { feature: { id: string } } }) => index.feature.id)
    ).toEqual(['cluster-a/payments/deployment/checkout', 'cluster-a/node-a']);
    expect(operations[0].index.feature).toEqual({
      type: 'entity',
      subtype: 'k8s_workload',
      id: 'cluster-a/payments/deployment/checkout',
      title: 'checkout',
      description: 'Kubernetes deployment checkout in namespace payments, cluster cluster-a.',
      filter: {
        and: [
          { field: 'orchestrator.cluster.name', eq: 'cluster-a' },
          { field: 'kubernetes.namespace', eq: 'payments' },
          { field: 'kubernetes.deployment.name', eq: 'checkout' },
        ],
      },
      properties: {
        identity: {
          'orchestrator.cluster.name': 'cluster-a',
          'kubernetes.namespace': 'payments',
          'kubernetes.deployment.name': 'checkout',
        },
        replicas: 3,
        last_seen: '2026-11-10T12:00:00.000Z',
        origin: 'metrics',
        key_row: 'ecs.k8s_workload',
      },
      confidence: 100,
      expires_at: '2026-12-10T12:00:00.000Z',
    });
    expect(
      operations.some(({ index }: { index: { feature: { id: string } } }) =>
        index.feature.id.includes('missing-namespace')
      )
    ).toBe(false);
  });

  it('returns without inventory queries or writes when the catalogue is empty', async () => {
    const harness = createHarness([{ columns: catalogueColumns, values: [] }]);

    const result = await identifyMetricsEntities({
      esClient: harness.esClient,
      esql: sourceEsql,
      sourceId: 'empty-source',
      kiClient: harness.kiClient,
      logger: harness.logger,
    });

    expect(result.metricsEntitiesCount).toBe(0);
    expect(harness.query).toHaveBeenCalledTimes(1);
    expect(harness.bulk).not.toHaveBeenCalled();
  });

  it('keeps the 500 workload rows with the most replicas and logs overflow', async () => {
    const catalogue = {
      columns: catalogueColumns,
      values: [
        [
          'kubernetes.pod.cpu.usage.limit.pct',
          ['metrics-kubernetes.pod-default'],
          'percent',
          'gauge',
          'double',
          ['orchestrator.cluster.name', 'kubernetes.namespace'],
        ],
      ],
    };
    const workloads = {
      columns: workloadColumns,
      values: Array.from({ length: 501 }, (_, index) => [
        'cluster-a',
        'namespace-a',
        'deployment',
        `workload-${index}`,
        501 - index,
        '2026-11-10T12:00:00.000Z',
      ]),
    };
    const harness = createHarness([catalogue, workloads]);

    const result = await identifyMetricsEntities({
      esClient: harness.esClient,
      esql: sourceEsql,
      sourceId: 'overflow-source',
      kiClient: harness.kiClient,
      logger: harness.logger,
    });

    expect(result.metricsEntitiesCount).toBe(500);
    expect(result.droppedOverflowRowsCount).toBe(1);
    expect(harness.bulk.mock.calls[0][1]).toHaveLength(500);
    expect(harness.info).toHaveBeenCalledTimes(1);
    expect(harness.info).toHaveBeenCalledWith(expect.stringContaining('source [overflow-source]'));
    expect(harness.info).toHaveBeenCalledWith(expect.stringContaining('501 rows, dropped 1'));
  });
});
