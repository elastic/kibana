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
import { formatDatasetList, KUBERNETES_NODE_DATASETS, stringsOf } from '../entity_rows/helpers';
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
    AND orchestrator.cluster.name IS NOT NULL
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
  { sourceQuery }: EntityFoldContext
): EntityFoldResult => {
  const droppedRows = createDroppedRows();
  const conceptsByCluster = new Map<
    string,
    {
      scale: number;
      members: string[];
      os: Set<string>;
      cloudProviders: Set<string>;
    }
  >();
  for (const row of rows) {
    const cluster = row['orchestrator.cluster.name'];
    if (typeof cluster !== 'string') {
      droppedRows.nullCluster += 1;
      continue;
    }
    const concept = conceptsByCluster.get(cluster) ?? {
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
    conceptsByCluster.set(cluster, concept);
  }

  const features = [...conceptsByCluster].flatMap(([cluster, concept]): FeatureUpsert[] => {
    const id = `k8s.nodes:${cluster}`;
    const title = `Kubernetes nodes of ${cluster}`;
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
          scope: cluster,
          scale: concept.scale,
          breakdownFields: ['kubernetes.node.name'],
          members,
        }),
        filter: { field: 'orchestrator.cluster.name', eq: cluster },
        properties: {
          breakdown: ['kubernetes.node.name'],
          entity_store_type: KUBERNETES_ENTITY_STORE_TYPES.node,
          scale: concept.scale,
          members,
          list_query: buildConceptListQuery({
            sourceQuery,
            cluster,
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
