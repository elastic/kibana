/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Finds one namespace type KI per source from Kubernetes pod and OTel kubeletstats datasets.
import {
  MAX_ID_LENGTH,
  MAX_TITLE_LENGTH,
  type FeatureUpsert,
} from '@kbn/significant-events-schema';
import {
  buildDatasetFilter,
  buildTypeFilter,
  formatDatasetList,
  KUBERNETES_POD_DATASETS,
} from '../entity_rows/helpers';
import {
  createDroppedRows,
  droppedRowsCount,
  ENTITY_QUERY_LIMIT,
  type EntityFoldContext,
  type EntityFoldResult,
  type EsqlRow,
} from '../entity_rows/types';
import {
  buildConceptCountLine,
  buildConceptListQuery,
  buildInfrastructureConceptDescription,
} from './concepts';
import { KUBERNETES_ENTITY_STORE_TYPES } from './ids';

// A namespace name is only unique inside its cluster.
const NAMESPACE_BREAKDOWN = ['orchestrator.cluster.name', 'kubernetes.namespace'];

export const buildNamespaceQuery = (sourceQuery: string): string => `${sourceQuery}
| WHERE @timestamp > NOW() - 1 hour
    AND data_stream.dataset IN (${formatDatasetList(KUBERNETES_POD_DATASETS)})
    AND kubernetes.pod.uid IS NOT NULL
    AND kubernetes.namespace IS NOT NULL
| STATS activity = COUNT(*), last_seen = MAX(@timestamp)
  BY orchestrator.cluster.name, kubernetes.namespace
| STATS member_count = COUNT(*), cluster_count = COUNT_DISTINCT(orchestrator.cluster.name),
        activity = SUM(activity), last_seen = MAX(last_seen)
| WHERE member_count > 0
| LIMIT ${ENTITY_QUERY_LIMIT}`;

export const foldNamespaceRows = (
  rows: EsqlRow[],
  { sourceQuery, sourceId }: EntityFoldContext
): EntityFoldResult => {
  const droppedRows = createDroppedRows();
  const row = rows[0];
  const id = `k8s.namespaces:${sourceId}`;
  const title = 'Kubernetes namespaces';
  if (!row || id.length > MAX_ID_LENGTH || title.length > MAX_TITLE_LENGTH) {
    droppedRows.idTooLong += row ? 1 : 0;
    return {
      features: [],
      droppedIncompleteRowsCount: droppedRowsCount(droppedRows),
      droppedRows,
    };
  }
  const memberCount = typeof row.member_count === 'number' ? row.member_count : 0;
  const clusterCount = typeof row.cluster_count === 'number' ? row.cluster_count : 0;
  const features: FeatureUpsert[] = [
    {
      type: 'infrastructure',
      subtype: KUBERNETES_ENTITY_STORE_TYPES.namespace,
      id,
      title,
      description: buildInfrastructureConceptDescription({
        concept: 'namespaces',
        memberCount,
        clusterCount,
        breakdownFields: NAMESPACE_BREAKDOWN,
      }),
      evidence: [
        buildConceptCountLine({
          concept: 'namespaces',
          memberCount,
          clusterCount,
        }),
      ],
      filter: buildTypeFilter(buildDatasetFilter(KUBERNETES_POD_DATASETS), {
        field: 'kubernetes.namespace',
        exists: true,
      }),
      properties: {
        breakdown: NAMESPACE_BREAKDOWN,
        entity_store_type: KUBERNETES_ENTITY_STORE_TYPES.namespace,
        member_count: memberCount,
        cluster_count: clusterCount,
        list_query: buildConceptListQuery({
          sourceQuery,
          datasetCondition: `data_stream.dataset IN (${formatDatasetList(
            KUBERNETES_POD_DATASETS
          )}) AND kubernetes.pod.uid IS NOT NULL AND kubernetes.namespace IS NOT NULL`,
          breakdownFields: NAMESPACE_BREAKDOWN,
        }),
        origin: 'metrics',
        key_row: 'ecs.k8s_namespaces',
      },
      confidence: 100,
    },
  ];
  return {
    features,
    droppedIncompleteRowsCount: droppedRowsCount(droppedRows),
    droppedRows,
  };
};
