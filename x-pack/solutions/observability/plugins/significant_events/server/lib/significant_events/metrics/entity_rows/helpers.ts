/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Shares dataset and value helpers used to find metrics type KIs.
import type { Condition } from '@kbn/streamlang';
import type { EsqlCell } from './types';

export const KUBERNETES_POD_DATASETS = ['kubernetes.pod', 'kubeletstatsreceiver.otel'] as const;
export const KUBERNETES_NODE_DATASETS = ['kubernetes.node', 'kubeletstatsreceiver.otel'] as const;
export const KUBERNETES_DATASET_FAMILIES = [
  'kubernetes',
  'kubeletstatsreceiver',
  'k8sclusterreceiver',
] as const;

export const getDatasetFamily = (dataset: string | null): string | undefined =>
  dataset?.split('.')[0];

export const stringsOf = (value: EsqlCell | undefined): string[] => {
  const values = Array.isArray(value) ? value : [value];
  return values.filter((item): item is string => typeof item === 'string').sort();
};

export const quoteEsqlString = (value: string): string =>
  `"${value.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`;

export const formatDatasetList = (datasets: readonly string[]): string =>
  datasets.map((dataset) => `"${dataset}"`).join(', ');

export const buildDatasetFilter = (datasets: readonly string[]): Condition => ({
  or: datasets.map((dataset) => ({ field: 'data_stream.dataset', eq: dataset })),
});

export type ClusterScope = { name: string } | { missing: true } | undefined;

const getClusterConditions = (clusterScope: ClusterScope): Condition[] => {
  if (clusterScope === undefined) {
    return [];
  }
  if ('name' in clusterScope) {
    return [{ field: 'orchestrator.cluster.name', eq: clusterScope.name }];
  }
  return [{ not: { field: 'orchestrator.cluster.name', exists: true } }];
};

export const buildScopedFilter = (
  clusterScope: ClusterScope,
  ...conditions: Condition[]
): Condition => ({
  and: [...getClusterConditions(clusterScope), ...conditions],
});
