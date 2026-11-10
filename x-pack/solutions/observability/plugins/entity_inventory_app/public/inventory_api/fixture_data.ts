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

// Columns in `buildColumns` order: id, identity fields, attributes, last_seen.
const HOST_LIST_COLUMNS: InventoryListColumn[] = [
  { name: 'entity.id', kind: 'id', type: 'keyword' },
  { name: 'host.id', kind: 'identity', type: 'keyword' },
  { name: 'host.name', kind: 'identity', type: 'keyword' },
  { name: 'host.hostname', kind: 'identity', type: 'keyword' },
  { name: 'os.type', kind: 'attribute', type: 'keyword' },
  { name: 'os.version', kind: 'attribute', type: 'keyword' },
  { name: 'host.arch', kind: 'attribute', type: 'keyword' },
  { name: 'host.ip', kind: 'attribute', type: 'ip' },
  { name: 'k8s.cluster.name', kind: 'attribute', type: 'keyword' },
  { name: 'cloud.provider', kind: 'attribute', type: 'keyword' },
  { name: 'cloud.platform', kind: 'attribute', type: 'keyword' },
  { name: 'cloud.region', kind: 'attribute', type: 'keyword' },
  { name: 'cloud.availability_zone', kind: 'attribute', type: 'keyword' },
  { name: 'cloud.account.id', kind: 'attribute', type: 'keyword' },
  { name: 'os.name', kind: 'attribute', type: 'keyword' },
  { name: 'host.os.kernel', kind: 'attribute', type: 'keyword' },
  { name: 'last_seen', kind: 'last_seen', type: 'date' },
];

// Mirrors the k8s.deployment definition: identity fields of both naming conventions, then the
// attributes of both sources.
const K8S_DEPLOYMENT_LIST_COLUMNS: InventoryListColumn[] = [
  { name: 'entity.id', kind: 'id', type: 'keyword' },
  { name: 'k8s.cluster.name', kind: 'identity', type: 'keyword' },
  { name: 'k8s.namespace.name', kind: 'identity', type: 'keyword' },
  { name: 'k8s.deployment.name', kind: 'identity', type: 'keyword' },
  { name: 'orchestrator.cluster.name', kind: 'identity', type: 'keyword' },
  { name: 'kubernetes.namespace', kind: 'identity', type: 'keyword' },
  { name: 'kubernetes.deployment.name', kind: 'identity', type: 'keyword' },
  { name: 'available_replicas', kind: 'attribute', type: 'long' },
  { name: 'desired_replicas', kind: 'attribute', type: 'long' },
  { name: 'paused', kind: 'attribute', type: 'boolean' },
  { name: 'app', kind: 'attribute', type: 'keyword' },
  { name: 'resource_id', kind: 'attribute', type: 'keyword' },
  { name: 'last_seen', kind: 'last_seen', type: 'date' },
];

const toTypeColumns = (columns: InventoryListColumn[]) =>
  columns.map(({ name, kind }) => ({ name, kind }));

export const HOST_TYPE_FIXTURE: InventoryEntityType = {
  type: 'host',
  name: 'Host',
  identityFields: ['host.id', 'host.name', 'host.hostname'],
  columns: toTypeColumns(HOST_LIST_COLUMNS),
};

export const K8S_DEPLOYMENT_TYPE_FIXTURE: InventoryEntityType = {
  type: 'k8s.deployment',
  name: 'K8s Deployment',
  identityFields: [
    'k8s.cluster.name',
    'k8s.namespace.name',
    'k8s.deployment.name',
    'orchestrator.cluster.name',
    'kubernetes.namespace',
    'kubernetes.deployment.name',
  ],
  columns: toTypeColumns(K8S_DEPLOYMENT_LIST_COLUMNS),
};

export const TYPES_RESPONSE_FIXTURE: InventoryTypesResponse = {
  types: [HOST_TYPE_FIXTURE, K8S_DEPLOYMENT_TYPE_FIXTURE],
};

const LAST_SEEN_ANCHOR_MS = Date.parse('2026-10-30T12:00:00.000Z');
const LAST_SEEN_STEP_MS = 7_000;

// Rows arrive newest first, as the route sorts them by last_seen descending.
const lastSeenAt = (index: number): string =>
  new Date(LAST_SEEN_ANCHOR_MS - index * LAST_SEEN_STEP_MS).toISOString();

