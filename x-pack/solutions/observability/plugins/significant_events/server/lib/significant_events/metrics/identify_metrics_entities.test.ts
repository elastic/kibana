/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FeatureUpsert } from '@kbn/significant-events-schema';
import { isConditionComplete } from '@kbn/streamlang';
import { ENTITY_KEY_TABLE } from './entity_key_table';
import { getDatasetFamily } from './entity_rows/helpers';
import { buildHostQuery, foldHostRows } from './hosts';
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
  { name: 'member_count', type: 'long' },
  { name: 'cluster_count', type: 'long' },
  { name: 'activity', type: 'long' },
  { name: 'last_seen', type: 'date' },
  { name: 'kind', type: 'keyword' },
];

const nodeColumns = [
  { name: 'member_count', type: 'long' },
  { name: 'cluster_count', type: 'long' },
  { name: 'activity', type: 'long' },
  { name: 'last_seen', type: 'date' },
  { name: 'os', type: 'keyword' },
  { name: 'cloud_provider', type: 'keyword' },
];

const namespaceColumns = [
  { name: 'member_count', type: 'long' },
  { name: 'cluster_count', type: 'long' },
  { name: 'activity', type: 'long' },
  { name: 'last_seen', type: 'date' },
];

const hostColumns = [
  { name: 'member_count', type: 'long' },
  { name: 'activity', type: 'long' },
  { name: 'last_seen', type: 'date' },
  { name: 'os', type: 'keyword' },
  { name: 'cloud_provider', type: 'keyword' },
];

const serviceColumns = [
  { name: 'member_count', type: 'long' },
  { name: 'activity', type: 'long' },
  { name: 'last_seen', type: 'date' },
  { name: 'environments', type: 'keyword' },
];

const sourceEsql =
  'FROM metrics-gcp-us-central1:metrics-kubernetes.*,-metrics-gcp-us-central1:metrics-kubernetes.apiserver-* | WHERE orchestrator.cluster.name == "cluster-a"';
const foldContext = {
  sourceQuery: 'SET unmapped_fields = "NULLIFY"; FROM metrics-*',
  sourceId: 'source-id',
};
const lastSeen = '2026-11-10T12:00:00.000Z';

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

const getKeyRowQuery = (keyRowId: string): string =>
  ENTITY_KEY_TABLE.find(({ id }) => id === keyRowId)?.buildQuery(foldContext.sourceQuery) ?? '';

describe('getDatasetFamily', () => {
  it('reads covered, uncovered, and null dataset families', () => {
    expect(getDatasetFamily('kubernetes.pod')).toBe('kubernetes');
    expect(getDatasetFamily('hostmetricsreceiver.otel')).toBe('hostmetricsreceiver');
    expect(getDatasetFamily(null)).toBeUndefined();
  });
});

describe('buildInfrastructureConceptDescription', () => {
  it('states the exact member and cluster counts without listing members', () => {
    const description = buildInfrastructureConceptDescription({
      concept: 'nodes',
      memberCount: 188,
      clusterCount: 3,
      breakdownFields: ['orchestrator.cluster.name', 'kubernetes.node.name'],
    });

    expect(description).toContain('188 nodes seen in the last hour across 3 clusters');
    expect(description).toContain('orchestrator.cluster.name and kubernetes.node.name');
    expect(description).not.toContain('Members');
    expect(
      buildInfrastructureConceptDescription({
        concept: 'deployments',
        memberCount: 5,
        clusterCount: 0,
        unclusteredCount: 5,
        breakdownFields: ['kubernetes.namespace'],
      })
    ).toContain('5 deployments seen in the last hour, with no cluster name reported');
    expect(
      buildInfrastructureConceptDescription({
        concept: 'deployments',
        memberCount: 5,
        clusterCount: 2,
        unclusteredCount: 1,
        breakdownFields: ['kubernetes.namespace'],
      })
    ).toContain('across 2 clusters, 1 with no cluster name reported');
  });
});

