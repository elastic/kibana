/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Finds one workload type KI per kind and source from Kubernetes pod and OTel kubeletstats data.
import {
  MAX_ID_LENGTH,
  MAX_TITLE_LENGTH,
  type FeatureUpsert,
} from '@kbn/significant-events-schema';
import type { Condition } from '@kbn/streamlang';
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
  type EsqlCell,
  type EsqlRow,
} from '../entity_rows/types';
import {
  buildConceptCountLine,
  buildConceptListQuery,
  buildInfrastructureConceptDescription,
  type InfrastructureConcept,
} from './concepts';
import { getKubernetesEntityStoreType, type WorkloadKind } from './ids';

const WORKLOAD_TYPES: Record<
  WorkloadKind,
  {
    plural: Extract<
      InfrastructureConcept,
      'deployments' | 'statefulsets' | 'daemonsets' | 'cronjobs'
    >;
    ownerField: string;
  }
> = {
  deployment: {
    plural: 'deployments',
    ownerField: 'kubernetes.deployment.name',
  },
  statefulset: {
    plural: 'statefulsets',
    ownerField: 'kubernetes.statefulset.name',
  },
  daemonset: {
    plural: 'daemonsets',
    ownerField: 'kubernetes.daemonset.name',
  },
  cronjob: {
    plural: 'cronjobs',
    ownerField: 'kubernetes.cronjob.name',
  },
};

const isWorkloadKind = (value: EsqlCell): value is WorkloadKind =>
  typeof value === 'string' && value in WORKLOAD_TYPES;