const pick = <T>(values: readonly T[], index: number): T => values[index % values.length];

const HOST_ROLES = ['web', 'api', 'db', 'cache', 'worker'] as const;
const OPERATING_SYSTEMS = [
  { type: 'linux', name: 'Ubuntu', version: '22.04', kernel: '5.15.0-1051-aws' },
  { type: 'linux', name: 'Red Hat Enterprise Linux', version: '9.3', kernel: '5.14.0-362' },
  { type: 'windows', name: 'Windows Server 2022', version: '10.0', kernel: '10.0.20348' },
  { type: 'macos', name: 'macOS', version: '14.4', kernel: '23.4.0' },
] as const;
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

/** Builds `count` deterministic host rows, including null, multi-value and missing-id rows. */
export const buildHostRows = (count: number): InventoryRow[] =>
  Array.from({ length: count }, (_, index) => {
    const hostName = `${pick(HOST_ROLES, index)}-${String(index).padStart(3, '0')}`;
    const hostId = index % 9 === 2 ? null : `a1b2c3d4-${String(index).padStart(4, '0')}`;
    const os = pick(OPERATING_SYSTEMS, index);
    const cloud = index % 7 === 3 ? null : pick(CLOUDS, index);
    const ip = `10.0.${Math.floor(index / 250)}.${(index % 250) + 1}`;

    return {
      'entity.id': `host:${hostId ?? hostName}`,
      'host.id': hostId,
      'host.name': index % 13 === 5 ? null : hostName,
      'host.hostname': `${hostName}.internal`,
      'os.type': os.type,
      'os.version': os.version,
      'host.arch': index % 4 === 3 ? 'arm64' : 'x86_64',
      'host.ip': index % 10 === 1 ? [ip, `fe80::${index}`] : ip,
      'k8s.cluster.name': index % 3 === 0 ? `prod-cluster-${index % 2}` : null,
      'cloud.provider': cloud?.provider ?? null,
      'cloud.platform': cloud?.platform ?? null,
      'cloud.region': cloud?.region ?? null,
      'cloud.availability_zone': cloud?.zone ?? null,
      'cloud.account.id': cloud ? `account-${index % 3}` : null,
      'os.name': os.name,
      'host.os.kernel': os.kernel,
      last_seen: lastSeenAt(index),
    };
  });

const NAMESPACES = ['default', 'payments', 'checkout', 'monitoring'] as const;
const DEPLOYMENTS = ['frontend', 'api-gateway', 'worker', 'scheduler', 'cart'] as const;

/**
 * Builds `count` deterministic k8s.deployment rows. A deployment is reported by the OpenTelemetry
 * receiver, by Elastic Agent, or by both, and the fields of the other convention are null.
 */
export const buildK8sDeploymentRows = (count: number): InventoryRow[] =>
  Array.from({ length: count }, (_, index) => {
    const cluster = `prod-cluster-${index % 2}`;
    const namespace = pick(NAMESPACES, index);
    const name = `${pick(DEPLOYMENTS, index)}-${index}`;
    const reportedByOtel = index % 3 !== 1;
    const reportedByElasticAgent = index % 3 !== 0;
    const desiredReplicas = 1 + (index % 4);

    return {
      'entity.id': `${cluster}/${namespace}/${name}`,
      'k8s.cluster.name': reportedByOtel ? cluster : null,
      'k8s.namespace.name': reportedByOtel ? namespace : null,
      'k8s.deployment.name': reportedByOtel ? name : null,
      'orchestrator.cluster.name': reportedByElasticAgent ? cluster : null,
      'kubernetes.namespace': reportedByElasticAgent ? namespace : null,
      'kubernetes.deployment.name': reportedByElasticAgent ? name : null,
      available_replicas: index % 5 === 4 ? desiredReplicas - 1 : desiredReplicas,
      desired_replicas: desiredReplicas,
      paused: reportedByElasticAgent ? index % 11 === 4 : null,
      app: reportedByElasticAgent ? pick(DEPLOYMENTS, index) : null,
      resource_id: reportedByOtel ? `uid-${String(index).padStart(4, '0')}` : null,
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
    total: rows.length,
    truncated: false,
    errors: [],
    unavailableColumns: [],
  };
};
