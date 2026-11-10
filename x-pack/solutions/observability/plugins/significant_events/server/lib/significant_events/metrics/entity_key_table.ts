/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FeatureUpsert } from '@kbn/significant-events-schema';

export type EsqlCell = string | number | boolean | null;
export type EsqlRow = Readonly<Record<string, EsqlCell>>;

export interface EntityFoldResult {
  features: FeatureUpsert[];
  droppedIncompleteRowsCount: number;
}

export interface EntityKeyRow {
  id: string;
  family: string;
  datasets: readonly string[];
  subtype: 'k8s_workload' | 'k8s_node';
  buildQuery: (tsPrefix: string) => string;
  foldRows: (rows: EsqlRow[]) => EntityFoldResult;
}

export const getDataStreamFamily = (dataStream: string): string | undefined => {
  const match = /^(?:[^:]+:)?[^-]+-([^-]+)-/.exec(dataStream);
  return match?.[1].split('.')[0];
};

/** Mirrors Entity Inventory entity types; only k8s.deployment is defined there today (#303101). */
export const KUBERNETES_ENTITY_STORE_TYPES = {
  deployment: 'k8s.deployment',
  statefulset: 'k8s.statefulset',
  daemonset: 'k8s.daemonset',
  cronjob: 'k8s.cronjob',
  job: 'k8s.job',
  replicaset: 'k8s.replicaset',
  node: 'k8s.node',
} as const;

type KubernetesEntityKind = keyof typeof KUBERNETES_ENTITY_STORE_TYPES;
type WorkloadKind = Exclude<KubernetesEntityKind, 'node'>;

type KubernetesEntityIdentity =
  | { kind: WorkloadKind; namespace: string; name: string }
  | { kind: 'node'; name: string };

export const buildKubernetesEntityId = (identity: KubernetesEntityIdentity): string => {
  const type = KUBERNETES_ENTITY_STORE_TYPES[identity.kind];
  return identity.kind === 'node'
    ? `${type}:${identity.name}`
    : `${type}:${identity.namespace}/${identity.name}`;
};

const workloadOwnerFields: Record<WorkloadKind, string> = {
  deployment: 'kubernetes.deployment.name',
  statefulset: 'kubernetes.statefulset.name',
  daemonset: 'kubernetes.daemonset.name',
  cronjob: 'kubernetes.cronjob.name',
  job: 'kubernetes.job.name',
  replicaset: 'kubernetes.replicaset.name',
};

const isWorkloadKind = (value: EsqlCell): value is WorkloadKind =>
  typeof value === 'string' && value !== 'node' && value in KUBERNETES_ENTITY_STORE_TYPES;

interface ClusterMetrics {
  replicas: number;
  last_seen: string;
}

interface WorkloadGroup {
  kind: WorkloadKind;
  namespace: string;
  name: string;
  clusters: Record<string, ClusterMetrics>;
}

interface NodeGroup {
  name: string;
  clusters: Record<string, ClusterMetrics>;
}

const replicasOf = (row: EsqlRow): number => (typeof row.replicas === 'number' ? row.replicas : 0);
const lastSeenOf = (row: EsqlRow): string =>
  typeof row.last_seen === 'string' ? row.last_seen : '';
const latest = (left: string, right: string): string => (left > right ? left : right);

const addClusterMetrics = (
  clusters: Record<string, ClusterMetrics>,
  cluster: string,
  row: EsqlRow
): void => {
  const current = clusters[cluster];
  const replicas = replicasOf(row);
  const lastSeen = lastSeenOf(row);
  clusters[cluster] = current
    ? {
        replicas: current.replicas + replicas,
        last_seen: latest(current.last_seen, lastSeen),
      }
    : { replicas, last_seen: lastSeen };
};

const entityTotals = (
  clusters: Record<string, ClusterMetrics>
): { replicas: number; lastSeen: string } =>
  Object.values(clusters).reduce(
    (totals, cluster) => ({
      replicas: totals.replicas + cluster.replicas,
      lastSeen: latest(totals.lastSeen, cluster.last_seen),
    }),
    { replicas: 0, lastSeen: '' }
  );

const buildWorkloadQuery = (tsPrefix: string): string => `${tsPrefix}
| WHERE TRANGE(1 hour) AND data_stream.dataset == "kubernetes.pod"
| EVAL kind = CASE(kubernetes.deployment.name IS NOT NULL, "deployment",
                   kubernetes.statefulset.name IS NOT NULL, "statefulset",
                   kubernetes.daemonset.name   IS NOT NULL, "daemonset",
                   kubernetes.cronjob.name     IS NOT NULL, "cronjob",
                   kubernetes.job.name         IS NOT NULL, "job",
                   kubernetes.replicaset.name  IS NOT NULL, "replicaset", NULL),
       workload = COALESCE(kubernetes.deployment.name, kubernetes.statefulset.name,
                           kubernetes.daemonset.name, kubernetes.cronjob.name,
                           kubernetes.job.name, kubernetes.replicaset.name)
| WHERE workload IS NOT NULL
| STATS replicas = COUNT_DISTINCT(kubernetes.pod.uid), last_seen = MAX(@timestamp)
  BY orchestrator.cluster.name, kubernetes.namespace, kind, workload`;

