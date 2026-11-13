/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Shares dataset and value helpers used to find pets and per-cluster cattle in Kubernetes and OTel metrics.
import type { EsqlCell, EsqlRow } from './types';

export const KUBERNETES_POD_DATASETS = ['kubernetes.pod', 'kubeletstatsreceiver.otel'] as const;
export const KUBERNETES_NODE_DATASETS = ['kubernetes.node', 'kubeletstatsreceiver.otel'] as const;
export const KUBERNETES_CLUSTER_DATASETS = [
  'kubernetes.pod',
  'kubernetes.node',
  'kubeletstatsreceiver.otel',
] as const;
export const KUBERNETES_DATASET_FAMILIES = [
  'kubernetes',
  'kubeletstatsreceiver',
  'k8sclusterreceiver',
] as const;

export const UNKNOWN_CLUSTER = '_unknown_cluster';

export const getDatasetFamily = (dataset: string | null): string | undefined =>
  dataset?.split('.')[0];

export const stringsOf = (value: EsqlCell | undefined): string[] => {
  const values = Array.isArray(value) ? value : [value];
  return values.filter((item): item is string => typeof item === 'string').sort();
};

export const clustersOf = (value: EsqlCell | undefined): string[] => {
  const clusters = stringsOf(value);
  return clusters.length > 0 ? clusters : [UNKNOWN_CLUSTER];
};

export const quoteEsqlString = (value: string): string =>
  `"${value.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`;

export const replicasOf = (row: EsqlRow): number =>
  typeof row.replicas === 'number' ? row.replicas : 0;

export const lastSeenOf = (row: EsqlRow): string =>
  typeof row.last_seen === 'string' ? row.last_seen : '';

export const formatDatasetList = (datasets: readonly string[]): string =>
  datasets.map((dataset) => `"${dataset}"`).join(', ');
