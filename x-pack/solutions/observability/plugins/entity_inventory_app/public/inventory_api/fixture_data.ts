/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  InventoryEntityType,
  InventoryListColumn,
  InventoryListResponse,
  InventoryRow,
  InventoryTypesResponse,
} from './types';

// The columns `buildColumns` produces for the entity store's built-in `host`: `entity.id`, the
// identity fields in ranking order, the attributes in source order with names shared across
// sources listed once, then `last_seen`.
const HOST_LIST_COLUMNS: InventoryListColumn[] = [
  { name: 'entity.id', kind: 'id' },
  { name: 'host.id', kind: 'identity' },
  { name: 'host.name', kind: 'identity' },
  { name: 'host.hostname', kind: 'identity' },
  { name: 'os.type', kind: 'attribute' },
  { name: 'os.version', kind: 'attribute' },
  { name: 'host.arch', kind: 'attribute' },
  { name: 'host.ip', kind: 'attribute' },
  { name: 'k8s.cluster.name', kind: 'attribute' },
  { name: 'cloud.provider', kind: 'attribute' },
  { name: 'cloud.platform', kind: 'attribute' },
  { name: 'cloud.region', kind: 'attribute' },
  { name: 'cloud.availability_zone', kind: 'attribute' },
  { name: 'cloud.account.id', kind: 'attribute' },
  { name: 'os.name', kind: 'attribute' },
  { name: 'host.os.kernel', kind: 'attribute' },
  { name: 'last_seen', kind: 'last_seen' },
];

// The columns `buildColumns` produces for the inventory's `k8s.deployment`.
const K8S_DEPLOYMENT_LIST_COLUMNS: InventoryListColumn[] = [
  { name: 'entity.id', kind: 'id' },
  { name: 'kubernetes.namespace', kind: 'identity' },
  { name: 'kubernetes.deployment.name', kind: 'identity' },
  { name: 'k8s.cluster.name', kind: 'attribute' },
  { name: 'k8s.deployment.available', kind: 'attribute' },
  { name: 'k8s.deployment.desired', kind: 'attribute' },
  { name: 'k8s.deployment.paused', kind: 'attribute' },
  { name: 'k8s.deployment.label.app', kind: 'attribute' },
  { name: 'k8s.deployment.uid', kind: 'attribute' },
  { name: 'last_seen', kind: 'last_seen' },
];

export const HOST_TYPE_FIXTURE: InventoryEntityType = {
  type: 'host',
  name: 'Host',
  description:
    'A physical or virtual machine that runs workloads. Identified by host.id, falling back to host.name, then host.hostname.',
  identityFields: ['host.id', 'host.name', 'host.hostname'],
  columns: HOST_LIST_COLUMNS,
};

export const K8S_DEPLOYMENT_TYPE_FIXTURE: InventoryEntityType = {
  type: 'k8s.deployment',
  name: 'K8s Deployment',
  description: 'A Kubernetes deployment, identified by namespace/name.',
  identityFields: ['kubernetes.namespace', 'kubernetes.deployment.name'],
  columns: K8S_DEPLOYMENT_LIST_COLUMNS,
};

export const TYPES_RESPONSE_FIXTURE: InventoryTypesResponse = {
  types: [HOST_TYPE_FIXTURE, K8S_DEPLOYMENT_TYPE_FIXTURE],
};

const LAST_SEEN_ANCHOR_MS = Date.parse('2026-10-30T12:00:00.000Z');
const LAST_SEEN_STEP_MS = 7_000;

// Rows arrive newest first, as the route sorts them by last_seen descending.
const lastSeenAt = (index: number): string =>
  new Date(LAST_SEEN_ANCHOR_MS - index * LAST_SEEN_STEP_MS).toISOString();

const HOST_ROLES = ['web', 'api', 'db', 'cache', 'worker'] as const;
const CLOUDS = [
  { provider: 'aws', platform: 'aws_ec2', region: 'us-east-1', zone: 'us-east-1a' },
  {
    provider: 'gcp',
    platform: 'gcp_compute_engine',
    region: 'europe-west1',
    zone: 'europe-west1-b',
  },
  { provider: 'azure', platform: 'azure_vm', region: 'westeurope', zone: 'westeurope-1' },
] as const;

/**
 * Builds `count` deterministic host rows. A host is reported by the system integration (which
 * adds `os.name` and `host.os.kernel`), by the OpenTelemetry hostmetrics receiver, or only by the
 * metric-less existence source, whose rows have every attribute null. Some hosts have no `host.id`.
 */