describe('Kubernetes type KIs', () => {
  it('writes one workload KI per kind for the source, broken down by cluster', () => {
    const result = foldWorkloadRows(
      [
        { kind: 'deployment', member_count: 61, cluster_count: 2, activity: 100 },
        { kind: 'cronjob', member_count: 1, cluster_count: 0, unclustered_count: 1, activity: 1 },
        { kind: 'statefulset', member_count: 1, cluster_count: 1, activity: 1 },
        { kind: 'daemonset', member_count: 1, cluster_count: 1, activity: 1 },
      ],
      foldContext
    );
    const byId = new Map(result.features.map((feature) => [feature.id, feature]));
    const deployments = byId.get('k8s.deployments:source-id');

    expect([...byId.keys()]).toEqual([
      'k8s.deployments:source-id',
      'k8s.cronjobs:source-id',
      'k8s.statefulsets:source-id',
      'k8s.daemonsets:source-id',
    ]);
    expect(deployments).toEqual(
      expect.objectContaining({
        type: 'infrastructure',
        subtype: 'k8s.deployment',
        title: 'Kubernetes deployments',
        evidence: ['61 deployments seen in the last hour across 2 clusters'],
        properties: expect.objectContaining({
          breakdown: [
            'orchestrator.cluster.name',
            'kubernetes.namespace',
            'kubernetes.deployment.name',
          ],
          entity_store_type: 'k8s.deployment',
          member_count: 61,
          cluster_count: 2,
          origin: 'metrics',
          key_row: 'ecs.k8s_workload',
        }),
      })
    );
    expect(byId.get('k8s.cronjobs:source-id')?.evidence).toEqual([
      '1 cronjobs seen in the last hour, with no cluster name reported',
    ]);
    expect(deployments?.properties).not.toHaveProperty('members');
    expect(deployments?.properties.list_query).toEqual(
      expect.stringContaining('| WHERE kind == "deployment"')
    );
    expect(deployments?.properties.list_query).toEqual(
      expect.stringContaining(
        '| STATS last_seen = MAX(@timestamp) BY orchestrator.cluster.name, kubernetes.namespace, kubernetes.deployment.name'
      )
    );
    expect(deployments?.properties.list_query).not.toContain('orchestrator.cluster.name ==');
    expect(deployments?.filter).toEqual({
      and: [
        {
          or: [
            { field: 'data_stream.dataset', eq: 'kubernetes.pod' },
            { field: 'data_stream.dataset', eq: 'kubeletstatsreceiver.otel' },
          ],
        },
        {
          or: [
            { field: 'kubernetes.deployment.name', exists: true },
            {
              and: [
                { not: { field: 'kubernetes.deployment.name', exists: true } },
                { field: 'kubernetes.replicaset.name', exists: true },
                { field: 'kubernetes.labels.pod-template-hash', exists: true },
              ],
            },
          ],
        },
      ],
    });
    expect(result.features.every(({ filter }) => isConditionComplete(filter))).toBe(true);

    const workloadQuery = getKeyRowQuery('ecs.k8s_workload');
    expect(workloadQuery).toContain(
      'BY orchestrator.cluster.name, kubernetes.namespace, kind, workload'
    );
    expect(workloadQuery).toContain('cluster_count = COUNT_DISTINCT(orchestrator.cluster.name)');
    expect(workloadQuery).toContain('  BY kind\n');
    expect(workloadQuery).not.toContain('TOP(');
  });

  it('writes one node and one namespace KI for the source, keyed by cluster and name', () => {
    const nodes = foldNodeRows(
      [
        {
          member_count: 3,
          cluster_count: 0,
          unclustered_count: 3,
          os: ['Linux'],
          cloud_provider: ['gcp'],
        },
      ],
      foldContext
    ).features[0];
    const namespaces = foldNamespaceRows(
      [{ member_count: 20, cluster_count: 2, unclustered_count: 4 }],
      foldContext
    ).features[0];

    expect(nodes).toEqual(
      expect.objectContaining({
        id: 'k8s.nodes:source-id',
        subtype: 'k8s.node',
        filter: {
          and: [
            {
              or: [
                { field: 'data_stream.dataset', eq: 'kubernetes.node' },
                { field: 'data_stream.dataset', eq: 'kubeletstatsreceiver.otel' },
              ],
            },
            { field: 'kubernetes.node.name', exists: true },
          ],
        },
        properties: expect.objectContaining({
          breakdown: ['orchestrator.cluster.name', 'kubernetes.node.name'],
          member_count: 3,
          host_summary: { os: ['Linux'], cloud_provider: ['gcp'] },
        }),
      })
    );
    expect(namespaces).toEqual(
      expect.objectContaining({
        id: 'k8s.namespaces:source-id',
        subtype: 'k8s.namespace',
        properties: expect.objectContaining({
          breakdown: ['orchestrator.cluster.name', 'kubernetes.namespace'],
          member_count: 20,
        }),
      })
    );
    expect(nodes?.evidence).toEqual([
      '3 nodes seen in the last hour, with no cluster name reported',
    ]);
    expect(namespaces?.evidence).toEqual([
      '20 namespaces seen in the last hour across 2 clusters, 4 with no cluster name reported',
    ]);
    expect(namespaces?.description).toContain('4 with no cluster name reported');
    expect(namespaces?.properties.list_query).toEqual(
      expect.stringContaining(
        '| STATS last_seen = MAX(@timestamp) BY orchestrator.cluster.name, kubernetes.namespace'
      )
    );
    for (const keyRowId of ['ecs.k8s_nodes', 'ecs.k8s_namespaces']) {
      expect(getKeyRowQuery(keyRowId)).not.toContain('orchestrator.cluster.name != ""');
    }
  });

  it('drops a type KI whose id is too long', () => {
    const result = foldWorkloadRows([{ kind: 'deployment', member_count: 1, cluster_count: 1 }], {
      ...foldContext,
      sourceId: 'x'.repeat(600),
    });

    expect(result.features).toEqual([]);
    expect(result.droppedRows.idTooLong).toBe(1);
  });
});

