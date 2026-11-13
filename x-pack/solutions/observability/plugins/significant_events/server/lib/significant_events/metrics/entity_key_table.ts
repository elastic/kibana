/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Routes Kubernetes, system, hostmetrics, and APM datasets to deterministic type KIs.
import {
  KUBERNETES_DATASET_FAMILIES,
  KUBERNETES_NODE_DATASETS,
  KUBERNETES_POD_DATASETS,
} from './entity_rows/helpers';
import type { EntityKeyRow } from './entity_rows/types';
import { buildHostQuery, foldHostRows } from './hosts';
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
    subtype: KUBERNETES_ENTITY_STORE_TYPES.node,
    buildQuery: buildNodeQuery,
    foldRows: foldNodeRows,
  },
  {
    id: 'ecs.k8s_namespaces',
    families: KUBERNETES_DATASET_FAMILIES,
    datasets: KUBERNETES_POD_DATASETS,
    subtype: KUBERNETES_ENTITY_STORE_TYPES.namespace,
    buildQuery: buildNamespaceQuery,
    foldRows: foldNamespaceRows,
  },
  {
    id: 'metrics.hosts',
    families: ['system', 'hostmetricsreceiver'],
    datasets: ['hostmetricsreceiver.otel'],
    datasetPrefixes: ['system.'],
    subtype: 'host',
    buildQuery: buildHostQuery,
    foldRows: foldHostRows,
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