export const foldWorkloadRows = (rows: EsqlRow[]): EntityFoldResult => {
  const groups = new Map<string, WorkloadGroup>();
  let droppedIncompleteRowsCount = 0;

  for (const row of rows) {
    const cluster = row['orchestrator.cluster.name'];
    const namespace = row['kubernetes.namespace'];
    const kind = row.kind;
    const name = row.workload;
    if (
      typeof cluster !== 'string' ||
      typeof namespace !== 'string' ||
      !isWorkloadKind(kind) ||
      typeof name !== 'string'
    ) {
      droppedIncompleteRowsCount += 1;
      continue;
    }

    const id = buildKubernetesEntityId({ kind, namespace, name });
    let group = groups.get(id);
    if (!group) {
      group = { kind, namespace, name, clusters: {} };
      groups.set(id, group);
    }
    addClusterMetrics(group.clusters, cluster, row);
  }

  const features = [...groups.entries()].map(([id, group]): FeatureUpsert => {
    const ownerField = workloadOwnerFields[group.kind];
    const { replicas, lastSeen } = entityTotals(group.clusters);
    const entityStoreType = KUBERNETES_ENTITY_STORE_TYPES[group.kind];
    return {
      type: 'entity',
      subtype: 'k8s_workload',
      id,
      title: group.name,
      description: `Kubernetes ${group.kind} ${group.name} in namespace ${group.namespace}.`,
      filter: {
        and: [
          { field: 'kubernetes.namespace', eq: group.namespace },
          { field: ownerField, eq: group.name },
        ],
      },
      properties: {
        identity: {
          'kubernetes.namespace': group.namespace,
          [ownerField]: group.name,
        },
        breakdown: ['orchestrator.cluster.name'],
        entity_store_type: entityStoreType,
        clusters: group.clusters,
        replicas,
        last_seen: lastSeen,
        origin: 'metrics',
        key_row: 'ecs.k8s_workload',
      },
      confidence: 100,
    };
  });

  return { features, droppedIncompleteRowsCount };
};

const buildNodeQuery = (tsPrefix: string): string => `${tsPrefix}
| WHERE TRANGE(1 hour) AND data_stream.dataset == "kubernetes.node"
| STATS replicas = COUNT_DISTINCT(kubernetes.node.name), last_seen = MAX(@timestamp)
  BY orchestrator.cluster.name, kubernetes.node.name`;

export const foldNodeRows = (rows: EsqlRow[]): EntityFoldResult => {
  const groups = new Map<string, NodeGroup>();
  let droppedIncompleteRowsCount = 0;

  for (const row of rows) {
    const cluster = row['orchestrator.cluster.name'];
    const name = row['kubernetes.node.name'];
    if (typeof cluster !== 'string' || typeof name !== 'string') {
      droppedIncompleteRowsCount += 1;
      continue;
    }

    const id = buildKubernetesEntityId({ kind: 'node', name });
    let group = groups.get(id);
    if (!group) {
      group = { name, clusters: {} };
      groups.set(id, group);
    }
    addClusterMetrics(group.clusters, cluster, row);
  }

  const features = [...groups.entries()].map(([id, group]): FeatureUpsert => {
    const { replicas, lastSeen } = entityTotals(group.clusters);
    return {
      type: 'entity',
      subtype: 'k8s_node',
      id,
      title: group.name,
      description: `Kubernetes node ${group.name}.`,
      filter: { field: 'kubernetes.node.name', eq: group.name },
      properties: {
        identity: { 'kubernetes.node.name': group.name },
        breakdown: ['orchestrator.cluster.name'],
        entity_store_type: KUBERNETES_ENTITY_STORE_TYPES.node,
        clusters: group.clusters,
        replicas,
        last_seen: lastSeen,
        origin: 'metrics',
        key_row: 'ecs.k8s_node',
      },
      confidence: 100,
    };
  });

  return { features, droppedIncompleteRowsCount };
};

export const ENTITY_KEY_TABLE: readonly EntityKeyRow[] = [
  {
    id: 'ecs.k8s_workload',
    family: 'kubernetes',
    datasets: ['kubernetes.pod'],
    subtype: 'k8s_workload',
    buildQuery: buildWorkloadQuery,
    foldRows: foldWorkloadRows,
  },
  {
    id: 'ecs.k8s_node',
    family: 'kubernetes',
    datasets: ['kubernetes.node'],
    subtype: 'k8s_node',
    buildQuery: buildNodeQuery,
    foldRows: foldNodeRows,
  },
];
