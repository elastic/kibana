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
  getDataStreamFamily,
  KUBERNETES_ENTITY_STORE_TYPES,
} from './entity_key_table';

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
  { name: 'replicas', type: 'long' },
  { name: 'last_seen', type: 'date' },
];

const sourceEsql =
  'FROM metrics-gcp-us-central1:metrics-kubernetes.*,-metrics-gcp-us-central1:metrics-kubernetes.apiserver-* | WHERE orchestrator.cluster.name == "cluster-a"';

type TestCell = string | number | null | readonly string[];

const kubernetesDataStreams = [
  'metrics-gcp-us-central1:metrics-kubernetes.pod-default',
  'metrics-gcp-us-central1:metrics-kubernetes.node-default',
  'metrics-gcp-us-central1:metrics-kubernetes.container-default',
  'metrics-gcp-us-central1:metrics-kubernetes.state_container-default',
  'metrics-gcp-us-central1:metrics-kubernetes.state_deployment-default',
  'metrics-gcp-us-central1:metrics-kubernetes.state_daemonset-default',
  'metrics-gcp-us-central1:metrics-kubernetes.state_statefulset-default',
  'metrics-gcp-us-central1:metrics-kubernetes.state_replicaset-default',
  'metrics-gcp-us-central1:metrics-kubernetes.state_job-default',
  'metrics-gcp-us-central1:metrics-kubernetes.state_node-default',
  'metrics-gcp-us-central1:metrics-kubernetes.state_namespace-default',
  'metrics-gcp-us-central1:metrics-kubernetes.state_resourcequota-default',
  'metrics-gcp-us-central1:metrics-kubernetes.system-default',
  'metrics-gcp-us-central1:metrics-kubernetes.volume-default',
] as const;

const catalogueRow = (index: number, dataStream: string): TestCell[] => [
  `kubernetes.metric.${String(index).padStart(3, '0')}`,
  [dataStream],
  'percent',
  'gauge',
  'double',
  ['orchestrator.cluster.name'],
];

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

describe('getDataStreamFamily', () => {
  it('reads the family from CCS, local, and OTel data stream names', () => {
    expect(getDataStreamFamily('metrics-gcp-us-central1:metrics-kubernetes.pod-default')).toBe(
      'kubernetes'
    );
    expect(getDataStreamFamily('metrics-kubernetes.node-default')).toBe('kubernetes');
    expect(getDataStreamFamily('metrics-us-east-1:metrics-hostmetricsreceiver.otel-default')).toBe(
      'hostmetricsreceiver'
    );
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

    const workloadQuery =
      ENTITY_KEY_TABLE.find(({ id }) => id === 'ecs.k8s_workload')?.buildQuery('TS metrics') ?? '';
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
    const firstCataloguePage = {
      columns: catalogueColumns,
      values: Array.from({ length: 100 }, (_, index) =>
        catalogueRow(index, kubernetesDataStreams[index % kubernetesDataStreams.length])
      ),
    };
    const secondCataloguePage = {
      columns: catalogueColumns,
      values: Array.from({ length: 16 }, (_, index) =>
        catalogueRow(
          index + 100,
          kubernetesDataStreams[(index + 100) % kubernetesDataStreams.length]
        )
      ),
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
        metricsEntitiesCount: 4,
        metricsCatalogueRowsCount: 116,
        matchedEntityKeyRowsCount: 2,
        uncoveredDataStreamsCount: 0,
        metricsEntityRowsCount: 9,
        droppedIncompleteRowsCount: 3,
        droppedOverflowRowsCount: 0,
        droppedRows: { ownerless: 1, nullNamespace: 1, nullNodeName: 1, idTooLong: 0 },
        unknownClusterRows: 1,
        handled: true,
        errors: [],
      })
    );
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

  it('returns without inventory queries or writes when the catalogue is empty', async () => {
    const harness = createHarness([{ columns: catalogueColumns, values: [] }]);

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
        skipReason: 'no_tsds',
        metricsEntitiesCount: 0,
        uncoveredDataStreamsCount: 0,
      })
    );
    expect(harness.query).toHaveBeenCalledTimes(1);
    expect(harness.bulk).not.toHaveBeenCalled();
  });

  it('falls back without writing when no entity key row matches the catalogue', async () => {
    const harness = createHarness([
      {
        columns: catalogueColumns,
        values: [
          [
            'system.cpu.time',
            ['metrics-us-east-1:metrics-hostmetricsreceiver.otel-default'],
            'seconds',
            'counter',
            'double',
            ['host.name'],
          ],
        ],
      },
    ]);

    const result = await identifyMetricsEntities({
      esClient: harness.esClient,
      esql: sourceEsql,
      sourceId: 'otel-hostmetrics',
      kiClient: harness.kiClient,
      logger: harness.logger,
    });

    expect(result).toEqual(
      expect.objectContaining({
        handled: false,
        skipReason: 'no_entity_key_row',
        metricsEntitiesCount: 0,
        uncoveredDataStreamsCount: 1,
      })
    );
    expect(harness.query).toHaveBeenCalledTimes(1);
    expect(harness.bulk).not.toHaveBeenCalled();
    expect(harness.info).toHaveBeenCalledTimes(1);
    expect(harness.info).toHaveBeenCalledWith(expect.stringContaining('[otel-hostmetrics]'));
    expect(harness.info).toHaveBeenCalledWith(
      expect.stringContaining('metrics-us-east-1:metrics-hostmetricsreceiver.otel-default')
    );
  });

  it('handles a matching catalogue and counts uncovered data streams', async () => {
    const harness = createHarness([
      {
        columns: catalogueColumns,
        values: [
          [
            'kubernetes.pod.cpu.usage.limit.pct',
            [
              'metrics-kubernetes.pod-default',
              'metrics-us-east-1:metrics-hostmetricsreceiver.otel-default',
            ],
            'percent',
            'gauge',
            'double',
            ['orchestrator.cluster.name', 'kubernetes.namespace'],
          ],
        ],
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
        uncoveredDataStreamsCount: 1,
      })
    );
    expect(harness.bulk).toHaveBeenCalledTimes(1);
    expect(harness.info).toHaveBeenCalledTimes(1);
    expect(harness.info).toHaveBeenCalledWith(expect.stringContaining('[mixed-metrics]'));
    expect(harness.info).toHaveBeenCalledWith(
      expect.stringContaining('metrics-us-east-1:metrics-hostmetricsreceiver.otel-default')
    );
  });

  it('keeps nodes before the highest-replica workloads within the 500 entity cap', async () => {
    const catalogue = {
      columns: catalogueColumns,
      values: [
        [
          'kubernetes.pod.cpu.usage.limit.pct',
          ['metrics-kubernetes.pod-default', 'metrics-kubernetes.node-default'],
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
    const nodes = {
      columns: nodeColumns,
      values: [
        ['cluster-a', 'node-b', 1, '2026-11-10T12:00:00.000Z'],
        ['cluster-a', 'node-a', 1, '2026-11-10T12:00:00.000Z'],
      ],
    };
    const harness = createHarness([catalogue, workloads, nodes]);

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
