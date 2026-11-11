/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_TEXT_LENGTH } from '@kbn/significant-events-schema';
import { isConditionComplete } from '@kbn/streamlang';
import { identifyMetricsEntities } from './identify_metrics_entities';
import {
  buildKubernetesEntityId,
  buildInfrastructureConceptDescription,
  ENTITY_KEY_TABLE,
  foldClusterRows,
  foldNamespaceRows,
  foldNodeRows,
  foldOtelHostRows,
  foldSystemHostRows,
  foldWorkloadRows,
  getDatasetFamily,
  KUBERNETES_ENTITY_STORE_TYPES,
  mergeHostFeatures,
} from './entity_key_table';

const datasetColumns = [
  { name: 'docs', type: 'long' },
  { name: 'data_stream.dataset', type: 'keyword' },
];

const workloadColumns = [
  { name: 'kubernetes.namespace', type: 'keyword' },
  { name: 'kind', type: 'keyword' },
  { name: 'workload', type: 'keyword' },
  { name: 'replicas', type: 'long' },
  { name: 'last_seen', type: 'date' },
  { name: 'clusters', type: 'keyword' },
  { name: 'owner_derived', type: 'long' },
];

const multiNamespaceWorkloadColumns = [
  { name: 'kind', type: 'keyword' },
  { name: 'workload', type: 'keyword' },
  { name: 'namespaces', type: 'long' },
  { name: 'replicas', type: 'long' },
  { name: 'last_seen', type: 'date' },
  { name: 'clusters', type: 'keyword' },
  { name: 'owner_derived', type: 'long' },
];

const nodeColumns = [
  { name: 'orchestrator.cluster.name', type: 'keyword' },
  { name: 'kubernetes.node.name', type: 'keyword' },
  { name: 'activity', type: 'long' },
  { name: 'last_seen', type: 'date' },
  { name: 'os', type: 'keyword' },
  { name: 'cloud_provider', type: 'keyword' },
  { name: 'scale', type: 'long' },
];

const namespaceColumns = [
  { name: 'orchestrator.cluster.name', type: 'keyword' },
  { name: 'kubernetes.namespace', type: 'keyword' },
  { name: 'replicas', type: 'long' },
  { name: 'local_pods', type: 'long' },
  { name: 'last_seen', type: 'date' },
  { name: 'clusters', type: 'keyword' },
  { name: 'scale', type: 'long' },
  { name: 'tenant_namespaces', type: 'long' },
];

const clusterColumns = [
  { name: 'orchestrator.cluster.name', type: 'keyword' },
  { name: 'nodes', type: 'long' },
  { name: 'replicas', type: 'long' },
  { name: 'last_seen', type: 'date' },
];

const otelHostColumns = [
  { name: 'host.name', type: 'keyword' },
  { name: 'k8s.node.name', type: 'keyword' },
  { name: 'last_seen', type: 'date' },
  { name: 'os', type: 'keyword' },
  { name: 'cloud_provider', type: 'keyword' },
  { name: 'cloud_instance', type: 'keyword' },
  { name: 'clusters', type: 'keyword' },
];

const serviceColumns = [
  { name: 'service.name', type: 'keyword' },
  { name: 'environments', type: 'keyword' },
  { name: 'last_seen', type: 'date' },
  { name: 'docs', type: 'long' },
];

const sourceEsql =
  'FROM metrics-gcp-us-central1:metrics-kubernetes.*,-metrics-gcp-us-central1:metrics-kubernetes.apiserver-* | WHERE orchestrator.cluster.name == "cluster-a"';

type TestScalar = string | number | boolean | null;
type TestCell = TestScalar | readonly TestScalar[];

const datasetRows = (...datasets: Array<string | null>): TestCell[][] =>
  datasets.map((dataset, index) => [index + 1, dataset]);

