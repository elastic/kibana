/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isConditionComplete } from '@kbn/streamlang';
import { identifyMetricsEntities } from './identify_metrics_entities';
import {
  buildKubernetesEntityId,
  ENTITY_KEY_TABLE,
  foldNodeRows,
  foldWorkloadRows,
  getDatasetFamily,
  KUBERNETES_ENTITY_STORE_TYPES,
} from './entity_key_table';

const datasetColumns = [
  { name: 'docs', type: 'long' },
  { name: 'data_stream.dataset', type: 'keyword' },
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
  { name: 'replicas', type: 'long' },
  { name: 'last_seen', type: 'date' },
];

const sourceEsql =
  'FROM metrics-gcp-us-central1:metrics-kubernetes.*,-metrics-gcp-us-central1:metrics-kubernetes.apiserver-* | WHERE orchestrator.cluster.name == "cluster-a"';

type TestCell = string | number | null;

const datasetRows = (...datasets: Array<string | null>): TestCell[][] =>
  datasets.map((dataset, index) => [index + 1, dataset]);

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

describe('getDatasetFamily', () => {
  it('reads covered, uncovered, and null dataset families', () => {
    expect(getDatasetFamily('kubernetes.pod')).toBe('kubernetes');
    expect(getDatasetFamily('hostmetricsreceiver.otel')).toBe('hostmetricsreceiver');
    expect(getDatasetFamily(null)).toBeUndefined();
  });
});

describe('buildKubernetesEntityId', () => {
  it('uses the entity store type map for workload and node ids', () => {
    expect([
      buildKubernetesEntityId({ kind: 'deployment', namespace: 'payments', name: 'checkout' }),
      buildKubernetesEntityId({ kind: 'daemonset', namespace: 'payments', name: 'metricbeat' }),
      buildKubernetesEntityId({ kind: 'node', name: 'node-a' }),
    ]).toEqual([
      `${KUBERNETES_ENTITY_STORE_TYPES.deployment}:payments/checkout`,
      `${KUBERNETES_ENTITY_STORE_TYPES.daemonset}:payments/metricbeat`,
      `${KUBERNETES_ENTITY_STORE_TYPES.node}:node-a`,
    ]);
  });
});

