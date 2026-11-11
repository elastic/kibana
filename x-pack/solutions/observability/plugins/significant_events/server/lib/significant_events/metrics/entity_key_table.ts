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
import type { Condition } from '@kbn/streamlang';

export type EsqlScalar = string | number | boolean | null;
export type EsqlCell = EsqlScalar | readonly EsqlScalar[];
export type EsqlRow = Readonly<Record<string, EsqlCell>>;

export const ENTITY_QUERY_LIMIT = 501;

export interface DroppedMetricsEntityRows {
  ownerless: number;
  nullNamespace: number;
  nullNodeName: number;
  nullCluster: number;
  idTooLong: number;
}

export interface EntityFoldResult {
  features: FeatureUpsert[];
  droppedIncompleteRowsCount: number;
  droppedRows: DroppedMetricsEntityRows;
  unknownClusterRows: number;
}

export interface EntityKeyRow {
  id: string;
  families: readonly string[];
  datasets: readonly string[];
  datasetPrefixes?: readonly string[];
  subtype: 'k8s_workload' | 'k8s_node' | 'k8s_namespace' | 'k8s_cluster' | 'host' | 'service';
  buildQuery: (tsPrefix: string) => string;
  foldRows: (rows: EsqlRow[]) => EntityFoldResult;
}

export const getDatasetFamily = (dataset: string | null): string | undefined =>
  dataset?.split('.')[0];

type WorkloadKind = 'deployment' | 'statefulset' | 'daemonset' | 'cronjob' | 'job' | 'replicaset';
type KubernetesEntityKind = WorkloadKind | 'node' | 'namespace' | 'cluster';

/** Kubernetes entity types aligned with Entity Inventory and its proposed extensions. */
export const KUBERNETES_ENTITY_STORE_TYPES = {
  deployment: 'k8s.deployment',
  statefulset: 'k8s.statefulset',
  daemonset: 'k8s.daemonset',
  cronjob: 'k8s.cronjob',
  replicaset: 'k8s.replicaset',
  node: 'k8s.node',
  namespace: 'k8s.namespace',
  cluster: 'k8s.cluster',
} as const satisfies Record<Exclude<KubernetesEntityKind, 'job'>, string>;

type KubernetesEntityIdentity =
  | { kind: WorkloadKind; namespace: string; name: string }
  | { kind: 'node' | 'namespace' | 'cluster'; name: string };

const getKubernetesEntityStoreType = (kind: KubernetesEntityKind): string | undefined =>
  kind === 'job' ? undefined : KUBERNETES_ENTITY_STORE_TYPES[kind];

