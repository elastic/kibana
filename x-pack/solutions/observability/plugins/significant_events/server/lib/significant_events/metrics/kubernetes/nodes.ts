/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Finds one node type KI per source from Kubernetes node and OTel kubeletstats datasets.
import {
  MAX_ID_LENGTH,
  MAX_TITLE_LENGTH,
  type FeatureUpsert,
} from '@kbn/significant-events-schema';
import {
  buildDatasetFilter,
  buildTypeFilter,
  formatDatasetList,
  KUBERNETES_NODE_DATASETS,
  stringsOf,
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

const NODE_BREAKDOWN = ['orchestrator.cluster.name', 'kubernetes.node.name'];

export const buildNodeQuery = (sourceQuery: string): string => `${sourceQuery}
| WHERE @timestamp > NOW() - 1 hour
    AND data_stream.dataset IN (${formatDatasetList(KUBERNETES_NODE_DATASETS)})
    AND kubernetes.node.name IS NOT NULL
| STATS activity = COUNT(*), last_seen = MAX(@timestamp),
        os = VALUES(host.os.name), cloud_provider = VALUES(cloud.provider)
  BY orchestrator.cluster.name, kubernetes.node.name
| STATS member_count = COUNT(*), cluster_count = COUNT_DISTINCT(orchestrator.cluster.name),
        unclustered_count = COUNT(*) WHERE orchestrator.cluster.name IS NULL,
        activity = SUM(activity), last_seen = MAX(last_seen),
        os = VALUES(os), cloud_provider = VALUES(cloud_provider)
| WHERE member_count > 0
| LIMIT ${ENTITY_QUERY_LIMIT}`;

export const foldNodeRows = (
  rows: EsqlRow[],
  { sourceQuery, sourceId }: EntityFoldContext
): EntityFoldResult => {
  const droppedRows = createDroppedRows();
  const row = rows[0];
  const id = `k8s.nodes:${sourceId}`;
  const title = 'Kubernetes nodes';
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
  const unclusteredCount = typeof row.unclustered_count === 'number' ? row.unclustered_count : 0;
  const features: FeatureUpsert[] = [
    {
      type: 'infrastructure',
      subtype: KUBERNETES_ENTITY_STORE_TYPES.node,
      id,
      title,
      description: buildInfrastructureConceptDescription({
        concept: 'nodes',
        memberCount,
        clusterCount,
        unclusteredCount,
        breakdownFields: NODE_BREAKDOWN,
      }),
      evidence: [
        buildConceptCountLine({ concept: 'nodes', memberCount, clusterCount, unclusteredCount }),
      ],
      filter: buildTypeFilter(buildDatasetFilter(KUBERNETES_NODE_DATASETS), {
        field: 'kubernetes.node.name',
        exists: true,
      }),
      properties: {
        breakdown: NODE_BREAKDOWN,
        entity_store_type: KUBERNETES_ENTITY_STORE_TYPES.node,
        member_count: memberCount,
        cluster_count: clusterCount,
        list_query: buildConceptListQuery({
          sourceQuery,
          datasetCondition: `data_stream.dataset IN (${formatDatasetList(
            KUBERNETES_NODE_DATASETS
          )}) AND kubernetes.node.name IS NOT NULL`,
          breakdownFields: NODE_BREAKDOWN,
        }),
        host_summary: {
          os: stringsOf(row.os),
          cloud_provider: stringsOf(row.cloud_provider),
        },
        origin: 'metrics',
        key_row: 'ecs.k8s_nodes',
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
