/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_TEXT_LENGTH, type FeatureUpsert } from '@kbn/significant-events-schema';
import { isConditionComplete } from '@kbn/streamlang';
import { ENTITY_KEY_TABLE } from './entity_key_table';
import { getDatasetFamily } from './entity_rows/helpers';
import { foldHostRows, mergeHostFeatures } from './hosts';
import { identifyMetricsEntities } from './identify_metrics_entities';
import { buildInfrastructureConceptDescription } from './kubernetes/concepts';
import { foldNamespaceRows } from './kubernetes/namespaces';
import { foldNodeRows } from './kubernetes/nodes';
import { foldWorkloadRows } from './kubernetes/workloads';
import { foldServiceRows } from './services';

const datasetColumns = [
  { name: 'docs', type: 'long' },
  { name: 'data_stream.dataset', type: 'keyword' },
];

const workloadColumns = [
  { name: 'orchestrator.cluster.name', type: 'keyword' },
  { name: 'kind', type: 'keyword' },
  { name: 'scale', type: 'long' },
  { name: 'activity', type: 'long' },
  { name: 'last_seen', type: 'date' },
  { name: 'members', type: 'keyword' },
];

const nodeColumns = [
  { name: 'orchestrator.cluster.name', type: 'keyword' },
  { name: 'scale', type: 'long' },
  { name: 'activity', type: 'long' },
  { name: 'last_seen', type: 'date' },
  { name: 'members', type: 'keyword' },
  { name: 'os', type: 'keyword' },
  { name: 'cloud_provider', type: 'keyword' },
];

const namespaceColumns = [
  { name: 'orchestrator.cluster.name', type: 'keyword' },
  { name: 'scale', type: 'long' },
  { name: 'activity', type: 'long' },
  { name: 'last_seen', type: 'date' },
  { name: 'members', type: 'keyword' },
];

const hostColumns = [
  { name: 'entity_type', type: 'keyword' },
  { name: 'concept_cluster', type: 'keyword' },
  { name: 'scale', type: 'long' },
  { name: 'activity', type: 'long' },
  { name: 'last_seen', type: 'date' },
  { name: 'members', type: 'keyword' },
  { name: 'os', type: 'keyword' },
  { name: 'cloud_provider', type: 'keyword' },
];

const serviceColumns = [
  { name: 'scale', type: 'long' },
  { name: 'activity', type: 'long' },
  { name: 'last_seen', type: 'date' },
  { name: 'members', type: 'keyword' },
  { name: 'environments', type: 'keyword' },
];

const sourceEsql =
  'FROM metrics-gcp-us-central1:metrics-kubernetes.*,-metrics-gcp-us-central1:metrics-kubernetes.apiserver-* | WHERE orchestrator.cluster.name == "cluster-a"';
const foldContext = {
  sourceQuery: 'SET unmapped_fields = "NULLIFY"; FROM metrics-*',
  sourceId: 'source-id',
};

type TestScalar = string | number | boolean | null;
type TestCell = TestScalar | readonly TestScalar[];
interface TestResponse {
  columns: object[];
  values: TestCell[][];
}
type WrittenFeature = FeatureUpsert & { expires_at?: string };

const datasetRows = (...datasets: Array<string | null>): TestCell[][] =>
  datasets.map((dataset, index) => [index + 1, dataset]);

const createHarness = (
  responses: TestResponse[],
  excludedIds: string[] = [],
  priorFeatures: object[] = []
) => {
  const query = jest.fn();
  responses.forEach((response) => query.mockResolvedValueOnce(response));
  const bulk = jest.fn().mockResolvedValue({ applied: 1, skipped: 0 });
  const getDefaultExpiresAt = jest.fn().mockReturnValue('2026-12-10T12:00:00.000Z');
  const getExcludedFeatures = jest
    .fn()
    .mockResolvedValue({ hits: excludedIds.map((id) => ({ id })) });
  const getFeatures = jest.fn().mockResolvedValue({ hits: priorFeatures });
  const info = jest.fn();

  return {
    esClient: { esql: { query } } as never,
    query,
    kiClient: { bulk, getDefaultExpiresAt, getExcludedFeatures, getFeatures } as never,
    bulk,
    logger: { info } as never,
    info,
  };
};

const getWrittenFeatures = (bulk: jest.Mock): WrittenFeature[] =>
  bulk.mock.calls[0][1].map(({ index }: { index: { feature: WrittenFeature } }) => index.feature);

