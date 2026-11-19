/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Maps Kubernetes type KIs to entity store types; it reads no datasets.
export type WorkloadKind = 'deployment' | 'statefulset' | 'daemonset' | 'cronjob';
export type KubernetesEntityKind = WorkloadKind | 'node' | 'namespace';

export const KUBERNETES_ENTITY_STORE_TYPES = {
  deployment: 'k8s.deployment',
  statefulset: 'k8s.statefulset',
  daemonset: 'k8s.daemonset',
  cronjob: 'k8s.cronjob',
  node: 'k8s.node',
  namespace: 'k8s.namespace',
} as const satisfies Record<KubernetesEntityKind, string>;

export const getKubernetesEntityStoreType = <TKind extends KubernetesEntityKind>(
  kind: TKind
): (typeof KUBERNETES_ENTITY_STORE_TYPES)[TKind] => KUBERNETES_ENTITY_STORE_TYPES[kind];
