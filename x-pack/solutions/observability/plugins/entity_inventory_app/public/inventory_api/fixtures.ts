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

/** The list scenarios the fixture client can return. */
export type FixtureScenario =
  | 'normal'
  | 'truncated'
  | 'countFailed'
  | 'withDiagnostics'
  | 'empty'
  | 'allSourcesFailed';

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

const K8S_DEPLOYMENT_LIST_COLUMNS: InventoryListColumn[] = [
  { name: 'entity.id', kind: 'id', type: 'keyword' },
  { name: 'kubernetes.namespace', kind: 'identity', type: 'keyword' },
  { name: 'kubernetes.deployment.name', kind: 'identity', type: 'keyword' },
  { name: 'cluster', kind: 'attribute', type: 'keyword' },
  { name: 'paused', kind: 'attribute', type: 'boolean' },
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
  name: 'Deployment',
  identityFields: ['kubernetes.namespace', 'kubernetes.deployment.name'],
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
  { provider: 'gcp', platform: 'gcp_compute_engine', region: 'europe-west1', zone: 'europe-west1-b' },
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

/** Builds `count` deterministic k8s.deployment rows, including paused and null-cluster rows. */
export const buildK8sDeploymentRows = (count: number): InventoryRow[] =>
  Array.from({ length: count }, (_, index) => {
    const namespace = pick(NAMESPACES, index);
    const name = `${pick(DEPLOYMENTS, index)}-${index}`;

    return {
      'entity.id': `k8s.deployment:${namespace}/${name}`,
      'kubernetes.namespace': namespace,
      'kubernetes.deployment.name': name,
      cluster: index % 8 === 6 ? null : `prod-cluster-${index % 2}`,
      paused: index % 11 === 4,
      last_seen: lastSeenAt(index),
    };
  });

const FIXTURES_BY_TYPE: Readonly<
  Record<string, { columns: InventoryListColumn[]; buildRows: (count: number) => InventoryRow[] }>
> = {
  host: { columns: HOST_LIST_COLUMNS, buildRows: buildHostRows },
  'k8s.deployment': { columns: K8S_DEPLOYMENT_LIST_COLUMNS, buildRows: buildK8sDeploymentRows },
};

const NORMAL_ROW_COUNT = 120;
const TRUNCATED_ROW_COUNT = 250;
const TRUNCATED_TOTAL = 12_345;

const SOURCE_ERRORS = [
  {
    indexPattern: 'metrics-system.*-*',
    status: 403,
    reason: 'security_exception: action [indices:data/read/esql] is unauthorized',
  },
  {
    indexPattern: 'metrics-hostmetricsreceiver.otel-*',
    status: null,
    reason: 'timeout: the query did not complete in time',
  },
];

const UNAVAILABLE_COLUMNS = [
  {
    indexPattern: 'metrics-hostmetricsreceiver.otel-*',
    column: 'k8s.cluster.name',
    field: 'k8s.cluster.name',
  },
];

/** Builds the list response of `type` for `scenario`, or `undefined` for an unknown type. */
export const buildListResponseFixture = (
  type: string,
  scenario: FixtureScenario
): InventoryListResponse | undefined => {
  const fixture = FIXTURES_BY_TYPE[type];
  if (!fixture) {
    return undefined;
  }
  const { columns, buildRows } = fixture;
  const base = { columns, errors: [], unavailableColumns: [] };

  switch (scenario) {
    case 'truncated':
      return {
        ...base,
        rows: buildRows(TRUNCATED_ROW_COUNT),
        total: TRUNCATED_TOTAL,
        truncated: true,
      };
    case 'countFailed':
      return { ...base, rows: buildRows(TRUNCATED_ROW_COUNT), total: null, truncated: true };
    case 'withDiagnostics': {
      const rows = buildRows(NORMAL_ROW_COUNT);
      return {
        ...base,
        rows,
        total: rows.length,
        truncated: false,
        errors: SOURCE_ERRORS.slice(0, 1),
        unavailableColumns: UNAVAILABLE_COLUMNS,
      };
    }
    case 'empty':
      return { ...base, rows: [], total: 0, truncated: false };
    case 'allSourcesFailed':
      return { ...base, rows: [], total: null, truncated: true, errors: SOURCE_ERRORS };
    case 'normal': {
      const rows = buildRows(NORMAL_ROW_COUNT);
      return { ...base, rows, total: rows.length, truncated: false };
    }
  }
};