const WORKLOAD_TYPE_FILTERS: Record<WorkloadKind, Condition> = {
  deployment: {
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
  statefulset: { field: 'kubernetes.statefulset.name', exists: true },
  daemonset: { field: 'kubernetes.daemonset.name', exists: true },
  // Streamlang has no regex operator, so this also includes plain Jobs.
  cronjob: {
    or: [
      { field: 'kubernetes.cronjob.name', exists: true },
      { field: 'kubernetes.job.name', exists: true },
    ],
  },
};

// ReplicaSet hashes and Job timestamp suffixes are removed to recover long-lived owners.
const WORKLOAD_OWNER_DERIVATION = `| EVAL h = \`kubernetes.labels.pod-template-hash\`,
       rs = kubernetes.replicaset.name,
       derived_deployment = CASE(
         kubernetes.deployment.name IS NULL AND h IS NOT NULL AND rs IS NOT NULL
           AND ENDS_WITH(rs, CONCAT("-", h)),
         SUBSTRING(rs, 1, LENGTH(rs) - LENGTH(h) - 1)),
       derived_cronjob = CASE(
         kubernetes.cronjob.name IS NULL
           AND kubernetes.job.name RLIKE ".*-[0-9]{8,}",
         REPLACE(kubernetes.job.name, "-[0-9]{8,}$", ""))
| EVAL kind = CASE(COALESCE(kubernetes.deployment.name, derived_deployment) IS NOT NULL,
                   "deployment",
                   kubernetes.statefulset.name IS NOT NULL, "statefulset",
                   kubernetes.daemonset.name   IS NOT NULL, "daemonset",
                   COALESCE(kubernetes.cronjob.name, derived_cronjob) IS NOT NULL, "cronjob",
                   kubernetes.job.name         IS NOT NULL, "job",
                   kubernetes.replicaset.name  IS NOT NULL, "replicaset", NULL),
       workload = COALESCE(kubernetes.deployment.name, derived_deployment,
                           kubernetes.statefulset.name, kubernetes.daemonset.name,
                           kubernetes.cronjob.name, derived_cronjob, kubernetes.job.name,
                           kubernetes.replicaset.name)`;

export const buildWorkloadQuery = (sourceQuery: string): string => `${sourceQuery}
| WHERE @timestamp > NOW() - 1 hour
    AND data_stream.dataset IN (${formatDatasetList(KUBERNETES_POD_DATASETS)})
    AND kubernetes.pod.uid IS NOT NULL
${WORKLOAD_OWNER_DERIVATION}
| WHERE kind IN ("deployment", "statefulset", "daemonset", "cronjob")
    AND workload IS NOT NULL
    AND kubernetes.namespace IS NOT NULL
| STATS replicas = COUNT_DISTINCT(kubernetes.pod.uid), last_seen = MAX(@timestamp)
  BY orchestrator.cluster.name, kubernetes.namespace, kind, workload
| STATS member_count = COUNT(*), cluster_count = COUNT_DISTINCT(orchestrator.cluster.name),
        unclustered_count = COUNT(*) WHERE orchestrator.cluster.name IS NULL,
        activity = SUM(replicas), last_seen = MAX(last_seen)
  BY kind
| SORT activity DESC
| LIMIT ${ENTITY_QUERY_LIMIT}`;

const getWorkloadBreakdown = (kind: WorkloadKind): string[] => [
  'orchestrator.cluster.name',
  'kubernetes.namespace',
  WORKLOAD_TYPES[kind].ownerField,
];

const buildWorkloadListQuery = ({
  sourceQuery,
  kind,
}: {
  sourceQuery: string;
  kind: WorkloadKind;
}): string =>
  buildConceptListQuery({
    sourceQuery,
    datasetCondition: `data_stream.dataset IN (${formatDatasetList(
      KUBERNETES_POD_DATASETS
    )}) AND kubernetes.pod.uid IS NOT NULL`,
    additionalPipeline: `${WORKLOAD_OWNER_DERIVATION}
| WHERE kind == "${kind}" AND workload IS NOT NULL AND kubernetes.namespace IS NOT NULL
| EVAL \`${WORKLOAD_TYPES[kind].ownerField}\` = workload`,
    breakdownFields: getWorkloadBreakdown(kind),
  });

export const foldWorkloadRows = (
  rows: EsqlRow[],
  { sourceQuery, sourceId }: EntityFoldContext
): EntityFoldResult => {
  const droppedRows = createDroppedRows();
  const features = rows.flatMap((row): FeatureUpsert[] => {
    const kind = row.kind;
    if (!isWorkloadKind(kind)) {
      return [];
    }
    const { plural } = WORKLOAD_TYPES[kind];
    const id = `k8s.${plural}:${sourceId}`;
    const title = `Kubernetes ${plural}`;
    if (id.length > MAX_ID_LENGTH || title.length > MAX_TITLE_LENGTH) {
      droppedRows.idTooLong += 1;
      return [];
    }
    const memberCount = typeof row.member_count === 'number' ? row.member_count : 0;
    const clusterCount = typeof row.cluster_count === 'number' ? row.cluster_count : 0;
    const unclusteredCount = typeof row.unclustered_count === 'number' ? row.unclustered_count : 0;
    const breakdown = getWorkloadBreakdown(kind);
    const entityStoreType = getKubernetesEntityStoreType(kind);
    return [
      {
        type: 'infrastructure',
        subtype: entityStoreType,
        id,
        title,
        description: buildInfrastructureConceptDescription({
          concept: plural,
          memberCount,
          clusterCount,
          unclusteredCount,
          breakdownFields: breakdown,
        }),
        evidence: [
          buildConceptCountLine({ concept: plural, memberCount, clusterCount, unclusteredCount }),
        ],
        filter: buildTypeFilter(
          buildDatasetFilter(KUBERNETES_POD_DATASETS),
          WORKLOAD_TYPE_FILTERS[kind]
        ),
        properties: {
          breakdown,
          entity_store_type: entityStoreType,
          member_count: memberCount,
          cluster_count: clusterCount,
          list_query: buildWorkloadListQuery({ sourceQuery, kind }),
          origin: 'metrics',
          key_row: 'ecs.k8s_workload',
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