describe('getDatasetFamily', () => {
  it('reads covered, uncovered, and null dataset families', () => {
    expect(getDatasetFamily('kubernetes.pod')).toBe('kubernetes');
    expect(getDatasetFamily('hostmetricsreceiver.otel')).toBe('hostmetricsreceiver');
    expect(getDatasetFamily(null)).toBeUndefined();
  });
});

describe('buildInfrastructureConceptDescription', () => {
  it('uses the exact scale and truncates members within the schema limit', () => {
    const exact = buildInfrastructureConceptDescription({
      concept: 'nodes',
      scope: 'cluster-a',
      scale: 188,
      breakdownFields: ['kubernetes.node.name'],
      members: ['node-a'],
    });
    const truncated = buildInfrastructureConceptDescription({
      concept: 'deployments',
      scope: 'cluster-a',
      scale: 1000,
      breakdownFields: ['kubernetes.namespace', 'kubernetes.deployment.name'],
      members: Array.from({ length: 50 }, (_, index) => `${index}-${'x'.repeat(500)}`),
    });

    expect(exact).toContain('188 nodes');
    expect(exact).not.toContain('about 190');
    expect(truncated).toMatch(/and \d+ more\.$/);
    expect(truncated.length).toBeLessThanOrEqual(MAX_TEXT_LENGTH);
  });
});

