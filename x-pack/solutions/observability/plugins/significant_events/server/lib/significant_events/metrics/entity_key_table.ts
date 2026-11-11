/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MAX_ID_LENGTH,
  MAX_TEXT_LENGTH,
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
  multiNamespaceWorkloadsCount: number;
  namespacesSkippedCount: number;
}

export interface EntityQueryContext {
  multiNamespaceWorkloadKeys: readonly string[];
}

export interface EntityFoldContext {
  sourceQuery: string;
}

export interface EntityKeyRow {
  id: string;
  families: readonly string[];
  datasets: readonly string[];
  datasetPrefixes?: readonly string[];
  subtype: 'k8s_workload' | 'k8s_nodes' | 'k8s_namespaces' | 'k8s_cluster' | 'host' | 'service';
  buildQuery: (sourceQuery: string, context?: EntityQueryContext) => string;
  foldRows: (rows: EsqlRow[], context: EntityFoldContext) => EntityFoldResult;
}

export const getDatasetFamily = (dataset: string | null): string | undefined =>
  dataset?.split('.')[0];

/** Names in fewer namespaces stay separate (e.g. redis in 4 team namespaces); multi-tenant copies run in hundreds. */
export const MULTI_NAMESPACE_WORKLOAD_THRESHOLD = 10;

type WorkloadKind = 'deployment' | 'statefulset' | 'daemonset' | 'cronjob' | 'job' | 'replicaset';
type KubernetesEntityKind = WorkloadKind | 'cluster';

/** Kubernetes entity types aligned with Entity Inventory and its proposed extensions. */
export const KUBERNETES_ENTITY_STORE_TYPES = {
  deployment: 'k8s.deployment',
  statefulset: 'k8s.statefulset',
  daemonset: 'k8s.daemonset',
  cronjob: 'k8s.cronjob',
  replicaset: 'k8s.replicaset',
  cluster: 'k8s.cluster',
} as const satisfies Record<Exclude<KubernetesEntityKind, 'job'>, string>;

type KubernetesEntityIdentity =
  | { kind: WorkloadKind; namespace: string; name: string }
  | { kind: 'cluster'; name: string };

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