describe('Kubernetes entity derivation', () => {
  it('builds derived owners, guards prefixes, and emits complete filters', () => {
    const lastSeen = '2026-11-10T12:00:00.000Z';
    const { features } = foldWorkloadRows([
      {
        'orchestrator.cluster.name': 'cluster-a',
        'kubernetes.namespace': 'apps',
        kind: 'deployment',
        workload: 'api',
        owner_derived: true,
        replicas: 2,
        last_seen: lastSeen,
      },
      {
        'orchestrator.cluster.name': 'cluster-a',
        'kubernetes.namespace': 'apps',
        kind: 'deployment',
        workload: 'kb',
        owner_derived: true,
        replicas: 1,
        last_seen: lastSeen,
      },
      {
        'orchestrator.cluster.name': 'cluster-a',
        'kubernetes.namespace': 'apps',
        kind: 'deployment',
        workload: 'kb-ui',
        owner_derived: true,
        replicas: 1,
        last_seen: lastSeen,
      },
      {
        'orchestrator.cluster.name': 'cluster-a',
        'kubernetes.namespace': 'ops',
        kind: 'cronjob',
        workload: 'nightly-backup',
        owner_derived: true,
        replicas: 1,
        last_seen: lastSeen,
      },
      {
        'orchestrator.cluster.name': 'cluster-a',
        'kubernetes.namespace': 'ops',
        kind: 'job',
        workload: 'migrate-2',
        owner_derived: false,
        replicas: 1,
        last_seen: lastSeen,
      },
    ]);
    const byId = new Map(features.map((feature) => [feature.id, feature]));

    expect(byId.get('k8s.deployment:apps/api')?.filter).toEqual({
      and: [
        { field: 'kubernetes.namespace', eq: 'apps' },
        {
          or: [
            { field: 'kubernetes.deployment.name', eq: 'api' },
            {
              and: [
                { not: { field: 'kubernetes.deployment.name', exists: true } },
                { field: 'kubernetes.replicaset.name', startsWith: 'api-' },
              ],
            },
          ],
        },
      ],
    });
    expect(byId.get('k8s.deployment:apps/kb')?.filter).toEqual({
      and: [
        { field: 'kubernetes.namespace', eq: 'apps' },
        { field: 'kubernetes.deployment.name', eq: 'kb' },
      ],
    });
    expect(byId.get('k8s.cronjob:ops/nightly-backup')?.filter).toEqual({
      and: [
        { field: 'kubernetes.namespace', eq: 'ops' },
        {
          or: [
            { field: 'kubernetes.cronjob.name', eq: 'nightly-backup' },
            {
              and: [
                { not: { field: 'kubernetes.cronjob.name', exists: true } },
                { field: 'kubernetes.job.name', startsWith: 'nightly-backup-' },
              ],
            },
          ],
        },
      ],
    });
    expect(byId.get('k8s.job:ops/migrate-2')?.filter).toEqual({
      and: [
        { field: 'kubernetes.namespace', eq: 'ops' },
        { field: 'kubernetes.job.name', eq: 'migrate-2' },
      ],
    });
    expect(byId.get('k8s.job:ops/migrate-2')?.properties).not.toHaveProperty('entity_store_type');
    expect(byId.get('k8s.deployment:apps/api')?.properties.entity_store_type).toBe(
      'k8s.deployment'
    );

    const workloadQuery =
      ENTITY_KEY_TABLE.find(({ id }) => id === 'ecs.k8s_workload')?.buildQuery(
        'SET unmapped_fields = "NULLIFY"; FROM metrics-*'
      ) ?? '';
    expect(workloadQuery).toMatch(/^SET unmapped_fields = "NULLIFY"; FROM/);
    expect(workloadQuery).toContain('@timestamp > NOW() - 1 hour');
    expect(workloadQuery).toContain('`kubernetes.labels.pod-template-hash`');
    expect(workloadQuery).toContain('SUBSTRING(rs, 1, LENGTH(rs) - LENGTH(h) - 1)');
    expect(workloadQuery).toContain('kubernetes.job.name RLIKE ".*-[0-9]{8,}"');
    expect(workloadQuery).toContain('REPLACE(kubernetes.job.name, "-[0-9]{8,}$", "")');
    expect(workloadQuery).toContain(
      'BY orchestrator.cluster.name, kubernetes.namespace, kind, workload, owner_derived'
    );

    const nodeFeatures = foldNodeRows([
      {
        'orchestrator.cluster.name': 'cluster-a',
        'kubernetes.node.name': 'node-a',
        replicas: 1,
        last_seen: lastSeen,
      },
    ]).features;
    expect([...features, ...nodeFeatures].every(({ filter }) => isConditionComplete(filter))).toBe(
      true
    );
  });

  it('drops an overlong workload identity while keeping other entities', () => {
    const longName = 'x'.repeat(300);
    const result = foldWorkloadRows([
      {
        'orchestrator.cluster.name': 'cluster-a',
        'kubernetes.namespace': 'apps',
        kind: 'deployment',
        workload: longName,
        replicas: 1,
        last_seen: '2026-11-10T12:00:00.000Z',
      },
      {
        'orchestrator.cluster.name': 'cluster-a',
        'kubernetes.namespace': 'apps',
        kind: 'deployment',
        workload: 'api',
        replicas: 1,
        last_seen: '2026-11-10T12:00:00.000Z',
      },
    ]);

    expect(result.features.map(({ id }) => id)).toEqual(['k8s.deployment:apps/api']);
    expect(result.droppedIncompleteRowsCount).toBe(1);
    expect(result.droppedRows).toEqual({
      ownerless: 0,
      nullNamespace: 0,
      nullNodeName: 0,
      idTooLong: 1,
    });
  });
});

