/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Finds one node type KI per cluster from Kubernetes node and OTel kubeletstats datasets.
import {
  MAX_ID_LENGTH,
  MAX_TITLE_LENGTH,
  type FeatureUpsert,
} from '@kbn/significant-events-schema';
import {
  buildDatasetFilter,
  buildScopedFilter,
  formatDatasetList,
  KUBERNETES_NODE_DATASETS,
  stringsOf,
  type ClusterScope,
} from '../entity_rows/helpers';
import {
  createDroppedRows,
  droppedRowsCount,
  ENTITY_QUERY_LIMIT,
  type EntityFoldContext,
  type EntityFoldResult,
  type EsqlRow,
} from '../entity_rows/types';
import { buildConceptListQuery, buildInfrastructureConceptDescription } from './concepts';
import { KUBERNETES_ENTITY_STORE_TYPES } from './ids';

export const buildNodeQuery = (sourceQuery: string): string => `${sourceQuery}
| WHERE @timestamp > NOW() - 1 hour
    AND data_stream.dataset IN (${formatDatasetList(KUBERNETES_NODE_DATASETS)})
    AND kubernetes.node.name IS NOT NULL
| STATS activity = COUNT(*), last_seen = MAX(@timestamp),
        os = VALUES(host.os.name), cloud_provider = VALUES(cloud.provider)
  BY orchestrator.cluster.name, kubernetes.node.name
| STATS scale = COUNT(*), activity = SUM(activity), last_seen = MAX(last_seen),
        members = TOP(kubernetes.node.name, 50, "asc"),
        os = VALUES(os), cloud_provider = VALUES(cloud_provider)
  BY orchestrator.cluster.name
| SORT activity DESC
| LIMIT ${ENTITY_QUERY_LIMIT}`;

export const foldNodeRows = (
  rows: EsqlRow[],
  { sourceQuery, sourceId }: EntityFoldContext
): EntityFoldResult => {
  const droppedRows = createDroppedRows();
  const conceptsByCluster = new Map<
    string,
    {
      cluster?: string;
      scale: number;
      members: string[];
      os: Set<string>;
      cloudProviders: Set<string>;
    }
  >();
  for (const row of rows) {
    const clusterValue = row['orchestrator.cluster.name'];
    const cluster =
      typeof clusterValue === 'string' && clusterValue.length > 0 ? clusterValue : undefined;
    const clusterKey = cluster === undefined ? 'source' : `cluster:${cluster}`;
    const concept = conceptsByCluster.get(clusterKey) ?? {
      cluster,
      scale: 0,
      members: [],
      os: new Set<string>(),
      cloudProviders: new Set<string>(),
    };
    concept.scale =
      typeof row.scale === 'number' ? Math.max(concept.scale, row.scale) : concept.scale;
    // The description lists at most 50 members before directing readers to the live query.
    concept.members = stringsOf(row.members).slice(0, 50);
    stringsOf(row.os).forEach((value) => concept.os.add(value));
    stringsOf(row.cloud_provider).forEach((value) => concept.cloudProviders.add(value));
    conceptsByCluster.set(clusterKey, concept);
  }

  const features = [...conceptsByCluster.values()].flatMap((concept): FeatureUpsert[] => {
    const { cluster } = concept;
    const clusterScope: Exclude<ClusterScope, undefined> =
      cluster === undefined ? { missing: true } : { name: cluster };
    const id = `k8s.nodes:${cluster ?? sourceId}`;
    const title = cluster
      ? `Kubernetes nodes of ${cluster}`
      : 'Kubernetes nodes (cluster not reported)';
    if (id.length > MAX_ID_LENGTH || title.length > MAX_TITLE_LENGTH) {
      droppedRows.idTooLong += 1;
      return [];
    }
    const members = concept.members;
    return [
      {
        type: 'infrastructure',
        subtype: KUBERNETES_ENTITY_STORE_TYPES.node,
        id,
        title,
        description: buildInfrastructureConceptDescription({
          concept: 'nodes',
          scope: cluster ?? sourceId,
          scale: concept.scale,
          breakdownFields: ['kubernetes.node.name'],
          members,
          clusterMissing: cluster === undefined,
        }),
        filter: buildScopedFilter(clusterScope, buildDatasetFilter(KUBERNETES_NODE_DATASETS), {
          field: 'kubernetes.node.name',
          exists: true,
        }),
        properties: {
          breakdown: ['kubernetes.node.name'],
          entity_store_type: KUBERNETES_ENTITY_STORE_TYPES.node,
          scale: concept.scale,
          members,
          list_query: buildConceptListQuery({
            sourceQuery,
            clusterScope,
            datasetCondition: `data_stream.dataset IN (${formatDatasetList(
              KUBERNETES_NODE_DATASETS
            )})`,
            breakdownFields: ['kubernetes.node.name'],
          }),
          host_summary: {
            os: [...concept.os].sort(),
            cloud_provider: [...concept.cloudProviders].sort(),
          },
          origin: 'metrics',
          key_row: 'ecs.k8s_nodes',
        },
        confidence: 100,
      },
    ];
  });

  return {
    features,
    droppedIncompleteRowsCount: droppedRowsCount(droppedRows),
    droppedRows,
  };
};