interface MultiNamespaceWorkloadEntity {
  kind: WorkloadKind;
  name: string;
  ownerDerived: boolean;
  namespaceCount: number;
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

const buildWorkloadOwnerFilter = (
  target: Pick<WorkloadEntity, 'kind' | 'name' | 'ownerDerived'>,
  hasPrefixCollision: boolean
): Condition => {
  const ownerField = workloadOwnerFields[target.kind];
  const stampedOwner: Condition = { field: ownerField, eq: target.name };
  const derivedOwner = derivedOwnerSources[target.kind];
  return target.ownerDerived && derivedOwner && !hasPrefixCollision
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
};

export const buildWorkloadFilter = (
  target: Pick<WorkloadEntity, 'kind' | 'namespace' | 'name' | 'ownerDerived'>,
  workloads: ReadonlyArray<Pick<WorkloadEntity, 'kind' | 'namespace' | 'name'>>
): Condition => {
  // The prefix-collision guard sees only rows returned by the ranked query.
  const hasPrefixCollision = workloads.some(
    (workload) =>
      workload.kind === target.kind &&
      workload.namespace === target.namespace &&
      workload.name !== target.name &&
      workload.name.startsWith(`${target.name}-`)
  );
  return {
    and: [
      { field: 'kubernetes.namespace', eq: target.namespace },
      buildWorkloadOwnerFilter(target, hasPrefixCollision),
    ],
  };
};

const buildMultiNamespaceWorkloadFilter = (
  target: Pick<MultiNamespaceWorkloadEntity, 'kind' | 'name' | 'ownerDerived'>,
  workloads: ReadonlyArray<Pick<MultiNamespaceWorkloadEntity, 'kind' | 'name'>>
): Condition =>
  buildWorkloadOwnerFilter(
    target,
    workloads.some(
      (workload) =>
        workload.kind === target.kind &&
        workload.name !== target.name &&
        workload.name.startsWith(`${target.name}-`)
    )
  );

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

const quoteEsqlString = (value: string): string =>
  `"${value.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`;

const formatWorkloadKeys = (keys: readonly string[]): string =>
  keys.map(quoteEsqlString).join(', ');

const roundToTwoSignificantDigits = (value: number): number =>
  value === 0 ? 0 : Number(value.toPrecision(2));

const formatScale = (value: number, label: string): string =>
  value < 10 ? `${value} ${label}` : `about ${roundToTwoSignificantDigits(value)} ${label}`;

export const buildInfrastructureConceptDescription = ({
  concept,
  cluster,
  scale,
  breakdownField,
  members,
  tenantNamespaces = 0,
}: {
  concept: 'nodes' | 'namespaces';
  cluster: string;
  scale: number;
  breakdownField: 'kubernetes.node.name' | 'kubernetes.namespace';
  members: readonly string[];
  tenantNamespaces?: number;
}): string => {
  const label = concept === 'nodes' ? 'nodes' : 'namespaces';
  const meaning =
    concept === 'nodes'
      ? `Kubernetes nodes are the machines that run workloads in cluster ${cluster}`
      : `Kubernetes namespaces partition workloads in cluster ${cluster}`;
  const sentences = [
    `${meaning}; this source has ${formatScale(scale, label)}.`,
    `Break them down by ${breakdownField}; properties.list_query lists them live.`,
  ];
  if (concept === 'namespaces' && tenantNamespaces > 0) {
    sentences.push(
      `${formatScale(
        tenantNamespaces,
        tenantNamespaces === 1 ? 'namespace' : 'namespaces'
      )} hold only copies of multi-namespace workloads.`
    );
  }

  const descriptionPrefix = `${sentences.join(' ')} Members: `;
  const descriptionLimit = MAX_TEXT_LENGTH - 200;
  const includedMembers: string[] = [];
  for (const member of members) {
    const nextMembers = [...includedMembers, member];
    const remaining = Math.max(0, scale - nextMembers.length);
    const suffix =
      remaining > 0 ? `, and about ${roundToTwoSignificantDigits(remaining)} more.` : '.';
    if (`${descriptionPrefix}${nextMembers.join(', ')}${suffix}`.length > descriptionLimit) {
      break;
    }
    includedMembers.push(member);
  }

  const remaining = Math.max(0, scale - includedMembers.length);
  if (includedMembers.length === 0) {
    return `${descriptionPrefix}about ${roundToTwoSignificantDigits(remaining)} more.`;
  }
  const suffix =
    remaining > 0 ? `, and about ${roundToTwoSignificantDigits(remaining)} more.` : '.';
  return `${descriptionPrefix}${includedMembers.join(', ')}${suffix}`;
};

const buildConceptListQuery = ({
  sourceQuery,
  cluster,
  datasets,
  breakdownField,
}: {
  sourceQuery: string;
  cluster: string;
  datasets: readonly string[];
  breakdownField: 'kubernetes.node.name' | 'kubernetes.namespace';
}): string => `${sourceQuery}
| WHERE @timestamp > NOW() - 1 hour
    AND orchestrator.cluster.name == ${quoteEsqlString(cluster)}
    AND data_stream.dataset IN (${formatDatasetList(datasets)})
| STATS last_seen = MAX(@timestamp) BY ${breakdownField}
| SORT ${breakdownField}`;

export const getMultiNamespaceWorkloadKeys = (rows: EsqlRow[]): string[] => [
  ...new Set(
    rows.flatMap((row): string[] => {
      const kind = row.kind;
      const workload = row.workload;
      return isWorkloadKind(kind) && typeof workload === 'string' ? [`${kind}/${workload}`] : [];
    })
  ),
];

const buildMultiNamespaceWorkloadQuery = (sourceQuery: string): string => `${sourceQuery}
| WHERE @timestamp > NOW() - 1 hour
    AND data_stream.dataset IN (${formatDatasetList(KUBERNETES_POD_DATASETS)})
    AND kubernetes.pod.uid IS NOT NULL
${WORKLOAD_OWNER_DERIVATION}
| WHERE kind IS NOT NULL AND workload IS NOT NULL
| STATS namespaces = COUNT_DISTINCT(kubernetes.namespace),
        replicas = COUNT_DISTINCT(kubernetes.pod.uid),
        last_seen = MAX(@timestamp),
        clusters = VALUES(orchestrator.cluster.name),
        owner_derived = MAX(CASE(owner_derived, 1, 0))
  BY kind, workload
| WHERE namespaces >= ${MULTI_NAMESPACE_WORKLOAD_THRESHOLD}
| SORT replicas DESC, workload
| LIMIT ${ENTITY_QUERY_LIMIT}`;

const buildWorkloadQuery = (
  sourceQuery: string,
  context?: EntityQueryContext
): string => `${sourceQuery}
| WHERE @timestamp > NOW() - 1 hour
    AND data_stream.dataset IN (${formatDatasetList(KUBERNETES_POD_DATASETS)})
    AND kubernetes.pod.uid IS NOT NULL
${WORKLOAD_OWNER_DERIVATION}
| EVAL workload_key = CONCAT(kind, "/", workload)${
  context && context.multiNamespaceWorkloadKeys.length > 0
    ? `
| WHERE workload_key NOT IN (${formatWorkloadKeys(context.multiNamespaceWorkloadKeys)})`
    : ''
}
| STATS replicas = COUNT_DISTINCT(kubernetes.pod.uid), last_seen = MAX(@timestamp)
  BY orchestrator.cluster.name, kubernetes.namespace, kind, workload, owner_derived
| STATS replicas = SUM(replicas), last_seen = MAX(last_seen),
        clusters = VALUES(orchestrator.cluster.name),
        owner_derived = MAX(CASE(owner_derived, 1, 0))
  BY kubernetes.namespace, kind, workload
| SORT replicas DESC, kubernetes.namespace, workload
| LIMIT ${ENTITY_QUERY_LIMIT}`;

export const foldMultiNamespaceWorkloadRows = (rows: EsqlRow[]): EntityFoldResult => {
  const droppedRows = createDroppedRows();
  let unknownClusterRows = 0;
  const workloads = rows.flatMap((row): MultiNamespaceWorkloadEntity[] => {
    const kind = row.kind;
    const name = row.workload;
    if (!isWorkloadKind(kind) || typeof name !== 'string') {
      droppedRows.ownerless += 1;
      return [];
    }
    const clusters = clustersOf(row.clusters);
    if (clusters.includes(UNKNOWN_CLUSTER)) {
      unknownClusterRows += 1;
    }
    return [
      {
        kind,
        name,
        ownerDerived: row.owner_derived === true || row.owner_derived === 1,
        namespaceCount: typeof row.namespaces === 'number' ? row.namespaces : 0,
        clusters,
        replicas: replicasOf(row),
        lastSeen: lastSeenOf(row),
      },
    ];
  });
  const features = workloads.flatMap((workload): FeatureUpsert[] => {
    const id = buildKubernetesEntityId({
      kind: workload.kind,
      namespace: '*',
      name: workload.name,
    });
    if (id.length > MAX_ID_LENGTH || workload.name.length > MAX_TITLE_LENGTH) {
      droppedRows.idTooLong += 1;
      return [];
    }
    return [
      {
        type: 'entity',
        subtype: 'k8s_workload',
        id,
        title: workload.name,
        description: `Kubernetes ${workload.kind} ${workload.name} in ${workload.namespaceCount} namespaces.`,
        filter: buildMultiNamespaceWorkloadFilter(workload, workloads),
        properties: {
          identity: { [workloadOwnerFields[workload.kind]]: workload.name },
          grain: 'multi_namespace',
          namespace_count: workload.namespaceCount,
          breakdown: ['kubernetes.namespace', 'orchestrator.cluster.name'],
          clusters: workload.clusters,
          replicas: workload.replicas,
          last_seen: workload.lastSeen,
          origin: 'metrics',
          key_row: 'ecs.k8s_multi_namespace_workload',
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
    multiNamespaceWorkloadsCount: features.length,
    namespacesSkippedCount: 0,
  };
};

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
          grain: 'namespace',
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
    multiNamespaceWorkloadsCount: 0,
    namespacesSkippedCount: 0,
  };
};

const buildNodeQuery = (sourceQuery: string): string => `${sourceQuery}
| WHERE @timestamp > NOW() - 1 hour
    AND data_stream.dataset IN (${formatDatasetList(KUBERNETES_NODE_DATASETS)})
    AND kubernetes.node.name IS NOT NULL
    AND orchestrator.cluster.name IS NOT NULL
| STATS activity = COUNT(*), last_seen = MAX(@timestamp),
        os = VALUES(host.os.name), cloud_provider = VALUES(cloud.provider)
  BY orchestrator.cluster.name, kubernetes.node.name
| INLINE STATS scale = COUNT(*) BY orchestrator.cluster.name
| SORT activity DESC, kubernetes.node.name
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
    const name = row['kubernetes.node.name'];
    if (typeof name !== 'string') {
      droppedRows.nullNodeName += 1;
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
    if (concept.members.length < 50) {
      concept.members.push(name);
    }
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
        subtype: 'k8s_nodes',
        id,
        title,
        description: buildInfrastructureConceptDescription({
          concept: 'nodes',
          cluster,
          scale: concept.scale,
          breakdownField: 'kubernetes.node.name',
          members,
        }),
        filter: { field: 'orchestrator.cluster.name', eq: cluster },
        properties: {
          breakdown: ['kubernetes.node.name'],
          scale: concept.scale,
          members,
          list_query: buildConceptListQuery({
            sourceQuery,
            cluster,
            datasets: KUBERNETES_NODE_DATASETS,
            breakdownField: 'kubernetes.node.name',
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
    unknownClusterRows: 0,
    multiNamespaceWorkloadsCount: 0,
    namespacesSkippedCount: 0,
  };
};

const buildNamespaceQuery = (
  sourceQuery: string,
  context?: EntityQueryContext
): string => `${sourceQuery}
| WHERE @timestamp > NOW() - 1 hour
    AND data_stream.dataset IN (${formatDatasetList(KUBERNETES_POD_DATASETS)})
    AND kubernetes.pod.uid IS NOT NULL
    AND orchestrator.cluster.name IS NOT NULL
${WORKLOAD_OWNER_DERIVATION}
| EVAL workload_key = CONCAT(kind, "/", workload)
| STATS replicas = COUNT_DISTINCT(kubernetes.pod.uid),
        local_pods = COUNT_DISTINCT(${
          context && context.multiNamespaceWorkloadKeys.length > 0
            ? `CASE(workload_key IS NULL OR workload_key NOT IN (${formatWorkloadKeys(
                context.multiNamespaceWorkloadKeys
              )}), kubernetes.pod.uid, NULL)`
            : 'kubernetes.pod.uid'
        }),
        last_seen = MAX(@timestamp),
        clusters = VALUES(orchestrator.cluster.name)
  BY orchestrator.cluster.name, kubernetes.namespace
| INLINE STATS scale = COUNT(*),
               tenant_namespaces = SUM(CASE(local_pods == 0, 1, 0))
  BY orchestrator.cluster.name
| SORT replicas DESC, kubernetes.namespace
| LIMIT ${ENTITY_QUERY_LIMIT}`;

export const foldNamespaceRows = (
  rows: EsqlRow[],
  { sourceQuery }: EntityFoldContext
): EntityFoldResult => {
  const droppedRows = createDroppedRows();
  const conceptsByCluster = new Map<
    string,
    { scale: number; members: string[]; tenantNamespaces: number }
  >();
  for (const row of rows) {
    const cluster = row['orchestrator.cluster.name'];
    if (typeof cluster !== 'string') {
      droppedRows.nullCluster += 1;
      continue;
    }
    const namespace = row['kubernetes.namespace'];
    if (typeof namespace !== 'string') {
      droppedRows.nullNamespace += 1;
      continue;
    }
    const concept = conceptsByCluster.get(cluster) ?? {
      scale: 0,
      members: [],
      tenantNamespaces: 0,
    };
    concept.scale =
      typeof row.scale === 'number' ? Math.max(concept.scale, row.scale) : concept.scale;
    concept.tenantNamespaces =
      typeof row.tenant_namespaces === 'number'
        ? Math.max(concept.tenantNamespaces, row.tenant_namespaces)
        : concept.tenantNamespaces;
    if (concept.members.length < 50) {
      concept.members.push(namespace);
    }
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
        subtype: 'k8s_namespaces',
        id,
        title,
        description: buildInfrastructureConceptDescription({
          concept: 'namespaces',
          cluster,
          scale: concept.scale,
          breakdownField: 'kubernetes.namespace',
          members,
          tenantNamespaces: concept.tenantNamespaces,
        }),
        filter: { field: 'orchestrator.cluster.name', eq: cluster },
        properties: {
          breakdown: ['kubernetes.namespace'],
          scale: concept.scale,
          members,
          tenant_namespaces: concept.tenantNamespaces,
          list_query: buildConceptListQuery({
            sourceQuery,
            cluster,
            datasets: KUBERNETES_POD_DATASETS,
            breakdownField: 'kubernetes.namespace',
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
    multiNamespaceWorkloadsCount: 0,
    namespacesSkippedCount: [...conceptsByCluster.values()].reduce(
      (count, concept) => count + concept.tenantNamespaces,
      0
    ),
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
    multiNamespaceWorkloadsCount: 0,
    namespacesSkippedCount: 0,
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
    const host = {
      os: stringsOf(row.os),
      cloud_provider: stringsOf(row.cloud_provider),
      cloud_instance: stringsOf(row.cloud_instance),
    };
    if (typeof nodeName === 'string') {
      const clusters = clustersOf(row.clusters);
      if (clusters.includes(UNKNOWN_CLUSTER)) {
        droppedRows.nullCluster += 1;
        return [];
      }
      return clusters.map((cluster) => ({
        type: 'infrastructure',
        subtype: 'k8s_nodes',
        id: `k8s.nodes:${cluster}`,
        title: `Kubernetes nodes of ${cluster}`,
        description: `Kubernetes nodes in cluster ${cluster}.`,
        filter: { field: 'orchestrator.cluster.name', eq: cluster },
        properties: {
          host_summary: {
            os: host.os,
            cloud_provider: host.cloud_provider,
          },
          origin: 'metrics',
          key_row: keyRow,
        },
        confidence: 100,
      }));
    }
    const id = `host:${hostName}`;
    if (id.length > MAX_ID_LENGTH || hostName.length > MAX_TITLE_LENGTH) {
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
        subtype: 'host',
        id,
        title: hostName,
        description: `Host ${hostName}.`,
        filter: { field: 'host.name', eq: hostName },
        properties: {
          identity: { 'host.name': hostName },
          breakdown: ['orchestrator.cluster.name'],
          entity_store_type: 'host',
          clusters,
          host,
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
    multiNamespaceWorkloadsCount: 0,
    namespacesSkippedCount: 0,
  };
};

export const foldSystemHostRows = (rows: EsqlRow[]): EntityFoldResult =>
  foldHostRows({ rows, nodeField: 'kubernetes.node.name', keyRow: 'ecs.host' });

export const foldOtelHostRows = (rows: EsqlRow[]): EntityFoldResult =>
  foldHostRows({ rows, nodeField: 'k8s.node.name', keyRow: 'otel.host' });

const featureLastSeen = (feature: FeatureUpsert): string =>
  typeof feature.properties.last_seen === 'string' ? feature.properties.last_seen : '';

const stringArrayOf = (value: FeatureUpsert['properties'][string]): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

const hostSummaryOf = (
  feature: FeatureUpsert
): { os: readonly string[]; cloud_provider: readonly string[] } => {
  const summary = feature.properties.host_summary;
  if (typeof summary !== 'object' || summary === null || Array.isArray(summary)) {
    return { os: [], cloud_provider: [] };
  }
  return {
    os: stringArrayOf('os' in summary ? summary.os : undefined),
    cloud_provider: stringArrayOf('cloud_provider' in summary ? summary.cloud_provider : undefined),
  };
};

const mergeValues = (left: readonly string[], right: readonly string[]): string[] =>
  [...new Set([...left, ...right])].sort();

export const mergeHostFeatures = (features: FeatureUpsert[]): FeatureUpsert[] => {
  const featuresById = new Map<string, FeatureUpsert>();
  for (const feature of features) {
    const current = featuresById.get(feature.id);
    if (!current) {
      featuresById.set(feature.id, feature);
      continue;
    }
    if (current.subtype === 'k8s_nodes' && feature.subtype === 'k8s_nodes') {
      const currentIsConcept = current.properties.key_row === 'ecs.k8s_nodes';
      const conceptFeature =
        currentIsConcept || feature.properties.key_row !== 'ecs.k8s_nodes' ? current : feature;
      const currentSummary = hostSummaryOf(current);
      const featureSummary = hostSummaryOf(feature);
      featuresById.set(feature.id, {
        ...conceptFeature,
        properties: {
          ...conceptFeature.properties,
          host_summary: {
            os: mergeValues(currentSummary.os, featureSummary.os),
            cloud_provider: mergeValues(
              currentSummary.cloud_provider,
              featureSummary.cloud_provider
            ),
          },
        },
      });
      continue;
    }
    if (featureLastSeen(feature) > featureLastSeen(current)) {
      featuresById.set(feature.id, feature);
    }
  }
  return [...featuresById.values()].filter(
    (feature) => feature.subtype !== 'k8s_nodes' || feature.properties.key_row === 'ecs.k8s_nodes'
  );
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
    multiNamespaceWorkloadsCount: 0,
    namespacesSkippedCount: 0,
  };
};

export const ENTITY_KEY_TABLE: readonly EntityKeyRow[] = [
  {
    id: 'ecs.k8s_multi_namespace_workload',
    families: KUBERNETES_DATASET_FAMILIES,
    datasets: KUBERNETES_POD_DATASETS,
    subtype: 'k8s_workload',
    buildQuery: buildMultiNamespaceWorkloadQuery,
    foldRows: foldMultiNamespaceWorkloadRows,
  },
  {
    id: 'ecs.k8s_workload',
    families: KUBERNETES_DATASET_FAMILIES,
    datasets: KUBERNETES_POD_DATASETS,
    subtype: 'k8s_workload',
    buildQuery: buildWorkloadQuery,
    foldRows: foldWorkloadRows,
  },
  {
    id: 'ecs.k8s_nodes',
    families: KUBERNETES_DATASET_FAMILIES,
    datasets: KUBERNETES_NODE_DATASETS,
    subtype: 'k8s_nodes',
    buildQuery: buildNodeQuery,
    foldRows: foldNodeRows,
  },
  {
    id: 'ecs.k8s_namespaces',
    families: KUBERNETES_DATASET_FAMILIES,
    datasets: KUBERNETES_POD_DATASETS,
    subtype: 'k8s_namespaces',
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