describe('identifyMetricsEntities', () => {
  it('folds clusters while keeping equal deployment and daemonset names separate', async () => {
    const datasetList = {
      columns: datasetColumns,
      values: datasetRows('kubernetes.pod', 'kubernetes.node'),
    };
    const workloads = {
      columns: workloadColumns,
      values: [
        ['cluster-a', 'payments', 'deployment', 'checkout', 3, '2026-11-10T12:00:00.000Z'],
        ['cluster-b', 'payments', 'deployment', 'checkout', 2, '2026-11-10T12:05:00.000Z'],
        ['cluster-a', 'payments', 'daemonset', 'checkout', 4, '2026-11-10T12:03:00.000Z'],
        [null, 'payments', 'deployment', 'unknown-cluster', 1, '2026-11-10T12:04:00.000Z'],
        ['cluster-a', 'payments', null, null, 0, '2026-11-10T12:02:00.000Z'],
        ['cluster-a', null, 'deployment', 'missing-namespace', 1, '2026-11-10T12:00:00.000Z'],
      ],
    };
    const nodes = {
      columns: nodeColumns,
      values: [
        ['cluster-a', 'node-a', 1, '2026-11-10T12:00:00.000Z'],
        ['cluster-b', 'node-a', 1, '2026-11-10T12:06:00.000Z'],
        ['cluster-a', null, 1, '2026-11-10T12:01:00.000Z'],
      ],
    };
    const harness = createHarness([datasetList, workloads, nodes]);

    const result = await identifyMetricsEntities({
      esClient: harness.esClient,
      esql: sourceEsql,
      sourceId: 'gcp-k8s-csp-ecs',
      kiClient: harness.kiClient,
      logger: harness.logger,
    });

    expect(result).toEqual(
      expect.objectContaining({
        metricsEntitiesCount: 4,
        metricsCatalogueRowsCount: 2,
        matchedEntityKeyRowsCount: 2,
        uncoveredDatasetsCount: 0,
        metricsEntityRowsCount: 9,
        droppedIncompleteRowsCount: 3,
        droppedOverflowRowsCount: 0,
        droppedRows: { ownerless: 1, nullNamespace: 1, nullNodeName: 1, idTooLong: 0 },
        unknownClusterRows: 1,
        handled: true,
        errors: [],
      })
    );
    const queries = harness.query.mock.calls.map(([request]: [{ query: string }]) => request.query);
    expect(queries).toHaveLength(3);
    queries.forEach((query) => {
      expect(query).toMatch(/^SET unmapped_fields = "NULLIFY"; FROM/);
      expect(query).not.toContain('$.nightshift');
      expect(query).not.toContain('METRICS_INFO');
      expect(query).not.toMatch(/(?:^|;\s*|\|\s*)TS\s/);
    });
    expect(harness.bulk).toHaveBeenCalledTimes(1);
    const operations = harness.bulk.mock.calls[0][1];
    expect(operations).toHaveLength(4);
    expect(
      operations.map(({ index }: { index: { feature: { id: string } } }) => index.feature.id)
    ).toEqual([
      'k8s.node:node-a',
      'k8s.deployment:payments/checkout',
      'k8s.daemonset:payments/checkout',
      'k8s.deployment:payments/unknown-cluster',
    ]);
    expect(
      operations.find(
        ({ index }: { index: { feature: { id: string } } }) =>
          index.feature.id === 'k8s.deployment:payments/checkout'
      )?.index.feature
    ).toEqual({
      type: 'entity',
      subtype: 'k8s_workload',
      id: 'k8s.deployment:payments/checkout',
      title: 'checkout',
      description: 'Kubernetes deployment checkout in namespace payments.',
      filter: {
        and: [
          { field: 'kubernetes.namespace', eq: 'payments' },
          { field: 'kubernetes.deployment.name', eq: 'checkout' },
        ],
      },
      properties: {
        identity: {
          'kubernetes.namespace': 'payments',
          'kubernetes.deployment.name': 'checkout',
        },
        breakdown: ['orchestrator.cluster.name'],
        entity_store_type: 'k8s.deployment',
        clusters: {
          'cluster-a': { replicas: 3, last_seen: '2026-11-10T12:00:00.000Z' },
          'cluster-b': { replicas: 2, last_seen: '2026-11-10T12:05:00.000Z' },
        },
        replicas: 5,
        last_seen: '2026-11-10T12:05:00.000Z',
        origin: 'metrics',
        key_row: 'ecs.k8s_workload',
      },
      confidence: 100,
      expires_at: '2026-12-10T12:00:00.000Z',
    });
    expect(
      operations.find(
        ({ index }: { index: { feature: { id: string } } }) =>
          index.feature.id === 'k8s.deployment:payments/unknown-cluster'
      )?.index.feature.properties.clusters
    ).toEqual({
      _unknown_cluster: { replicas: 1, last_seen: '2026-11-10T12:04:00.000Z' },
    });
    expect(
      operations.some(({ index }: { index: { feature: { id: string } } }) =>
        index.feature.id.includes('missing-namespace')
      )
    ).toBe(false);
  });

  it('falls back without inventory queries or writes when the source returns no data', async () => {
    const harness = createHarness([{ columns: datasetColumns, values: [] }]);

    const result = await identifyMetricsEntities({
      esClient: harness.esClient,
      esql: sourceEsql,
      sourceId: 'empty-source',
      kiClient: harness.kiClient,
      logger: harness.logger,
    });

    expect(result).toEqual(
      expect.objectContaining({
        handled: false,
        skipReason: 'no_data',
        metricsEntitiesCount: 0,
        uncoveredDatasetsCount: 0,
      })
    );
    expect(harness.query).toHaveBeenCalledTimes(1);
    expect(harness.bulk).not.toHaveBeenCalled();
  });

  it('counts a null dataset as uncovered and falls back without writing', async () => {
    const harness = createHarness([
      {
        columns: datasetColumns,
        values: datasetRows(null),
      },
    ]);

    const result = await identifyMetricsEntities({
      esClient: harness.esClient,
      esql: sourceEsql,
      sourceId: 'plain-index',
      kiClient: harness.kiClient,
      logger: harness.logger,
    });

    expect(result).toEqual(
      expect.objectContaining({
        handled: false,
        skipReason: 'no_entity_key_row',
        metricsEntitiesCount: 0,
        uncoveredDatasetsCount: 1,
      })
    );
    expect(harness.query).toHaveBeenCalledTimes(1);
    expect(harness.bulk).not.toHaveBeenCalled();
    expect(harness.info).toHaveBeenCalledTimes(1);
    expect(harness.info).toHaveBeenCalledWith(expect.stringContaining('[plain-index]'));
    expect(harness.info).toHaveBeenCalledWith(expect.stringContaining('<null>'));
  });

  it('handles a Kubernetes pod dataset and counts an uncovered OTel dataset', async () => {
    const harness = createHarness([
      {
        columns: datasetColumns,
        values: datasetRows('kubernetes.pod', 'hostmetricsreceiver.otel'),
      },
      {
        columns: workloadColumns,
        values: [
          ['cluster-a', 'payments', 'deployment', 'checkout', 3, '2026-11-10T12:00:00.000Z'],
        ],
      },
    ]);

    const result = await identifyMetricsEntities({
      esClient: harness.esClient,
      esql: sourceEsql,
      sourceId: 'mixed-metrics',
      kiClient: harness.kiClient,
      logger: harness.logger,
    });

    expect(result).toEqual(
      expect.objectContaining({
        handled: true,
        matchedEntityKeyRowsCount: 1,
        uncoveredDatasetsCount: 1,
      })
    );
    expect(harness.bulk).toHaveBeenCalledTimes(1);
    expect(harness.info).toHaveBeenCalledTimes(1);
    expect(harness.info).toHaveBeenCalledWith(expect.stringContaining('[mixed-metrics]'));
    expect(harness.info).toHaveBeenCalledWith(expect.stringContaining('hostmetricsreceiver.otel'));
  });

  it('keeps nodes before the highest-replica workloads within the 500 entity cap', async () => {
    const datasetList = {
      columns: datasetColumns,
      values: datasetRows('kubernetes.pod', 'kubernetes.node'),
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
    const nodes = {
      columns: nodeColumns,
      values: [
        ['cluster-a', 'node-b', 1, '2026-11-10T12:00:00.000Z'],
        ['cluster-a', 'node-a', 1, '2026-11-10T12:00:00.000Z'],
      ],
    };
    const harness = createHarness([datasetList, workloads, nodes]);

    const result = await identifyMetricsEntities({
      esClient: harness.esClient,
      esql: sourceEsql,
      sourceId: 'overflow-source',
      kiClient: harness.kiClient,
      logger: harness.logger,
    });

    expect(result.metricsEntitiesCount).toBe(500);
    expect(result.droppedOverflowRowsCount).toBe(3);
    const operations = harness.bulk.mock.calls[0][1];
    expect(operations).toHaveLength(500);
    const ids = operations.map(
      ({ index }: { index: { feature: { id: string } } }) => index.feature.id
    );
    expect(ids.slice(0, 2)).toEqual(['k8s.node:node-a', 'k8s.node:node-b']);
    expect(ids).not.toEqual(
      expect.arrayContaining([
        'k8s.deployment:namespace-a/workload-498',
        'k8s.deployment:namespace-a/workload-499',
        'k8s.deployment:namespace-a/workload-500',
      ])
    );
    expect(harness.info).toHaveBeenCalledTimes(1);
    expect(harness.info).toHaveBeenCalledWith(expect.stringContaining('source [overflow-source]'));
    expect(harness.info).toHaveBeenCalledWith(expect.stringContaining('503 rows, dropped 3'));
  });
});