describe('host type KIs', () => {
  it('lists every host, including hosts that are also Kubernetes nodes', () => {
    const query = buildHostQuery(foldContext.sourceQuery);
    const [hosts] = foldHostRows(
      [{ member_count: 52, os: ['Linux'], cloud_provider: ['aws', 'gcp'] }],
      foldContext
    ).features;

    expect(query).not.toContain('node_name');
    expect(query).toContain('  BY host.name\n');
    expect(hosts).toEqual(
      expect.objectContaining({
        id: 'hosts:source-id',
        subtype: 'host',
        title: 'Hosts',
        evidence: ['52 hosts seen in the last hour'],
        filter: {
          and: [
            {
              or: [
                { field: 'data_stream.dataset', startsWith: 'system.' },
                { field: 'data_stream.dataset', eq: 'hostmetricsreceiver.otel' },
              ],
            },
            { field: 'host.name', exists: true },
          ],
        },
        properties: expect.objectContaining({
          breakdown: ['host.name'],
          member_count: 52,
          host_summary: { os: ['Linux'], cloud_provider: ['aws', 'gcp'] },
        }),
      })
    );
    expect(hosts?.description).not.toContain('outside');
  });
});

describe('service type KIs', () => {
  it('groups services and keeps ECS and OTel deployment environments', () => {
    const query = getKeyRowQuery('apm.service');
    const [feature] = foldServiceRows(
      [{ member_count: 2, environments: ['production', 'staging'] }],
      foldContext
    ).features;

    expect(query).toContain('COALESCE(service.environment, deployment.environment.name)');
    expect(query).not.toContain('TOP(');
    expect(feature).toEqual(
      expect.objectContaining({
        type: 'entity',
        subtype: 'service',
        id: 'services:source-id',
        title: 'Services',
        properties: expect.objectContaining({
          breakdown: ['service.name'],
          member_count: 2,
          environments: ['production', 'staging'],
        }),
      })
    );
    expect(feature?.properties).not.toHaveProperty('members');
    expect(feature?.properties.list_query).not.toContain('\n\n');
  });
});