const createHarness = (
  responses: Array<{ columns: object[]; values: TestCell[][] }>,
  excludedIds: string[] = []
) => {
  const query = jest.fn();
  responses.forEach((response) => query.mockResolvedValueOnce(response));
  const bulk = jest.fn().mockResolvedValue({ applied: 1, skipped: 0 });
  const getDefaultExpiresAt = jest.fn().mockReturnValue('2026-12-10T12:00:00.000Z');
  const getExcludedFeatures = jest
    .fn()
    .mockResolvedValue({ hits: excludedIds.map((id) => ({ id })) });
  const info = jest.fn();

  return {
    esClient: { esql: { query } } as never,
    query,
    kiClient: { bulk, getDefaultExpiresAt, getExcludedFeatures } as never,
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

describe('buildInfrastructureConceptDescription', () => {
  it('formats scale and truncates members within the schema limit', () => {
    const exact = buildInfrastructureConceptDescription({
      concept: 'nodes',
      cluster: 'cluster-a',
      scale: 3,
      breakdownField: 'kubernetes.node.name',
      members: ['node-a', 'node-b', 'node-c'],
    });
    const rounded = buildInfrastructureConceptDescription({
      concept: 'nodes',
      cluster: 'cluster-a',
      scale: 188,
      breakdownField: 'kubernetes.node.name',
      members: ['node-a'],
    });
    const truncated = buildInfrastructureConceptDescription({
      concept: 'namespaces',
      cluster: 'cluster-a',
      scale: 1000,
      breakdownField: 'kubernetes.namespace',
      members: Array.from({ length: 50 }, (_, index) => `${index}-${'x'.repeat(500)}`),
      tenantNamespaces: 712,
    });

    expect(exact).toContain('3 nodes');
    expect(exact).not.toContain('about 3 nodes');
    expect(rounded).toContain('about 190 nodes');
    expect(truncated).toContain('and about');
    expect(truncated.length).toBeLessThanOrEqual(MAX_TEXT_LENGTH);
  });
});

describe('buildKubernetesEntityId', () => {
  it('uses the entity store type map for workload and cluster ids', () => {
    expect([
      buildKubernetesEntityId({ kind: 'deployment', namespace: 'payments', name: 'checkout' }),
      buildKubernetesEntityId({ kind: 'daemonset', namespace: 'payments', name: 'metricbeat' }),
      buildKubernetesEntityId({ kind: 'cluster', name: 'cluster-a' }),
    ]).toEqual([
      `${KUBERNETES_ENTITY_STORE_TYPES.deployment}:payments/checkout`,
      `${KUBERNETES_ENTITY_STORE_TYPES.daemonset}:payments/metricbeat`,
      `${KUBERNETES_ENTITY_STORE_TYPES.cluster}:cluster-a`,
    ]);
  });
});

describe('Kubernetes entity derivation', () => {
  it('builds derived owners, guards prefixes, and emits complete filters', () => {
    const lastSeen = '2026-11-10T12:00:00.000Z';
    const { features } = foldWorkloadRows([
      {
        'kubernetes.namespace': 'apps',
        kind: 'deployment',
        workload: 'api',
        owner_derived: 1,
        clusters: ['cluster-a'],
        replicas: 2,
        last_seen: lastSeen,
      },
      {
        'kubernetes.namespace': 'apps',
        kind: 'deployment',
        workload: 'kb',
        owner_derived: 1,
        clusters: ['cluster-a'],
        replicas: 1,
        last_seen: lastSeen,
      },
      {
        'kubernetes.namespace': 'apps',
        kind: 'deployment',
        workload: 'kb-ui',
        owner_derived: 1,
        clusters: ['cluster-a'],
        replicas: 1,
        last_seen: lastSeen,
      },
      {
        'kubernetes.namespace': 'ops',
        kind: 'cronjob',
        workload: 'nightly-backup',
        owner_derived: 1,
        clusters: ['cluster-a'],
        replicas: 1,
        last_seen: lastSeen,
      },
      {
        'kubernetes.namespace': 'ops',
        kind: 'job',
        workload: 'migrate-2',
        owner_derived: 0,
        clusters: ['cluster-a'],
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
    expect(workloadQuery).toContain('clusters = VALUES(orchestrator.cluster.name)');
    expect(workloadQuery).toContain('| SORT replicas DESC, kubernetes.namespace, workload');
    expect(workloadQuery).toMatch(/\| LIMIT 501$/);
    const kubernetesQueries = new Map(
      ENTITY_KEY_TABLE.filter(({ id }) => id.startsWith('ecs.k8s_')).map(({ id, buildQuery }) => [
        id,
        buildQuery('SET unmapped_fields = "NULLIFY"; FROM metrics-*'),
      ])
    );
    expect([...kubernetesQueries.values()]).toHaveLength(5);
    kubernetesQueries.forEach((query) => {
      expect(query).toContain('data_stream.dataset IN (');
      expect(query).toContain('"kubeletstatsreceiver.otel"');
    });
    expect(kubernetesQueries.get('ecs.k8s_workload')).toContain(
      'data_stream.dataset IN ("kubernetes.pod", "kubeletstatsreceiver.otel")'
    );
    expect(kubernetesQueries.get('ecs.k8s_workload')).toContain('kubernetes.pod.uid IS NOT NULL');
    expect(kubernetesQueries.get('ecs.k8s_nodes')).toContain(
      'data_stream.dataset IN ("kubernetes.node", "kubeletstatsreceiver.otel")'
    );
    expect(kubernetesQueries.get('ecs.k8s_nodes')).toContain('kubernetes.node.name IS NOT NULL');
    expect(kubernetesQueries.get('ecs.k8s_namespaces')).toContain(
      'data_stream.dataset IN ("kubernetes.pod", "kubeletstatsreceiver.otel")'
    );
    expect(kubernetesQueries.get('ecs.k8s_namespaces')).toContain('kubernetes.pod.uid IS NOT NULL');
    expect(kubernetesQueries.get('ecs.k8s_cluster')).toContain(
      'data_stream.dataset IN ("kubernetes.pod", "kubernetes.node", "kubeletstatsreceiver.otel")'
    );
    expect(kubernetesQueries.get('ecs.k8s_multi_namespace_workload')).toContain(
      '| WHERE namespaces >= 10'
    );
    const filteredWorkloadQuery =
      ENTITY_KEY_TABLE.find(({ id }) => id === 'ecs.k8s_workload')?.buildQuery(
        'SET unmapped_fields = "NULLIFY"; FROM metrics-*',
        {
          multiNamespaceWorkloadKeys: ['deployment/kb-ui-kb', 'deployment/kb-"quoted'],
        }
      ) ?? '';
    expect(filteredWorkloadQuery).toContain(
      '| WHERE workload_key NOT IN ("deployment/kb-ui-kb", "deployment/kb-\\"quoted")'
    );
    ENTITY_KEY_TABLE.forEach(({ buildQuery }) => {
      const query = buildQuery('SET unmapped_fields = "NULLIFY"; FROM metrics-*');
      expect(query).toMatch(/^SET unmapped_fields = "NULLIFY"; FROM/);
      expect(query).toMatch(/\| SORT[\s\S]*\| LIMIT 501$/);
    });

    const foldContext = { sourceQuery: 'SET unmapped_fields = "NULLIFY"; FROM metrics-*' };
    const nodeFeatures = foldNodeRows(
      [
        {
          'orchestrator.cluster.name': 'cluster-a',
          'kubernetes.node.name': 'node-a',
          activity: 4,
          os: ['Linux'],
          cloud_provider: ['gcp'],
          scale: 1,
          last_seen: lastSeen,
        },
      ],
      foldContext
    ).features;
    const namespaceFeatures = foldNamespaceRows(
      [
        {
          'orchestrator.cluster.name': 'cluster-a',
          'kubernetes.namespace': 'apps',
          replicas: 4,
          local_pods: 4,
          scale: 1,
          tenant_namespaces: 0,
          last_seen: lastSeen,
        },
      ],
      foldContext
    ).features;
    const clusterResult = foldClusterRows([
      {
        'orchestrator.cluster.name': 'cluster-a',
        nodes: 1,
        replicas: 4,
        last_seen: lastSeen,
      },
      {
        'orchestrator.cluster.name': null,
        nodes: 0,
        replicas: 1,
        last_seen: lastSeen,
      },
    ]);
    expect(nodeFeatures.map(({ id }) => id)).toEqual(['k8s.nodes:cluster-a']);
    expect(namespaceFeatures.map(({ id }) => id)).toEqual(['k8s.namespaces:cluster-a']);
    expect(clusterResult.features.map(({ id }) => id)).toEqual(['k8s.cluster:cluster-a']);
    expect(clusterResult.droppedRows.nullCluster).toBe(1);
    expect(
      [...features, ...nodeFeatures, ...namespaceFeatures, ...clusterResult.features].every(
        ({ filter }) => isConditionComplete(filter)
      )
    ).toBe(true);
  });

  it('drops an overlong workload identity while keeping other entities', () => {
    const longName = 'x'.repeat(300);
    const result = foldWorkloadRows([
      {
        'kubernetes.namespace': 'apps',
        kind: 'deployment',
        workload: longName,
        clusters: ['cluster-a'],
        replicas: 1,
        last_seen: '2026-11-10T12:00:00.000Z',
      },
      {
        'kubernetes.namespace': 'apps',
        kind: 'deployment',
        workload: 'api',
        clusters: ['cluster-a'],
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
      nullCluster: 0,
      idTooLong: 1,
    });
  });
});

describe('host entity merging', () => {
  it('enriches the nodes concept and keeps only standalone hosts as entities', () => {
    const lastSeen = '2026-11-10T12:00:00.000Z';
    const nodeFeatures = foldNodeRows(
      [
        {
          'orchestrator.cluster.name': 'cluster-a',
          'kubernetes.node.name': 'node-x',
          activity: 10,
          os: [],
          cloud_provider: [],
          scale: 1,
          last_seen: lastSeen,
        },
      ],
      { sourceQuery: 'SET unmapped_fields = "NULLIFY"; FROM metrics-*' }
    ).features;
    const systemHostFeatures = foldSystemHostRows([
      {
        'host.name': 'node-x',
        'kubernetes.node.name': 'node-x',
        last_seen: lastSeen,
        os: 'Wolfi',
        cloud_provider: 'gcp',
        cloud_instance: 'instance-x',
        clusters: ['cluster-a'],
      },
      {
        'host.name': 'node-y',
        'kubernetes.node.name': 'node-y',
        last_seen: lastSeen,
        os: 'Linux',
        cloud_provider: 'aws',
        cloud_instance: 'instance-y',
        clusters: ['cluster-b'],
      },
    ]).features;
    const otelHostFeatures = foldOtelHostRows([
      {
        'host.name': 'router-1',
        'k8s.node.name': null,
        last_seen: lastSeen,
        os: ['Linux'],
        cloud_provider: [],
        cloud_instance: [],
        clusters: null,
      },
    ]).features;

    const byId = new Map(
      mergeHostFeatures([...nodeFeatures, ...systemHostFeatures, ...otelHostFeatures]).map(
        (feature) => [feature.id, feature]
      )
    );
    expect([...byId.keys()]).toEqual(['k8s.nodes:cluster-a', 'host:router-1']);
    expect(byId.has('host:node-x')).toBe(false);
    expect(byId.get('k8s.nodes:cluster-a')?.properties).toMatchObject({
      host_summary: {
        os: ['Wolfi'],
        cloud_provider: ['gcp'],
      },
    });
    expect(byId.has('k8s.nodes:cluster-b')).toBe(false);
    expect(byId.get('host:router-1')).toEqual(
      expect.objectContaining({
        subtype: 'host',
        filter: { field: 'host.name', eq: 'router-1' },
        properties: expect.objectContaining({
          entity_store_type: 'host',
          host: { os: ['Linux'], cloud_provider: [], cloud_instance: [] },
        }),
      })
    );
  });
});

describe('identifyMetricsEntities', () => {
  it('does not rewrite an excluded entity', async () => {
    const harness = createHarness(
      [
        {
          columns: datasetColumns,
          values: datasetRows('generic.otel'),
        },
        {
          columns: serviceColumns,
          values: [['checkout', ['production'], '2026-11-10T12:00:00.000Z', 42]],
        },
      ],
      ['service:checkout']
    );

    const result = await identifyMetricsEntities({
      esClient: harness.esClient,
      esql: sourceEsql,
      sourceId: 'service-source',
      kiClient: harness.kiClient,
      logger: harness.logger,
    });

    expect(result).toEqual(
      expect.objectContaining({
        metricsEntitiesCount: 0,
        excludedSkippedCount: 1,
      })
    );
    expect(harness.bulk).not.toHaveBeenCalled();
  });

  it('merges copied workloads while keeping local workloads and namespaces separate', async () => {
    const lastSeen = '2026-11-10T12:00:00.000Z';
    const harness = createHarness([
      {
        columns: datasetColumns,
        values: datasetRows('kubernetes.pod'),
      },
      {
        columns: multiNamespaceWorkloadColumns,
        values: [['deployment', 'kb-ui-kb', 10, 10, lastSeen, ['cluster-a'], 0]],
      },
      {
        columns: workloadColumns,
        values: Array.from({ length: 4 }, (_, index) => [
          `team-${index + 1}`,
          'deployment',
          'redis',
          1,
          lastSeen,
          ['cluster-a'],
          0,
        ]),
      },
      {
        columns: namespaceColumns,
        values: [
          ['cluster-a', 'tenant-only', 10, 0, lastSeen, ['cluster-a'], 2, 1],
          ['cluster-a', 'team-local', 1, 1, lastSeen, ['cluster-a'], 2, 1],
        ],
      },
      { columns: clusterColumns, values: [] },
    ]);

    const result = await identifyMetricsEntities({
      esClient: harness.esClient,
      esql: sourceEsql,
      sourceId: 'multi-tenant-source',
      kiClient: harness.kiClient,
      logger: harness.logger,
    });

    expect(result).toEqual(
      expect.objectContaining({
        handled: true,
        metricsEntitiesCount: 6,
        matchedEntityKeyRowsCount: 4,
        multiNamespaceWorkloadsCount: 1,
        namespacesSkippedCount: 1,
      })
    );
    const operations = harness.bulk.mock.calls[0][1];
    expect(
      operations.map(({ index }: { index: { feature: { id: string } } }) => index.feature.id)
    ).toEqual([
      'k8s.namespaces:cluster-a',
      'k8s.deployment:*/kb-ui-kb',
      'k8s.deployment:team-1/redis',
      'k8s.deployment:team-2/redis',
      'k8s.deployment:team-3/redis',
      'k8s.deployment:team-4/redis',
    ]);
    const multiNamespaceFeature = operations.find(
      ({ index }: { index: { feature: { id: string } } }) =>
        index.feature.id === 'k8s.deployment:*/kb-ui-kb'
    )?.index.feature;
    expect(multiNamespaceFeature).toEqual(
      expect.objectContaining({
        title: 'kb-ui-kb',
        description: 'Kubernetes deployment kb-ui-kb in 10 namespaces.',
        filter: { field: 'kubernetes.deployment.name', eq: 'kb-ui-kb' },
        properties: expect.objectContaining({
          grain: 'multi_namespace',
          namespace_count: 10,
          breakdown: ['kubernetes.namespace', 'orchestrator.cluster.name'],
        }),
      })
    );
    expect(multiNamespaceFeature.properties).not.toHaveProperty('entity_store_type');
    expect(isConditionComplete(multiNamespaceFeature.filter)).toBe(true);
    const queries = harness.query.mock.calls.map(([request]: [{ query: string }]) => request.query);
    expect(queries[2]).toContain('| WHERE workload_key NOT IN ("deployment/kb-ui-kb")');
    expect(queries[3]).toContain(
      'CASE(workload_key IS NULL OR workload_key NOT IN ("deployment/kb-ui-kb"), kubernetes.pod.uid, NULL)'
    );
    expect(queries[3]).toContain('tenant_namespaces = SUM(CASE(local_pods == 0, 1, 0))');
    expect(harness.info).toHaveBeenCalledWith(
      expect.stringContaining(
        'source [multi-tenant-source] merged [1] workload names across namespaces'
      )
    );
    expect(harness.info).toHaveBeenCalledWith(
      expect.stringContaining('largest spans [10] namespaces')
    );
  });

  it('folds clusters while keeping equal deployment and daemonset names separate', async () => {
    const datasetList = {
      columns: datasetColumns,
      values: datasetRows('kubernetes.pod', 'kubernetes.node'),
    };
    const workloads = {
      columns: workloadColumns,
      values: [
        [
          'payments',
          'deployment',
          'checkout',
          5,
          '2026-11-10T12:05:00.000Z',
          ['cluster-a', 'cluster-b'],
          0,
        ],
        ['payments', 'daemonset', 'checkout', 4, '2026-11-10T12:03:00.000Z', ['cluster-a'], 0],
        ['payments', 'deployment', 'unknown-cluster', 1, '2026-11-10T12:04:00.000Z', null, 0],
        ['payments', null, null, 0, '2026-11-10T12:02:00.000Z', ['cluster-a'], 0],
        [null, 'deployment', 'missing-namespace', 1, '2026-11-10T12:00:00.000Z', ['cluster-a'], 0],
      ],
    };
    const nodes = {
      columns: nodeColumns,
      values: [
        ['cluster-a', 'node-a', 10, '2026-11-10T12:06:00.000Z', ['Linux'], ['gcp'], 1],
        ['cluster-a', null, 1, '2026-11-10T12:01:00.000Z', ['Linux'], ['gcp'], 1],
      ],
    };
    const namespaces = {
      columns: namespaceColumns,
      values: [
        ['cluster-a', 'payments', 9, 9, '2026-11-10T12:06:00.000Z', ['cluster-a'], 1, 0],
        ['cluster-a', null, 1, 1, '2026-11-10T12:01:00.000Z', ['cluster-a'], 1, 0],
      ],
    };
    const clusters = {
      columns: clusterColumns,
      values: [
        ['cluster-a', 1, 9, '2026-11-10T12:06:00.000Z'],
        [null, 0, 1, '2026-11-10T12:01:00.000Z'],
      ],
    };
    const harness = createHarness([
      datasetList,
      { columns: multiNamespaceWorkloadColumns, values: [] },
      workloads,
      nodes,
      namespaces,
      clusters,
    ]);

    const result = await identifyMetricsEntities({
      esClient: harness.esClient,
      esql: sourceEsql,
      sourceId: 'gcp-k8s-csp-ecs',
      kiClient: harness.kiClient,
      logger: harness.logger,
    });

    expect(result).toEqual(
      expect.objectContaining({
        metricsEntitiesCount: 6,
        metricsCatalogueRowsCount: 2,
        matchedEntityKeyRowsCount: 5,
        uncoveredDatasetsCount: 0,
        metricsEntityRowsCount: 11,
        droppedIncompleteRowsCount: 5,
        droppedOverflowRowsCount: 0,
        droppedRows: {
          ownerless: 1,
          nullNamespace: 2,
          nullNodeName: 1,
          nullCluster: 1,
          idTooLong: 0,
        },
        unknownClusterRows: 1,
        handled: true,
        errors: [],
      })
    );
    const queries = harness.query.mock.calls.map(([request]: [{ query: string }]) => request.query);
    expect(queries).toHaveLength(6);
    queries.forEach((query) => {
      expect(query).toMatch(/^SET unmapped_fields = "NULLIFY"; FROM/);
      expect(query).not.toContain('$.nightshift');
      expect(query).not.toContain('METRICS_INFO');
      expect(query).not.toMatch(/(?:^|;\s*|\|\s*)TS\s/);
    });
    queries.slice(1).forEach((query) => {
      expect(query).toMatch(/\| SORT[\s\S]*\| LIMIT 501$/);
    });
    expect(harness.bulk).toHaveBeenCalledTimes(1);
    const operations = harness.bulk.mock.calls[0][1];
    expect(operations).toHaveLength(6);
    expect(
      operations.map(({ index }: { index: { feature: { id: string } } }) => index.feature.id)
    ).toEqual([
      'k8s.cluster:cluster-a',
      'k8s.namespaces:cluster-a',
      'k8s.nodes:cluster-a',
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
        grain: 'namespace',
        breakdown: ['orchestrator.cluster.name'],
        entity_store_type: 'k8s.deployment',
        clusters: ['cluster-a', 'cluster-b'],
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
    ).toEqual(['_unknown_cluster']);
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

  it('handles Kubernetes, OTel host, and generic OTel service datasets', async () => {
    const harness = createHarness([
      {
        columns: datasetColumns,
        values: datasetRows('kubernetes.pod', 'hostmetricsreceiver.otel', 'generic.otel'),
      },
      { columns: multiNamespaceWorkloadColumns, values: [] },
      {
        columns: workloadColumns,
        values: [
          ['payments', 'deployment', 'checkout', 3, '2026-11-10T12:00:00.000Z', ['cluster-a'], 0],
        ],
      },
      { columns: namespaceColumns, values: [] },
      { columns: clusterColumns, values: [] },
      {
        columns: otelHostColumns,
        values: [['router-1', null, '2026-11-10T12:00:00.000Z', ['Linux'], [], [], null]],
      },
      {
        columns: serviceColumns,
        values: [['checkout', ['production', 'staging'], '2026-11-10T12:00:00.000Z', 42]],
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
        metricsEntitiesCount: 3,
        matchedEntityKeyRowsCount: 6,
        uncoveredDatasetsCount: 0,
      })
    );
    expect(harness.bulk).toHaveBeenCalledTimes(1);
    expect(
      harness.bulk.mock.calls[0][1].map(
        ({ index }: { index: { feature: { id: string } } }) => index.feature.id
      )
    ).toEqual(['host:router-1', 'service:checkout', 'k8s.deployment:payments/checkout']);
    expect(
      harness.bulk.mock.calls[0][1].find(
        ({ index }: { index: { feature: { id: string } } }) =>
          index.feature.id === 'service:checkout'
      )?.index.feature.properties.environments
    ).toEqual(['production', 'staging']);
    expect(harness.info).not.toHaveBeenCalled();
  });

  it('matches OTel Kubernetes rows without counting object-level datasets as uncovered', async () => {
    const harness = createHarness([
      {
        columns: datasetColumns,
        values: datasetRows(
          'kubeletstatsreceiver.otel',
          'k8sclusterreceiver.otel',
          'hostmetricsreceiver.otel'
        ),
      },
      { columns: multiNamespaceWorkloadColumns, values: [] },
      {
        columns: workloadColumns,
        values: [['apps', 'deployment', 'api', 3, '2026-11-10T12:00:00.000Z', ['edge-edot'], 0]],
      },
      {
        columns: nodeColumns,
        values: [['edge-edot', 'node-a', 10, '2026-11-10T12:00:00.000Z', ['Linux'], ['gcp'], 1]],
      },
      {
        columns: namespaceColumns,
        values: [['edge-edot', 'apps', 3, 3, '2026-11-10T12:00:00.000Z', ['edge-edot'], 1, 0]],
      },
      {
        columns: clusterColumns,
        values: [['edge-edot', 1, 3, '2026-11-10T12:00:00.000Z']],
      },
      {
        columns: otelHostColumns,
        values: [['router-1', null, '2026-11-10T12:00:00.000Z', ['Linux'], [], [], null]],
      },
    ]);

    const result = await identifyMetricsEntities({
      esClient: harness.esClient,
      esql: sourceEsql,
      sourceId: 'edge-edot',
      kiClient: harness.kiClient,
      logger: harness.logger,
    });

    expect(result).toEqual(
      expect.objectContaining({
        handled: true,
        metricsEntitiesCount: 5,
        matchedEntityKeyRowsCount: 6,
        uncoveredDatasetsCount: 0,
      })
    );
    expect(
      harness.bulk.mock.calls[0][1].map(
        ({ index }: { index: { feature: { id: string } } }) => index.feature.id
      )
    ).toEqual([
      'k8s.cluster:edge-edot',
      'k8s.namespaces:edge-edot',
      'k8s.nodes:edge-edot',
      'host:router-1',
      'k8s.deployment:apps/api',
    ]);
  });

  it('keeps the nodes concept before the highest-replica workloads within the cap', async () => {
    const datasetList = {
      columns: datasetColumns,
      values: datasetRows('kubernetes.pod', 'kubernetes.node'),
    };
    const workloads = {
      columns: workloadColumns,
      values: Array.from({ length: 501 }, (_, index) => [
        'namespace-a',
        'deployment',
        `workload-${index}`,
        501 - index,
        '2026-11-10T12:00:00.000Z',
        ['cluster-a'],
        0,
      ]),
    };
    const nodes = {
      columns: nodeColumns,
      values: [
        ['cluster-a', 'node-b', 8, '2026-11-10T12:00:00.000Z', ['Linux'], ['gcp'], 2],
        ['cluster-a', 'node-a', 7, '2026-11-10T12:00:00.000Z', ['Linux'], ['gcp'], 2],
      ],
    };
    const harness = createHarness([
      datasetList,
      { columns: multiNamespaceWorkloadColumns, values: [] },
      workloads,
      nodes,
      { columns: namespaceColumns, values: [] },
      { columns: clusterColumns, values: [] },
    ]);

    const result = await identifyMetricsEntities({
      esClient: harness.esClient,
      esql: sourceEsql,
      sourceId: 'overflow-source',
      kiClient: harness.kiClient,
      logger: harness.logger,
    });

    expect(result.metricsEntitiesCount).toBe(500);
    expect(result.droppedOverflowRowsCount).toBe(2);
    const operations = harness.bulk.mock.calls[0][1];
    expect(operations).toHaveLength(500);
    const ids = operations.map(
      ({ index }: { index: { feature: { id: string } } }) => index.feature.id
    );
    expect(ids[0]).toBe('k8s.nodes:cluster-a');
    expect(ids).not.toEqual(
      expect.arrayContaining([
        'k8s.deployment:namespace-a/workload-498',
        'k8s.deployment:namespace-a/workload-499',
        'k8s.deployment:namespace-a/workload-500',
      ])
    );
    expect(harness.info).toHaveBeenCalledTimes(2);
    expect(harness.info).toHaveBeenCalledWith(expect.stringContaining('row [ecs.k8s_workload]'));
    expect(harness.info).toHaveBeenCalledWith(expect.stringContaining('501 row limit'));
    expect(harness.info).toHaveBeenCalledWith(expect.stringContaining('source [overflow-source]'));
    expect(harness.info).toHaveBeenCalledWith(expect.stringContaining('502 rows, dropped 2'));
  });
});