describe('Kubernetes type KIs', () => {
  it('writes one workload KI per kind and cluster with derived members and a 50-member cap', () => {
    const deploymentMembers = [
      'apps/api-derived',
      ...Array.from({ length: 49 }, (_, index) => `team-${index}/api-${index}`),
    ].sort();
    const result = foldWorkloadRows(
      [
        {
          'orchestrator.cluster.name': 'cluster-a',
          kind: 'deployment',
          scale: 60,
          activity: 100,
          members: deploymentMembers,
        },
        {
          'orchestrator.cluster.name': 'cluster-b',
          kind: 'deployment',
          scale: 1,
          activity: 1,
          members: ['apps/api'],
        },
        {
          'orchestrator.cluster.name': 'cluster-a',
          kind: 'cronjob',
          scale: 1,
          activity: 1,
          members: ['ops/nightly-derived'],
        },
        {
          'orchestrator.cluster.name': 'cluster-a',
          kind: 'statefulset',
          scale: 1,
          activity: 1,
          members: ['apps/database'],
        },
        {
          'orchestrator.cluster.name': 'cluster-a',
          kind: 'daemonset',
          scale: 1,
          activity: 1,
          members: ['ops/agent'],
        },
      ],
      foldContext
    );
    const byId = new Map(result.features.map((feature) => [feature.id, feature]));
    const deployments = byId.get('k8s.deployments:cluster-a');

    expect([...byId.keys()]).toEqual([
      'k8s.deployments:cluster-a',
      'k8s.deployments:cluster-b',
      'k8s.cronjobs:cluster-a',
      'k8s.statefulsets:cluster-a',
      'k8s.daemonsets:cluster-a',
    ]);
    expect(deployments).toEqual(
      expect.objectContaining({
        type: 'infrastructure',
        subtype: 'k8s.deployment',
        title: 'Kubernetes deployments of cluster-a',
        filter: { field: 'orchestrator.cluster.name', eq: 'cluster-a' },
        properties: expect.objectContaining({
          breakdown: ['kubernetes.namespace', 'kubernetes.deployment.name'],
          entity_store_type: 'k8s.deployment',
          scale: 60,
          members: deploymentMembers,
          origin: 'metrics',
          key_row: 'ecs.k8s_workload',
        }),
      })
    );
    expect(deployments?.properties.members).toHaveLength(50);
    expect(deployments?.properties.members).toContain('apps/api-derived');
    expect(deployments?.description).toContain('60 deployments');
    expect(deployments?.properties.list_query).toEqual(
      expect.stringContaining('kubernetes.replicaset.name')
    );
    expect(deployments?.properties.list_query).toEqual(
      expect.stringContaining('| WHERE kind == "deployment"')
    );
    expect(deployments?.properties.list_query).toEqual(
      expect.stringContaining('| EVAL `kubernetes.deployment.name` = workload')
    );
    expect(deployments?.properties.list_query).toEqual(
      expect.stringContaining(
        '| STATS last_seen = MAX(@timestamp) BY kubernetes.namespace, kubernetes.deployment.name'
      )
    );
    expect(byId.get('k8s.cronjobs:cluster-a')?.properties.list_query).toEqual(
      expect.stringContaining('kubernetes.job.name RLIKE')
    );
    expect(byId.get('k8s.cronjobs:cluster-a')?.properties.list_query).toEqual(
      expect.stringContaining('| EVAL `kubernetes.cronjob.name` = workload')
    );
    expect(byId.get('k8s.statefulsets:cluster-a')?.subtype).toBe('k8s.statefulset');
    expect(byId.get('k8s.daemonsets:cluster-a')?.subtype).toBe('k8s.daemonset');
    expect(deployments?.properties).not.toHaveProperty('identity');
    expect(deployments?.properties).not.toHaveProperty('name');
    expect(result.features.every(({ filter }) => isConditionComplete(filter))).toBe(true);

    const workloadQuery =
      ENTITY_KEY_TABLE.find(({ id }) => id === 'ecs.k8s_workload')?.buildQuery(
        foldContext.sourceQuery
      ) ?? '';
    expect(workloadQuery).toContain('`kubernetes.labels.pod-template-hash`');
    expect(workloadQuery).toContain(
      '| WHERE kind IN ("deployment", "statefulset", "daemonset", "cronjob")'
    );
    expect(workloadQuery).toContain(
      'members = TOP(CONCAT(kubernetes.namespace, "/", workload), 50, "asc")'
    );
    expect(workloadQuery).toContain('BY orchestrator.cluster.name, kind');
    expect(workloadQuery).toMatch(/\| SORT activity DESC\n\| LIMIT 501$/);
  });

  it('keeps node and namespace ids while using entity-store subtypes', () => {
    const nodes = foldNodeRows(
      [
        {
          'orchestrator.cluster.name': 'cluster-a',
          scale: 2,
          members: ['node-a', 'node-b'],
          os: ['Linux'],
          cloud_provider: ['gcp'],
        },
      ],
      foldContext
    ).features[0];
    const namespaces = foldNamespaceRows(
      [
        {
          'orchestrator.cluster.name': 'cluster-a',
          scale: 2,
          members: ['apps', 'kube-system'],
        },
      ],
      foldContext
    ).features[0];

    expect(nodes).toEqual(
      expect.objectContaining({
        id: 'k8s.nodes:cluster-a',
        subtype: 'k8s.node',
        properties: expect.objectContaining({
          entity_store_type: 'k8s.node',
          scale: 2,
        }),
      })
    );
    expect(namespaces).toEqual(
      expect.objectContaining({
        id: 'k8s.namespaces:cluster-a',
        subtype: 'k8s.namespace',
        properties: expect.objectContaining({
          entity_store_type: 'k8s.namespace',
          scale: 2,
        }),
      })
    );
  });

  it('drops an overlong workload type identity while keeping valid rows', () => {
    const result = foldWorkloadRows(
      [
        {
          'orchestrator.cluster.name': 'x'.repeat(300),
          kind: 'deployment',
          scale: 1,
          members: ['apps/api'],
        },
        {
          'orchestrator.cluster.name': 'cluster-a',
          kind: 'deployment',
          scale: 1,
          members: ['apps/api'],
        },
      ],
      foldContext
    );

    expect(result.features.map(({ id }) => id)).toEqual(['k8s.deployments:cluster-a']);
    expect(result.droppedIncompleteRowsCount).toBe(1);
    expect(result.droppedRows.idTooLong).toBe(1);
  });
});