export const buildKubernetesEntityId = (identity: KubernetesEntityIdentity): string => {
  const type = getKubernetesEntityStoreType(identity.kind) ?? 'k8s.job';
  return 'namespace' in identity
    ? `${type}:${identity.namespace}/${identity.name}`
    : `${type}:${identity.name}`;
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

interface NodeEntity {
  name: string;
  clusters: string[];
  replicas: number;
  lastSeen: string;
}

const replicasOf = (row: EsqlRow): number => (typeof row.replicas === 'number' ? row.replicas : 0);
const lastSeenOf = (row: EsqlRow): string =>
  typeof row.last_seen === 'string' ? row.last_seen : '';
const UNKNOWN_CLUSTER = '_unknown_cluster';

const stringsOf = (value: EsqlCell | undefined): string[] => {
  const values = Array.isArray(value) ? value : [value];
  return values.filter((item): item is string => typeof item === 'string').sort();
};

const clustersOf = (value: EsqlCell | undefined): string[] => {
  const clusters = stringsOf(value);
  return clusters.length > 0 ? clusters : [UNKNOWN_CLUSTER];
};

const KUBERNETES_POD_DATASETS = ['kubernetes.pod', 'kubeletstatsreceiver.otel'] as const;
const KUBERNETES_NODE_DATASETS = ['kubernetes.node', 'kubeletstatsreceiver.otel'] as const;
const KUBERNETES_CLUSTER_DATASETS = [
  'kubernetes.pod',
  'kubernetes.node',
  'kubeletstatsreceiver.otel',
] as const;
const KUBERNETES_DATASET_FAMILIES = [
  'kubernetes',
  'kubeletstatsreceiver',
  'k8sclusterreceiver',
] as const;

const formatDatasetList = (datasets: readonly string[]): string =>
  datasets.map((dataset) => `"${dataset}"`).join(', ');

const createDroppedRows = (): DroppedMetricsEntityRows => ({
  ownerless: 0,
  nullNamespace: 0,
  nullNodeName: 0,
  nullCluster: 0,
  idTooLong: 0,
});

const droppedRowsCount = (droppedRows: DroppedMetricsEntityRows): number =>
  droppedRows.ownerless +
  droppedRows.nullNamespace +
  droppedRows.nullNodeName +
  droppedRows.nullCluster +
  droppedRows.idTooLong;

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

export const buildWorkloadFilter = (
  target: Pick<WorkloadEntity, 'kind' | 'namespace' | 'name' | 'ownerDerived'>,
  workloads: ReadonlyArray<Pick<WorkloadEntity, 'kind' | 'namespace' | 'name'>>
): Condition => {
  const ownerField = workloadOwnerFields[target.kind];
  const stampedOwner: Condition = { field: ownerField, eq: target.name };
  const derivedOwner = derivedOwnerSources[target.kind];
  // The prefix-collision guard sees only rows returned by the ranked query.
  const hasPrefixCollision = workloads.some(
    (workload) =>
      workload.kind === target.kind &&
      workload.namespace === target.namespace &&
      workload.name !== target.name &&
      workload.name.startsWith(`${target.name}-`)
  );
  const owner =
    target.ownerDerived && derivedOwner && !hasPrefixCollision
      ? {
          or: [
            stampedOwner,
            {
              and: [
                { not: { field: derivedOwner.stampedField, exists: true } },
                { field: derivedOwner.sourceField, startsWith: `${target.name}-` },
              ],
            },
          ],
        }
      : stampedOwner;
  return {
    and: [{ field: 'kubernetes.namespace', eq: target.namespace }, owner],
  };
};

const buildWorkloadQuery = (sourceQuery: string): string => `${sourceQuery}
| WHERE @timestamp > NOW() - 1 hour
    AND data_stream.dataset IN (${formatDatasetList(KUBERNETES_POD_DATASETS)})
    AND kubernetes.pod.uid IS NOT NULL
| EVAL h = \`kubernetes.labels.pod-template-hash\`,
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
       owner_derived = derived_deployment IS NOT NULL OR derived_cronjob IS NOT NULL
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
      droppedRows.ownerless += 1;
      return [];
    }
    if (typeof namespace !== 'string') {
      droppedRows.nullNamespace += 1;
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
    const entityStoreType = getKubernetesEntityStoreType(workload.kind);
    return [
      {
        type: 'entity',
        subtype: 'k8s_workload',
        id,
        title: workload.name,
        description: `Kubernetes ${workload.kind} ${workload.name} in namespace ${workload.namespace}.`,
        filter: buildWorkloadFilter(workload, workloads),
        properties: {
          identity: {
            'kubernetes.namespace': workload.namespace,
            [ownerField]: workload.name,
          },
          breakdown: ['orchestrator.cluster.name'],
          ...(entityStoreType ? { entity_store_type: entityStoreType } : {}),
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

const buildNodeQuery = (sourceQuery: string): string => `${sourceQuery}
| WHERE @timestamp > NOW() - 1 hour
    AND data_stream.dataset IN (${formatDatasetList(KUBERNETES_NODE_DATASETS)})
    AND kubernetes.node.name IS NOT NULL
| STATS replicas = COUNT_DISTINCT(kubernetes.node.name), last_seen = MAX(@timestamp),
        clusters = VALUES(orchestrator.cluster.name)
  BY kubernetes.node.name
| SORT replicas DESC, kubernetes.node.name
| LIMIT ${ENTITY_QUERY_LIMIT}`;

export const foldNodeRows = (rows: EsqlRow[]): EntityFoldResult => {
  const droppedRows = createDroppedRows();
  let unknownClusterRows = 0;

  const nodes = rows.flatMap((row): NodeEntity[] => {
    const name = row['kubernetes.node.name'];
    if (typeof name !== 'string') {
      droppedRows.nullNodeName += 1;
      return [];
    }

    const clusters = clustersOf(row.clusters);
    if (clusters.includes(UNKNOWN_CLUSTER)) {
      unknownClusterRows += 1;
    }

    return [
      {
        name,
        clusters,
        replicas: replicasOf(row),
        lastSeen: lastSeenOf(row),
      },
    ];
  });

  const features = nodes.flatMap((node): FeatureUpsert[] => {
    const id = buildKubernetesEntityId({ kind: 'node', name: node.name });
    if (id.length > MAX_ID_LENGTH || node.name.length > MAX_TITLE_LENGTH) {
      droppedRows.idTooLong += 1;
      return [];
    }
    return [
      {
        type: 'entity',
        subtype: 'k8s_node',
        id,
        title: node.name,
        description: `Kubernetes node ${node.name}.`,
        filter: { field: 'kubernetes.node.name', eq: node.name },
        properties: {
          identity: { 'kubernetes.node.name': node.name },
          breakdown: ['orchestrator.cluster.name'],
          entity_store_type: KUBERNETES_ENTITY_STORE_TYPES.node,
          clusters: node.clusters,
          replicas: node.replicas,
          last_seen: node.lastSeen,
          origin: 'metrics',
          key_row: 'ecs.k8s_node',
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

const buildNamespaceQuery = (sourceQuery: string): string => `${sourceQuery}
| WHERE @timestamp > NOW() - 1 hour
    AND data_stream.dataset IN (${formatDatasetList(KUBERNETES_POD_DATASETS)})
    AND kubernetes.pod.uid IS NOT NULL
| STATS replicas = COUNT_DISTINCT(kubernetes.pod.uid), last_seen = MAX(@timestamp),
        clusters = VALUES(orchestrator.cluster.name)
  BY kubernetes.namespace
| SORT replicas DESC, kubernetes.namespace
| LIMIT ${ENTITY_QUERY_LIMIT}`;

export const foldNamespaceRows = (rows: EsqlRow[]): EntityFoldResult => {
  const droppedRows = createDroppedRows();
  let unknownClusterRows = 0;
  const features = rows.flatMap((row): FeatureUpsert[] => {
    const namespace = row['kubernetes.namespace'];
    if (typeof namespace !== 'string') {
      droppedRows.nullNamespace += 1;
      return [];
    }
    const id = buildKubernetesEntityId({ kind: 'namespace', name: namespace });
    if (id.length > MAX_ID_LENGTH || namespace.length > MAX_TITLE_LENGTH) {
      droppedRows.idTooLong += 1;
      return [];
    }
    const clusters = clustersOf(row.clusters);
    if (clusters.includes(UNKNOWN_CLUSTER)) {
      unknownClusterRows += 1;
    }
    return [
      {
        type: 'entity',
        subtype: 'k8s_namespace',
        id,
        title: namespace,
        description: `Kubernetes namespace ${namespace}.`,
        filter: { field: 'kubernetes.namespace', eq: namespace },
        properties: {
          identity: { 'kubernetes.namespace': namespace },
          breakdown: ['orchestrator.cluster.name'],
          entity_store_type: KUBERNETES_ENTITY_STORE_TYPES.namespace,
          clusters,
          replicas: replicasOf(row),
          last_seen: lastSeenOf(row),
          origin: 'metrics',
          key_row: 'ecs.k8s_namespace',
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

const buildClusterQuery = (sourceQuery: string): string => `${sourceQuery}
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
        subtype: 'k8s_cluster',
        id,
        title: cluster,
        description: `Kubernetes cluster ${cluster}.`,
        filter: { field: 'orchestrator.cluster.name', eq: cluster },
        properties: {
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

const buildSystemHostQuery = (sourceQuery: string): string => `${sourceQuery}
| WHERE @timestamp > NOW() - 1 hour AND STARTS_WITH(data_stream.dataset, "system.")
| STATS last_seen = MAX(@timestamp), os = VALUES(host.os.name),
        cloud_provider = VALUES(cloud.provider), cloud_instance = VALUES(cloud.instance.id),
        clusters = VALUES(orchestrator.cluster.name)
  BY host.name, kubernetes.node.name
| SORT last_seen DESC, host.name
| LIMIT ${ENTITY_QUERY_LIMIT}`;

const buildOtelHostQuery = (sourceQuery: string): string => `${sourceQuery}
| WHERE @timestamp > NOW() - 1 hour
    AND data_stream.dataset == "hostmetricsreceiver.otel"
| STATS last_seen = MAX(@timestamp), os = VALUES(host.os.name),
        cloud_provider = VALUES(cloud.provider), cloud_instance = VALUES(cloud.instance.id),
        clusters = VALUES(orchestrator.cluster.name)
  BY host.name, k8s.node.name
| SORT last_seen DESC, host.name
| LIMIT ${ENTITY_QUERY_LIMIT}`;

const foldHostRows = ({
  rows,
  nodeField,
  keyRow,
}: {
  rows: EsqlRow[];
  nodeField: 'kubernetes.node.name' | 'k8s.node.name';
  keyRow: 'ecs.host' | 'otel.host';
}): EntityFoldResult => {
  const droppedRows = createDroppedRows();
  let unknownClusterRows = 0;
  const features = rows.flatMap((row): FeatureUpsert[] => {
    const hostName = row['host.name'];
    if (typeof hostName !== 'string') {
      droppedRows.ownerless += 1;
      return [];
    }
    const nodeName = row[nodeField];
    const isNode = typeof nodeName === 'string';
    const name = isNode ? nodeName : hostName;
    const id = isNode ? buildKubernetesEntityId({ kind: 'node', name }) : `host:${hostName}`;
    if (id.length > MAX_ID_LENGTH || name.length > MAX_TITLE_LENGTH) {
      droppedRows.idTooLong += 1;
      return [];
    }
    const clusters = clustersOf(row.clusters);
    if (clusters.includes(UNKNOWN_CLUSTER)) {
      unknownClusterRows += 1;
    }
    const host = {
      os: stringsOf(row.os),
      cloud_provider: stringsOf(row.cloud_provider),
      cloud_instance: stringsOf(row.cloud_instance),
    };
    return [
      {
        type: 'entity',
        subtype: isNode ? 'k8s_node' : 'host',
        id,
        title: name,
        description: isNode ? `Kubernetes node ${name}.` : `Host ${name}.`,
        filter: isNode
          ? { field: 'kubernetes.node.name', eq: name }
          : { field: 'host.name', eq: name },
        properties: {
          identity: isNode ? { 'kubernetes.node.name': name } : { 'host.name': name },
          breakdown: ['orchestrator.cluster.name'],
          entity_store_type: isNode ? KUBERNETES_ENTITY_STORE_TYPES.node : 'host',
          clusters,
          host,
          aliases: [`host:${hostName}`],
          last_seen: lastSeenOf(row),
          origin: 'metrics',
          key_row: keyRow,
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

export const foldSystemHostRows = (rows: EsqlRow[]): EntityFoldResult =>
  foldHostRows({ rows, nodeField: 'kubernetes.node.name', keyRow: 'ecs.host' });

export const foldOtelHostRows = (rows: EsqlRow[]): EntityFoldResult =>
  foldHostRows({ rows, nodeField: 'k8s.node.name', keyRow: 'otel.host' });

const featureLastSeen = (feature: FeatureUpsert): string =>
  typeof feature.properties.last_seen === 'string' ? feature.properties.last_seen : '';

export const mergeHostFeatures = (features: FeatureUpsert[]): FeatureUpsert[] => {
  const featuresById = new Map<string, FeatureUpsert>();
  for (const feature of features) {
    const current = featuresById.get(feature.id);
    if (!current) {
      featuresById.set(feature.id, feature);
      continue;
    }
    const currentIsNodeInventory = current.properties.key_row === 'ecs.k8s_node';
    const featureIsNodeInventory = feature.properties.key_row === 'ecs.k8s_node';
    if (current.subtype === 'k8s_node' && feature.subtype === 'k8s_node') {
      const nodeFeature = currentIsNodeInventory
        ? current
        : featureIsNodeInventory
        ? feature
        : current;
      const hostFeature = feature.properties.host !== undefined ? feature : current;
      const lastSeen =
        featureLastSeen(current) > featureLastSeen(feature)
          ? featureLastSeen(current)
          : featureLastSeen(feature);
      featuresById.set(feature.id, {
        ...nodeFeature,
        properties: {
          ...hostFeature.properties,
          ...nodeFeature.properties,
          ...(hostFeature.properties.host !== undefined && {
            host: hostFeature.properties.host,
          }),
          ...(hostFeature.properties.aliases !== undefined && {
            aliases: hostFeature.properties.aliases,
          }),
          last_seen: lastSeen,
        },
      });
      continue;
    }
    if (featureLastSeen(feature) > featureLastSeen(current)) {
      featuresById.set(feature.id, feature);
    }
  }
  return [...featuresById.values()];
};

const buildServiceQuery = (sourceQuery: string): string => `${sourceQuery}
| WHERE @timestamp > NOW() - 1 hour
    AND data_stream.dataset IN ("apm.service_summary.1m",
                                "apm.service_summary.1m.otel",
                                "generic.otel")
    AND service.name IS NOT NULL
| STATS last_seen = MAX(@timestamp), environments = VALUES(service.environment),
        docs = COUNT(*)
  BY service.name
| SORT docs DESC, service.name
| LIMIT ${ENTITY_QUERY_LIMIT}`;

export const foldServiceRows = (rows: EsqlRow[]): EntityFoldResult => {
  const droppedRows = createDroppedRows();
  const features = rows.flatMap((row): FeatureUpsert[] => {
    const name = row['service.name'];
    if (typeof name !== 'string') {
      droppedRows.ownerless += 1;
      return [];
    }
    const id = `service:${name}`;
    if (id.length > MAX_ID_LENGTH || name.length > MAX_TITLE_LENGTH) {
      droppedRows.idTooLong += 1;
      return [];
    }
    return [
      {
        type: 'entity',
        subtype: 'service',
        id,
        title: name,
        description: `Service ${name}.`,
        filter: { field: 'service.name', eq: name },
        properties: {
          identity: { 'service.name': name },
          environments: stringsOf(row.environments),
          entity_store_type: 'service',
          last_seen: lastSeenOf(row),
          origin: 'metrics',
          key_row: 'apm.service',
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

export const ENTITY_KEY_TABLE: readonly EntityKeyRow[] = [
  {
    id: 'ecs.k8s_workload',
    families: KUBERNETES_DATASET_FAMILIES,
    datasets: KUBERNETES_POD_DATASETS,
    subtype: 'k8s_workload',
    buildQuery: buildWorkloadQuery,
    foldRows: foldWorkloadRows,
  },
  {
    id: 'ecs.k8s_node',
    families: KUBERNETES_DATASET_FAMILIES,
    datasets: KUBERNETES_NODE_DATASETS,
    subtype: 'k8s_node',
    buildQuery: buildNodeQuery,
    foldRows: foldNodeRows,
  },
  {
    id: 'ecs.k8s_namespace',
    families: KUBERNETES_DATASET_FAMILIES,
    datasets: KUBERNETES_POD_DATASETS,
    subtype: 'k8s_namespace',
    buildQuery: buildNamespaceQuery,
    foldRows: foldNamespaceRows,
  },
  {
    id: 'ecs.k8s_cluster',
    families: KUBERNETES_DATASET_FAMILIES,
    datasets: KUBERNETES_CLUSTER_DATASETS,
    subtype: 'k8s_cluster',
    buildQuery: buildClusterQuery,
    foldRows: foldClusterRows,
  },
  {
    id: 'ecs.host',
    families: ['system'],
    datasets: [],
    datasetPrefixes: ['system.'],
    subtype: 'host',
    buildQuery: buildSystemHostQuery,
    foldRows: foldSystemHostRows,
  },
  {
    id: 'otel.host',
    families: ['hostmetricsreceiver'],
    datasets: ['hostmetricsreceiver.otel'],
    subtype: 'host',
    buildQuery: buildOtelHostQuery,
    foldRows: foldOtelHostRows,
  },
  {
    id: 'apm.service',
    families: ['apm', 'generic'],
    datasets: ['apm.service_summary.1m', 'apm.service_summary.1m.otel', 'generic.otel'],
    subtype: 'service',
    buildQuery: buildServiceQuery,
    foldRows: foldServiceRows,
  },
];
