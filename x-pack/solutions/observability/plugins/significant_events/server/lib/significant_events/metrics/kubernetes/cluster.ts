/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MAX_ID_LENGTH,
  MAX_TITLE_LENGTH,
  type FeatureUpsert,
} from '@kbn/significant-events-schema';
import {
  formatDatasetList,
  KUBERNETES_CLUSTER_DATASETS,
  lastSeenOf,
  replicasOf,
} from '../entity_rows/helpers';
import {
  createDroppedRows,
  droppedRowsCount,
  ENTITY_QUERY_LIMIT,
  type EntityFoldResult,
  type EsqlRow,
} from '../entity_rows/types';
import { buildKubernetesEntityId, KUBERNETES_ENTITY_STORE_TYPES } from './ids';

// Finds one pet KI per cluster from Kubernetes pod, node, and OTel kubeletstats datasets.
export const buildClusterQuery = (sourceQuery: string): string => `${sourceQuery}
| WHERE @timestamp > NOW() - 1 hour
    AND data_stream.dataset IN (${formatDatasetList(KUBERNETES_CLUSTER_DATASETS)})
| STATS nodes = COUNT_DISTINCT(kubernetes.node.name),
        replicas = COUNT_DISTINCT(kubernetes.pod.uid),
        last_seen = MAX(@timestamp)
  BY orchestrator.cluster.name
| SORT replicas DESC, orchestrator.cluster.name
| LIMIT ${ENTITY_QUERY_LIMIT}`;

export const foldClusterRows = (rows: EsqlRow[]): EntityFoldResult => {
  const droppedRows = createDroppedRows();
  const features = rows.flatMap((row): FeatureUpsert[] => {
    const cluster = row['orchestrator.cluster.name'];
    if (typeof cluster !== 'string') {
      droppedRows.nullCluster += 1;
      return [];
    }
    const id = buildKubernetesEntityId({ kind: 'cluster', name: cluster });
    if (id.length > MAX_ID_LENGTH || cluster.length > MAX_TITLE_LENGTH) {
      droppedRows.idTooLong += 1;
      return [];
    }
    return [
      {
        type: 'entity',
        subtype: KUBERNETES_ENTITY_STORE_TYPES.cluster,
        id,
        title: cluster,
        description: `Kubernetes cluster ${cluster}.`,
        filter: { field: 'orchestrator.cluster.name', eq: cluster },
        properties: {
          name: cluster,
          identity: { 'orchestrator.cluster.name': cluster },
          entity_store_type: KUBERNETES_ENTITY_STORE_TYPES.cluster,
          nodes: typeof row.nodes === 'number' ? row.nodes : 0,
          replicas: replicasOf(row),
          last_seen: lastSeenOf(row),
          origin: 'metrics',
          key_row: 'ecs.k8s_cluster',
        },
        confidence: 100,
      },
    ];
  });
  return {
    features,
    droppedIncompleteRowsCount: droppedRowsCount(droppedRows),
    droppedRows,
    unknownClusterRows: 0,
  };
};