describe('identifyMetricsEntities', () => {
  it('does not rewrite an excluded type KI', async () => {
    const harness = createHarness(
      [
        { columns: datasetColumns, values: datasetRows('generic.otel') },
        { columns: serviceColumns, values: [[1, 42, lastSeen, ['production']]] },
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
        { columns: serviceColumns, values: [[1, 42, lastSeen, ['production']]] },
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

  it('writes one KI per kind for a multi cluster source, with dataset evidence', async () => {
    const harness = createHarness([
      {
        columns: datasetColumns,
        values: datasetRows('kubernetes.pod', 'kubernetes.node', 'system.cpu'),
      },
      {
        columns: workloadColumns,
        values: [
          [3, 2, 6, lastSeen, 'deployment'],
          [1, 1, 3, lastSeen, 'daemonset'],
        ],
      },
      { columns: nodeColumns, values: [[3, 2, 15, lastSeen, ['Linux'], ['gcp', 'aws']]] },
      { columns: namespaceColumns, values: [[3, 2, 10, lastSeen]] },
      { columns: hostColumns, values: [[3, 30, lastSeen, ['Linux'], ['gcp']]] },
    ]);

    const result = await identifyMetricsEntities({
      esClient: harness.esClient,
      esql: sourceEsql,
      sourceId: 'kubernetes-source',
      kiClient: harness.kiClient,
      logger: harness.logger,
    });
    const features = getWrittenFeatures(harness.bulk);
    const byId = new Map(features.map((feature) => [feature.id, feature]));

    expect(result).toEqual(
      expect.objectContaining({
        handled: true,
        metricsEntitiesCount: 5,
        matchedEntityKeyRowsCount: 4,
      })
    );
    expect(features.map(({ id }) => id)).toEqual([
      'k8s.namespaces:kubernetes-source',
      'k8s.nodes:kubernetes-source',
      'hosts:kubernetes-source',
      'k8s.deployments:kubernetes-source',
      'k8s.daemonsets:kubernetes-source',
    ]);
    expect(byId.get('k8s.nodes:kubernetes-source')?.evidence).toEqual([
      '3 nodes seen in the last hour across 2 clusters',
      'data_stream.dataset: kubernetes.node',
    ]);
    expect(byId.get('hosts:kubernetes-source')?.evidence).toEqual([
      '3 hosts seen in the last hour',
      'data_stream.dataset: system.cpu',
    ]);
    expect(
      features.every(({ properties }) =>
        ['breakdown', 'entity_store_type', 'list_query', 'member_count'].every(
          (property) => property in properties
        )
      )
    ).toBe(true);
    expect(features.every(({ properties }) => !('members' in properties))).toBe(true);
    expect(features.every(({ filter }) => isConditionComplete(filter))).toBe(true);
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
      { columns: workloadColumns, values: [[1, 0, 3, lastSeen, 'deployment']] },
      { columns: namespaceColumns, values: [] },
      { columns: hostColumns, values: [[1, 42, lastSeen, ['Linux'], []]] },
      { columns: serviceColumns, values: [[1, 42, lastSeen, ['production']]] },
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
    const writtenFeatures = getWrittenFeatures(harness.bulk);
    expect(writtenFeatures.map(({ id }) => id)).toEqual([
      'hosts:mixed-metrics',
      'services:mixed-metrics',
      'k8s.deployments:mixed-metrics',
    ]);
    expect(writtenFeatures.every(({ filter }) => isConditionComplete(filter))).toBe(true);
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
      { columns: workloadColumns, values: [[1, 1, 3, lastSeen, 'deployment']] },
      { columns: nodeColumns, values: [[1, 1, 10, lastSeen, ['Linux'], ['gcp']]] },
      { columns: namespaceColumns, values: [[1, 1, 3, lastSeen]] },
      { columns: hostColumns, values: [[2, 43, lastSeen, ['Linux'], ['gcp']]] },
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
      'k8s.namespaces:edge-edot-source',
      'k8s.nodes:edge-edot-source',
      'hosts:edge-edot-source',
      'k8s.deployments:edge-edot-source',
    ]);
  });
});
