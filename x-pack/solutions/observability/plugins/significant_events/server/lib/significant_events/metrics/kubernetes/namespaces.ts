/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Finds one namespace type KI per cluster from Kubernetes pod and OTel kubeletstats datasets.
import {
  MAX_ID_LENGTH,
  MAX_TITLE_LENGTH,
  type FeatureUpsert,
} from '@kbn/significant-events-schema';
import { formatDatasetList, KUBERNETES_POD_DATASETS, stringsOf } from '../entity_rows/helpers';
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

export const buildNamespaceQuery = (sourceQuery: string): string => `${sourceQuery}
| WHERE @timestamp > NOW() - 1 hour
    AND data_stream.dataset IN (${formatDatasetList(KUBERNETES_POD_DATASETS)})
    AND kubernetes.pod.uid IS NOT NULL
    AND orchestrator.cluster.name IS NOT NULL
    AND kubernetes.namespace IS NOT NULL
| STATS activity = COUNT(*), last_seen = MAX(@timestamp)
  BY orchestrator.cluster.name, kubernetes.namespace
| STATS scale = COUNT(*), activity = SUM(activity), last_seen = MAX(last_seen),
        members = TOP(kubernetes.namespace, 50, "asc")
  BY orchestrator.cluster.name
| SORT activity DESC
| LIMIT ${ENTITY_QUERY_LIMIT}`;

export const foldNamespaceRows = (
  rows: EsqlRow[],
  { sourceQuery }: EntityFoldContext
): EntityFoldResult => {
  const droppedRows = createDroppedRows();
  const conceptsByCluster = new Map<string, { scale: number; members: string[] }>();
  for (const row of rows) {
    const cluster = row['orchestrator.cluster.name'];
    if (typeof cluster !== 'string') {
      droppedRows.nullCluster += 1;
      continue;
    }
    const concept = conceptsByCluster.get(cluster) ?? {
      scale: 0,
      members: [],
    };
    concept.scale =
      typeof row.scale === 'number' ? Math.max(concept.scale, row.scale) : concept.scale;
    // The description lists at most 50 members before directing readers to the live query.
    concept.members = stringsOf(row.members).slice(0, 50);
    conceptsByCluster.set(cluster, concept);
  }

  const features = [...conceptsByCluster].flatMap(([cluster, concept]): FeatureUpsert[] => {
    const id = `k8s.namespaces:${cluster}`;
    const title = `Kubernetes namespaces of ${cluster}`;
    if (id.length > MAX_ID_LENGTH || title.length > MAX_TITLE_LENGTH) {
      droppedRows.idTooLong += 1;
      return [];
    }
    const members = concept.members;
    return [
      {
        type: 'infrastructure',
        subtype: KUBERNETES_ENTITY_STORE_TYPES.namespace,
        id,
        title,
        description: buildInfrastructureConceptDescription({
          concept: 'namespaces',
          scope: cluster,
          scale: concept.scale,
          breakdownFields: ['kubernetes.namespace'],
          members,
        }),
        filter: { field: 'orchestrator.cluster.name', eq: cluster },
        properties: {
          breakdown: ['kubernetes.namespace'],
          entity_store_type: KUBERNETES_ENTITY_STORE_TYPES.namespace,
          scale: concept.scale,
          members,
          list_query: buildConceptListQuery({
            sourceQuery,
            cluster,
            datasetCondition: `data_stream.dataset IN (${formatDatasetList(
              KUBERNETES_POD_DATASETS
            )})`,
            breakdownFields: ['kubernetes.namespace'],
          }),
          origin: 'metrics',
          key_row: 'ecs.k8s_namespaces',
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
