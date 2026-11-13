/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Finds one pet KI per long-lived workload from Kubernetes pod and OTel kubeletstats datasets.
import {
  MAX_ID_LENGTH,
  MAX_TITLE_LENGTH,
  type FeatureUpsert,
} from '@kbn/significant-events-schema';
import type { Condition } from '@kbn/streamlang';
import {
  clustersOf,
  formatDatasetList,
  KUBERNETES_POD_DATASETS,
  lastSeenOf,
  replicasOf,
  UNKNOWN_CLUSTER,
} from '../entity_rows/helpers';
import {
  createDroppedRows,
  droppedRowsCount,
  ENTITY_QUERY_LIMIT,
  type EntityFoldResult,
  type EsqlCell,
  type EsqlRow,
} from '../entity_rows/types';
import { buildKubernetesEntityId, getKubernetesEntityStoreType, type WorkloadKind } from './ids';

const workloadOwnerFields: Record<WorkloadKind, string> = {
  deployment: 'kubernetes.deployment.name',
  statefulset: 'kubernetes.statefulset.name',
  daemonset: 'kubernetes.daemonset.name',
  cronjob: 'kubernetes.cronjob.name',
};

const isWorkloadKind = (value: EsqlCell): value is WorkloadKind =>
  typeof value === 'string' && value in workloadOwnerFields;

interface WorkloadEntity {
  kind: WorkloadKind;
  namespace: string;
  name: string;
  ownerDerived: boolean;
  clusters: string[];
  replicas: number;
  lastSeen: string;
}

const derivedOwnerSources: Partial<
  Record<WorkloadKind, { stampedField: string; sourceField: string }>
> = {
  deployment: {
    stampedField: 'kubernetes.deployment.name',
    sourceField: 'kubernetes.replicaset.name',
  },
  cronjob: {
    stampedField: 'kubernetes.cronjob.name',
    sourceField: 'kubernetes.job.name',
  },
};

const buildWorkloadOwnerFilter = (
  target: Pick<WorkloadEntity, 'kind' | 'name' | 'ownerDerived'>,
  collidingNames: readonly string[]
): Condition => {
  const ownerField = workloadOwnerFields[target.kind];
  const stampedOwner: Condition = { field: ownerField, eq: target.name };
  const derivedOwner = derivedOwnerSources[target.kind];
  return target.ownerDerived && derivedOwner
    ? {
        or: [
          stampedOwner,
          {
            and: [
              { not: { field: derivedOwner.stampedField, exists: true } },
              { field: derivedOwner.sourceField, startsWith: `${target.name}-` },
              ...collidingNames.map(
                (name): Condition => ({
                  not: { field: derivedOwner.sourceField, startsWith: `${name}-` },
                })
              ),
            ],
          },
        ],
      }
    : stampedOwner;
};

export const buildWorkloadFilter = (
  target: Pick<WorkloadEntity, 'kind' | 'namespace' | 'name' | 'ownerDerived'>,
  workloads: ReadonlyArray<Pick<WorkloadEntity, 'kind' | 'namespace' | 'name'>>
): Condition => {
  const collidingNames = workloads
    .filter(
      (workload) =>
        workload.kind === target.kind &&
        workload.namespace === target.namespace &&
        workload.name !== target.name &&
        workload.name.startsWith(`${target.name}-`)
    )
    .map(({ name }) => name);
  return {
    and: [
      { field: 'kubernetes.namespace', eq: target.namespace },
      buildWorkloadOwnerFilter(target, collidingNames),
    ],
  };
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
                           kubernetes.replicaset.name),
       owner_derived = derived_deployment IS NOT NULL OR derived_cronjob IS NOT NULL`;

export const buildWorkloadQuery = (sourceQuery: string): string => `${sourceQuery}
| WHERE @timestamp > NOW() - 1 hour
    AND data_stream.dataset IN (${formatDatasetList(KUBERNETES_POD_DATASETS)})
    AND kubernetes.pod.uid IS NOT NULL
${WORKLOAD_OWNER_DERIVATION}
| WHERE kind IN ("deployment", "statefulset", "daemonset", "cronjob")
    AND workload IS NOT NULL
    AND kubernetes.namespace IS NOT NULL
| STATS replicas = COUNT_DISTINCT(kubernetes.pod.uid), last_seen = MAX(@timestamp)
  BY orchestrator.cluster.name, kubernetes.namespace, kind, workload, owner_derived
| STATS replicas = SUM(replicas), last_seen = MAX(last_seen),
        clusters = VALUES(orchestrator.cluster.name),
        owner_derived = MAX(CASE(owner_derived, 1, 0))
  BY kubernetes.namespace, kind, workload
| SORT replicas DESC, kubernetes.namespace, workload
| LIMIT ${ENTITY_QUERY_LIMIT}`;

export const foldWorkloadRows = (rows: EsqlRow[]): EntityFoldResult => {
  const droppedRows = createDroppedRows();
  let unknownClusterRows = 0;

  const workloads = rows.flatMap((row): WorkloadEntity[] => {
    const namespace = row['kubernetes.namespace'];
    const kind = row.kind;
    const name = row.workload;
    if (!isWorkloadKind(kind) || typeof name !== 'string') {
      return [];
    }
    if (typeof namespace !== 'string') {
      return [];
    }

    const clusters = clustersOf(row.clusters);
    if (clusters.includes(UNKNOWN_CLUSTER)) {
      unknownClusterRows += 1;
    }

    return [
      {
        kind,
        namespace,
        name,
        ownerDerived: row.owner_derived === true || row.owner_derived === 1,
        clusters,
        replicas: replicasOf(row),
        lastSeen: lastSeenOf(row),
      },
    ];
  });

  const features = workloads.flatMap((workload): FeatureUpsert[] => {
    const id = buildKubernetesEntityId(workload);
    if (id.length > MAX_ID_LENGTH || workload.name.length > MAX_TITLE_LENGTH) {
      droppedRows.idTooLong += 1;
      return [];
    }
    const ownerField = workloadOwnerFields[workload.kind];
    return [
      {
        type: 'entity',
        subtype: getKubernetesEntityStoreType(workload.kind),
        id,
        title: workload.name,
        description: `Kubernetes ${workload.kind} ${workload.name} in namespace ${workload.namespace}.`,
        filter: buildWorkloadFilter(workload, workloads),
        properties: {
          name: workload.name,
          identity: {
            'kubernetes.namespace': workload.namespace,
            [ownerField]: workload.name,
          },
          grain: 'namespace',
          breakdown: ['orchestrator.cluster.name'],
          entity_store_type: getKubernetesEntityStoreType(workload.kind),
          clusters: workload.clusters,
          replicas: workload.replicas,
          last_seen: workload.lastSeen,
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
    unknownClusterRows,
  };
};
