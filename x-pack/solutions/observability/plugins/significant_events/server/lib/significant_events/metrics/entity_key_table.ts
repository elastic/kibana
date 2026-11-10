/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FeatureUpsert } from '@kbn/significant-events-schema';

export type EsqlCell = string | number | boolean | null;
export type EsqlRow = Readonly<Record<string, EsqlCell>>;

export interface EntityKeyRow {
  id: string;
  family: string;
  datasets: readonly string[];
  subtype: 'k8s_workload' | 'k8s_node';
  buildQuery: (tsPrefix: string) => string;
  toEntity: (row: EsqlRow) => FeatureUpsert | undefined;
}

export const getDataStreamFamily = (dataStream: string): string | undefined => {
  const match = /^(?:[^:]+:)?[^-]+-([^-]+)-/.exec(dataStream);
  return match?.[1].split('.')[0];
};

type WorkloadKind = 'deployment' | 'statefulset' | 'daemonset' | 'replicaset';

const workloadOwnerFields: Record<WorkloadKind, string> = {
  deployment: 'kubernetes.deployment.name',
  statefulset: 'kubernetes.statefulset.name',
  daemonset: 'kubernetes.daemonset.name',
  replicaset: 'kubernetes.replicaset.name',
};

const isWorkloadKind = (value: EsqlCell): value is WorkloadKind =>
  value === 'deployment' ||
  value === 'statefulset' ||
  value === 'daemonset' ||
  value === 'replicaset';

const buildWorkloadQuery = (tsPrefix: string): string => `${tsPrefix}
| WHERE TRANGE(1 hour) AND data_stream.dataset == "kubernetes.pod"
| EVAL kind = CASE(kubernetes.deployment.name IS NOT NULL, "deployment",
                   kubernetes.statefulset.name IS NOT NULL, "statefulset",
                   kubernetes.daemonset.name   IS NOT NULL, "daemonset",
                   kubernetes.replicaset.name  IS NOT NULL, "replicaset", NULL),
       workload = COALESCE(kubernetes.deployment.name, kubernetes.statefulset.name,
                           kubernetes.daemonset.name, kubernetes.replicaset.name)
| WHERE workload IS NOT NULL
| STATS replicas = COUNT_DISTINCT(kubernetes.pod.uid), last_seen = MAX(@timestamp)
  BY orchestrator.cluster.name, kubernetes.namespace, kind, workload
| SORT replicas DESC | LIMIT 501`;

const toWorkloadEntity = (row: EsqlRow): FeatureUpsert | undefined => {
  const cluster = row['orchestrator.cluster.name'];
  const namespace = row['kubernetes.namespace'];
  const kind = row.kind;
  const workload = row.workload;
  if (
    typeof cluster !== 'string' ||
    typeof namespace !== 'string' ||
    !isWorkloadKind(kind) ||
    typeof workload !== 'string'
  ) {
    return undefined;
  }

  const ownerField = workloadOwnerFields[kind];
  return {
    type: 'entity',
    subtype: 'k8s_workload',
    id: `${cluster}/${namespace}/${kind}/${workload}`,
    title: workload,
    description: `Kubernetes ${kind} ${workload} in namespace ${namespace}, cluster ${cluster}.`,
    filter: {
      and: [
        { field: 'orchestrator.cluster.name', eq: cluster },
        { field: 'kubernetes.namespace', eq: namespace },
        { field: ownerField, eq: workload },
      ],
    },
    properties: {
      identity: {
        'orchestrator.cluster.name': cluster,
        'kubernetes.namespace': namespace,
        [ownerField]: workload,
      },
      replicas: row.replicas,
      last_seen: row.last_seen,
      origin: 'metrics',
      key_row: 'ecs.k8s_workload',
    },
    confidence: 100,
  };
};

const buildNodeQuery = (tsPrefix: string): string => `${tsPrefix}
| WHERE TRANGE(1 hour) AND data_stream.dataset == "kubernetes.node"
| STATS last_seen = MAX(@timestamp)
  BY orchestrator.cluster.name, kubernetes.node.name`;

const toNodeEntity = (row: EsqlRow): FeatureUpsert | undefined => {
  const cluster = row['orchestrator.cluster.name'];
  const node = row['kubernetes.node.name'];
  if (typeof cluster !== 'string' || typeof node !== 'string') {
    return undefined;
  }

  return {
    type: 'entity',
    subtype: 'k8s_node',
    id: `${cluster}/${node}`,
    title: node,
    description: `Kubernetes node ${node}, cluster ${cluster}.`,
    filter: {
      and: [
        { field: 'orchestrator.cluster.name', eq: cluster },
        { field: 'kubernetes.node.name', eq: node },
      ],
    },
    properties: {
      identity: {
        'orchestrator.cluster.name': cluster,
        'kubernetes.node.name': node,
      },
      last_seen: row.last_seen,
      origin: 'metrics',
      key_row: 'ecs.k8s_node',
    },
    confidence: 100,
  };
};

export const ENTITY_KEY_TABLE: readonly EntityKeyRow[] = [
  {
    id: 'ecs.k8s_workload',
    family: 'kubernetes',
    datasets: ['kubernetes.pod'],
    subtype: 'k8s_workload',
    buildQuery: buildWorkloadQuery,
    toEntity: toWorkloadEntity,
  },
  {
    id: 'ecs.k8s_node',
    family: 'kubernetes',
    datasets: ['kubernetes.node'],
    subtype: 'k8s_node',
    buildQuery: buildNodeQuery,
    toEntity: toNodeEntity,
  },
];
