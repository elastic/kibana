/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Routes Kubernetes, system, hostmetrics, and APM datasets to pet or per-cluster cattle rows.
import {
  KUBERNETES_CLUSTER_DATASETS,
  KUBERNETES_DATASET_FAMILIES,
  KUBERNETES_NODE_DATASETS,
  KUBERNETES_POD_DATASETS,
} from './entity_rows/helpers';
import type { EntityKeyRow } from './entity_rows/types';
import {
  buildOtelHostQuery,
  buildSystemHostQuery,
  foldOtelHostRows,
  foldSystemHostRows,
} from './hosts';
import { buildClusterQuery, foldClusterRows } from './kubernetes/cluster';
import { KUBERNETES_ENTITY_STORE_TYPES } from './kubernetes/ids';
import { buildNamespaceQuery, foldNamespaceRows } from './kubernetes/namespaces';
import { buildNodeQuery, foldNodeRows } from './kubernetes/nodes';
import { buildWorkloadQuery, foldWorkloadRows } from './kubernetes/workloads';
import { buildServiceQuery, foldServiceRows } from './services';

export const ENTITY_KEY_TABLE: readonly EntityKeyRow[] = [
  {
    id: 'ecs.k8s_workload',
    families: KUBERNETES_DATASET_FAMILIES,
    datasets: KUBERNETES_POD_DATASETS,
    subtype: KUBERNETES_ENTITY_STORE_TYPES.deployment,
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
    subtype: KUBERNETES_ENTITY_STORE_TYPES.cluster,
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