describe('host type KIs', () => {
  it('groups standalone hosts and lets node hosts enrich the node type KI', () => {
    const standaloneMembers = Array.from(
      { length: 50 },
      (_, index) => `router-${String(index).padStart(2, '0')}`
    );
    const hostFeatures = foldHostRows(
      [
        {
          entity_type: 'host',
          concept_cluster: '',
          scale: 52,
          members: standaloneMembers,
          os: ['Linux'],
          cloud_provider: ['aws', 'gcp'],
        },
        {
          entity_type: 'node',
          concept_cluster: 'cluster-a',
          scale: 1,
          members: ['node-x'],
          os: ['Wolfi'],
          cloud_provider: ['gcp'],
        },
      ],
      foldContext
    ).features;
    const nodeFeatures = foldNodeRows(
      [
        {
          'orchestrator.cluster.name': 'cluster-a',
          scale: 1,
          members: ['node-x'],
          os: [],
          cloud_provider: [],
        },
      ],
      foldContext
    ).features;
    const byId = new Map(
      mergeHostFeatures([...nodeFeatures, ...hostFeatures]).map((feature) => [feature.id, feature])
    );
    const hostNodeFeature = hostFeatures.find(({ id }) => id === 'k8s.nodes:cluster-a');

    expect([...byId.keys()]).toEqual(['k8s.nodes:cluster-a', 'hosts:source-id']);
    expect(byId.get('hosts:source-id')).toEqual(
      expect.objectContaining({
        type: 'infrastructure',
        subtype: 'host',
        title: 'Hosts',
        properties: expect.objectContaining({
          breakdown: ['host.name'],
          entity_store_type: 'host',
          scale: 52,
          members: standaloneMembers,
          host_summary: {
            os: ['Linux'],
            cloud_provider: ['aws', 'gcp'],
          },
        }),
      })
    );
    expect(byId.get('hosts:source-id')?.description).toContain('and 2 more');
    expect(hostNodeFeature?.properties.breakdown).toEqual(['kubernetes.node.name']);
    expect(hostNodeFeature?.properties.list_query).toEqual(
      expect.stringContaining('| STATS last_seen = MAX(@timestamp) BY kubernetes.node.name')
    );
    expect(byId.get('k8s.nodes:cluster-a')?.properties).toMatchObject({
      breakdown: ['kubernetes.node.name'],
      members: ['node-x'],
      host_summary: { os: ['Wolfi'], cloud_provider: ['gcp'] },
    });
    expect(byId.has('host:node-x')).toBe(false);
  });
});

describe('service type KIs', () => {
  it('groups services and keeps ECS and OTel deployment environments', () => {
    const query =
      ENTITY_KEY_TABLE.find(({ id }) => id === 'apm.service')?.buildQuery(
        foldContext.sourceQuery
      ) ?? '';
    const feature = foldServiceRows(
      [
        {
          scale: 2,
          members: ['checkout', 'payments'],
          environments: ['production', 'staging'],
        },
      ],
      foldContext
    ).features[0];

    expect(query).toContain('COALESCE(service.environment, deployment.environment.name)');
    expect(query).toContain('members = TOP(service.name, 50, "asc")');
    expect(feature).toEqual(
      expect.objectContaining({
        type: 'entity',
        subtype: 'service',
        id: 'services:source-id',
        title: 'Services',
        properties: expect.objectContaining({
          breakdown: ['service.name'],
          entity_store_type: 'service',
          scale: 2,
          members: ['checkout', 'payments'],
          environments: ['production', 'staging'],
        }),
      })
    );
    expect(feature?.properties.list_query).not.toContain('\n\n');
  });
});