export const buildHostRows = (count: number): InventoryRow[] =>
  Array.from({ length: count }, (_, index) => {
    const hostName = `${HOST_ROLES[index % HOST_ROLES.length]}-${String(index).padStart(3, '0')}`;
    const hostId = index % 9 === 2 ? null : `a1b2c3d4${String(index).padStart(24, '0')}`;
    const source = index % 11 === 7 ? 'existence' : index % 2 === 0 ? 'system' : 'hostmetrics';
    const hasAttributes = source !== 'existence';
    const cloud = hasAttributes && index % 7 !== 3 ? CLOUDS[index % CLOUDS.length] : null;
    const ip = `10.0.${Math.floor(index / 250)}.${(index % 250) + 1}`;

    return {
      'entity.id': `host:${hostId ?? hostName}`,
      'host.id': hostId,
      'host.name': hostName,
      'host.hostname': hostName,
      'os.type': hasAttributes ? 'linux' : null,
      'os.version': hasAttributes ? '22.04' : null,
      'host.arch': hasAttributes ? (index % 4 === 3 ? 'arm64' : 'amd64') : null,
      'host.ip': hasAttributes ? [ip, `fe80::${index.toString(16)}`] : null,
      'k8s.cluster.name': hasAttributes && index % 3 === 0 ? `prod-cluster-${index % 2}` : null,
      'cloud.provider': cloud?.provider ?? null,
      'cloud.platform': cloud?.platform ?? null,
      'cloud.region': cloud?.region ?? null,
      'cloud.availability_zone': cloud?.zone ?? null,
      'cloud.account.id': cloud ? `12345678901${index % 3}` : null,
      'os.name': source === 'system' ? 'Ubuntu' : null,
      'host.os.kernel': source === 'system' ? '5.15.0-1051-aws' : null,
      last_seen: lastSeenAt(index),
    };
  });

const NAMESPACES = ['default', 'payments', 'checkout', 'monitoring'] as const;
const DEPLOYMENTS = ['frontend', 'api-gateway', 'worker', 'scheduler', 'cart'] as const;

/**
 * Builds `count` deterministic k8s.deployment rows. A deployment is reported by Elastic Agent
 * (which adds `paused` and the `app` label), by the OpenTelemetry receiver (which adds the uid), or
 * by both; the attributes only the other source reads are null.
 */
export const buildK8sDeploymentRows = (count: number): InventoryRow[] =>
  Array.from({ length: count }, (_, index) => {
    const namespace = NAMESPACES[index % NAMESPACES.length];
    const app = DEPLOYMENTS[index % DEPLOYMENTS.length];
    const name = `${app}-${index}`;
    const reportedByOtel = index % 3 !== 1;
    const reportedByElasticAgent = index % 3 !== 0;
    const desired = 1 + (index % 4);

    return {
      'entity.id': `k8s.deployment:${namespace}/${name}`,
      'kubernetes.namespace': namespace,
      'kubernetes.deployment.name': name,
      'k8s.cluster.name': `prod-cluster-${index % 2}`,
      'k8s.deployment.available': index % 5 === 4 ? desired - 1 : desired,
      'k8s.deployment.desired': desired,
      'k8s.deployment.paused': reportedByElasticAgent ? index % 11 === 4 : null,
      'k8s.deployment.label.app': reportedByElasticAgent && index % 6 !== 5 ? app : null,
      'k8s.deployment.uid': reportedByOtel
        ? `5f0c7a3e-1b2d-4c6e-9a8b-${String(index).padStart(12, '0')}`
        : null,
      last_seen: lastSeenAt(index),
    };
  });

export const LIST_FIXTURES_BY_TYPE: Readonly<
  Record<string, { columns: InventoryListColumn[]; buildRows: (count: number) => InventoryRow[] }>
> = {
  host: { columns: HOST_LIST_COLUMNS, buildRows: buildHostRows },
  'k8s.deployment': { columns: K8S_DEPLOYMENT_LIST_COLUMNS, buildRows: buildK8sDeploymentRows },
};

export const NORMAL_ROW_COUNT = 120;

/** Builds the complete list response of `type`, or `undefined` for an unknown type. */
export const buildListResponseFixture = (type: string): InventoryListResponse | undefined => {
  const fixture = LIST_FIXTURES_BY_TYPE[type];
  if (!fixture) {
    return undefined;
  }
  const rows = fixture.buildRows(NORMAL_ROW_COUNT);
  return {
    columns: fixture.columns,
    rows,
    truncated: false,
    errors: [],
    unavailableColumns: [],
  };
};