describe('identifyMetricsEntities', () => {
  it('does not rewrite an excluded type KI', async () => {
    const harness = createHarness(
      [
        { columns: datasetColumns, values: datasetRows('generic.otel') },
        {
          columns: serviceColumns,
          values: [[1, 42, '2026-11-10T12:00:00.000Z', ['Checkout'], ['production']]],
        },
      ],
      ['services:service-source']
    );

    const result = await identifyMetricsEntities({
      esClient: harness.esClient,
      esql: sourceEsql,
      sourceId: 'Service-Source',
      kiClient: harness.kiClient,
      logger: harness.logger,
    });

    expect(result).toEqual(
      expect.objectContaining({ metricsEntitiesCount: 0, excludedSkippedCount: 1 })
    );
    expect(harness.bulk).not.toHaveBeenCalled();
  });

  it('keeps a prior durable type KI permanent', async () => {
    const harness = createHarness(
      [
        { columns: datasetColumns, values: datasetRows('generic.otel') },
        {
          columns: serviceColumns,
          values: [[1, 42, '2026-11-10T12:00:00.000Z', ['checkout'], ['production']]],
        },
      ],
      [],
      [{ id: 'services:service-source' }]
    );

    await identifyMetricsEntities({
      esClient: harness.esClient,
      esql: sourceEsql,
      sourceId: 'service-source',
      kiClient: harness.kiClient,
      logger: harness.logger,
    });

    expect(getWrittenFeatures(harness.bulk)[0].expires_at).toBeUndefined();
  });

  it('keeps a node type KI for a source with only Kubernetes system hosts', async () => {
    const harness = createHarness([
      { columns: datasetColumns, values: datasetRows('system.cpu') },
      {
        columns: hostColumns,
        values: [
          [
            'node',
            'cluster-a',
            2,
            10,
            '2026-11-10T12:00:00.000Z',
            ['node-a', 'node-b'],
            ['Linux'],
            ['gcp'],
          ],
        ],
      },
    ]);

    const result = await identifyMetricsEntities({
      esClient: harness.esClient,
      esql: sourceEsql,
      sourceId: 'system-hosts-source',
      kiClient: harness.kiClient,
      logger: harness.logger,
    });

    expect(result.metricsEntitiesCount).toBe(1);
    expect(getWrittenFeatures(harness.bulk)[0]).toEqual(
      expect.objectContaining({
        id: 'k8s.nodes:cluster-a',
        subtype: 'k8s.node',
        properties: expect.objectContaining({
          members: ['node-a', 'node-b'],
          scale: 2,
          key_row: 'metrics.hosts',
        }),
      })
    );
  });

  it('writes workload, node, and namespace type KIs without a cluster KI', async () => {
    const harness = createHarness([
      {
        columns: datasetColumns,
        values: datasetRows('kubernetes.pod', 'kubernetes.node'),
      },
      {
        columns: workloadColumns,
        values: [
          ['cluster-a', 'deployment', 2, 5, '2026-11-10T12:00:00.000Z', ['apps/api', 'apps/ui']],
          ['cluster-b', 'deployment', 1, 1, '2026-11-10T12:00:00.000Z', ['apps/api']],
          ['cluster-a', 'daemonset', 1, 3, '2026-11-10T12:00:00.000Z', ['ops/agent']],
        ],
      },
      {
        columns: nodeColumns,
        values: [
          [
            'cluster-a',
            2,
            10,
            '2026-11-10T12:00:00.000Z',
            ['node-a', 'node-b'],
            ['Linux'],
            ['gcp'],
          ],
          ['cluster-b', 1, 5, '2026-11-10T12:00:00.000Z', ['node-c'], ['Linux'], ['aws']],
        ],
      },
      {
        columns: namespaceColumns,
        values: [
          ['cluster-a', 2, 8, '2026-11-10T12:00:00.000Z', ['apps', 'ops']],
          ['cluster-b', 1, 2, '2026-11-10T12:00:00.000Z', ['apps']],
        ],
      },
    ]);

    const result = await identifyMetricsEntities({
      esClient: harness.esClient,
      esql: sourceEsql,
      sourceId: 'kubernetes-source',
      kiClient: harness.kiClient,
      logger: harness.logger,
    });
    const features = getWrittenFeatures(harness.bulk);

    expect(result).toEqual(
      expect.objectContaining({
        handled: true,
        metricsEntitiesCount: 7,
        matchedEntityKeyRowsCount: 3,
        metricsEntityRowsCount: 7,
      })
    );
    expect(features.map(({ id }) => id)).toEqual([
      'k8s.namespaces:cluster-a',
      'k8s.namespaces:cluster-b',
      'k8s.nodes:cluster-a',
      'k8s.nodes:cluster-b',
      'k8s.daemonsets:cluster-a',
      'k8s.deployments:cluster-a',
      'k8s.deployments:cluster-b',
    ]);
    expect(features.some(({ id }) => id.startsWith('k8s.cluster:'))).toBe(false);
    expect(
      features.every(({ properties }) =>
        ['breakdown', 'entity_store_type', 'list_query', 'members', 'scale'].every(
          (property) => property in properties
        )
      )
    ).toBe(true);
  });

  it('handles no data without inventory queries or writes', async () => {
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
        handled: true,
        skipReason: 'no_data',
        metricsEntitiesCount: 0,
      })
    );
    expect(harness.query).toHaveBeenCalledTimes(1);
    expect(harness.bulk).not.toHaveBeenCalled();
  });

  it('fails when the dataset catalogue request fails', async () => {
    const harness = createHarness([]);
    harness.query.mockRejectedValueOnce(new Error('request failed'));

    await expect(
      identifyMetricsEntities({
        esClient: harness.esClient,
        esql: sourceEsql,
        sourceId: 'failed-source',
        kiClient: harness.kiClient,
        logger: harness.logger,
      })
    ).rejects.toThrow('request failed');
    expect(harness.bulk).not.toHaveBeenCalled();
  });

  it('counts a null dataset as uncovered and falls back without writing', async () => {
    const harness = createHarness([{ columns: datasetColumns, values: datasetRows(null) }]);

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
    expect(harness.bulk).not.toHaveBeenCalled();
  });

  it('handles Kubernetes, OTel host, and generic OTel service datasets', async () => {
    const harness = createHarness([
      {
        columns: datasetColumns,
        values: datasetRows('kubernetes.pod', 'hostmetricsreceiver.otel', 'generic.otel'),
      },
      {
        columns: workloadColumns,
        values: [
          ['cluster-a', 'deployment', 1, 3, '2026-11-10T12:00:00.000Z', ['payments/checkout']],
        ],
      },
      { columns: namespaceColumns, values: [] },
      {
        columns: hostColumns,
        values: [['host', '', 1, 42, '2026-11-10T12:00:00.000Z', ['router-1'], ['Linux'], []]],
      },
      {
        columns: serviceColumns,
        values: [[1, 42, '2026-11-10T12:00:00.000Z', ['checkout'], ['production']]],
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
        matchedEntityKeyRowsCount: 4,
        uncoveredDatasetsCount: 0,
      })
    );
    expect(getWrittenFeatures(harness.bulk).map(({ id }) => id)).toEqual([
      'hosts:mixed-metrics',
      'services:mixed-metrics',
      'k8s.deployments:cluster-a',
    ]);
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
      {
        columns: workloadColumns,
        values: [['edge-edot', 'deployment', 1, 3, '2026-11-10T12:00:00.000Z', ['apps/api']]],
      },
      {
        columns: nodeColumns,
        values: [['edge-edot', 1, 10, '2026-11-10T12:00:00.000Z', ['node-a'], ['Linux'], ['gcp']]],
      },
      {
        columns: namespaceColumns,
        values: [['edge-edot', 1, 3, '2026-11-10T12:00:00.000Z', ['apps']]],
      },
      {
        columns: hostColumns,
        values: [
          ['node', 'edge-edot', 1, 42, '2026-11-10T12:00:00.000Z', ['node-a'], ['Linux'], ['gcp']],
          ['host', '', 1, 1, '2026-11-10T12:00:00.000Z', ['router-1'], ['Linux'], []],
        ],
      },
    ]);

    const result = await identifyMetricsEntities({
      esClient: harness.esClient,
      esql: sourceEsql,
      sourceId: 'edge-edot-source',
      kiClient: harness.kiClient,
      logger: harness.logger,
    });

    expect(result).toEqual(
      expect.objectContaining({
        handled: true,
        metricsEntitiesCount: 4,
        matchedEntityKeyRowsCount: 4,
        uncoveredDatasetsCount: 0,
      })
    );
    expect(getWrittenFeatures(harness.bulk).map(({ id }) => id)).toEqual([
      'k8s.namespaces:edge-edot',
      'k8s.nodes:edge-edot',
      'hosts:edge-edot-source',
      'k8s.deployments:edge-edot',
    ]);
  });

  it('keeps node type KIs before workload types within the cap', async () => {
    const workloads = Array.from({ length: 501 }, (_, index) => [
      `cluster-${String(index).padStart(3, '0')}`,
      'deployment',
      1,
      501 - index,
      '2026-11-10T12:00:00.000Z',
      ['apps/api'],
    ]);
    const harness = createHarness([
      {
        columns: datasetColumns,
        values: datasetRows('kubernetes.pod', 'kubernetes.node'),
      },
      { columns: workloadColumns, values: workloads },
      {
        columns: nodeColumns,
        values: [['cluster-a', 1, 1, '2026-11-10T12:00:00.000Z', ['node-a'], ['Linux'], ['gcp']]],
      },
      { columns: namespaceColumns, values: [] },
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
    const ids = getWrittenFeatures(harness.bulk).map(({ id }) => id);
    expect(ids[0]).toBe('k8s.nodes:cluster-a');
    expect(harness.info).toHaveBeenCalledWith(expect.stringContaining('row [ecs.k8s_workload]'));
    expect(harness.info).toHaveBeenCalledWith(expect.stringContaining('502 rows, dropped 2'));
  });
});
