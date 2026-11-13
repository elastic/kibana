/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Builds stable IDs for Kubernetes cluster and workload pet KIs; it reads no datasets.
export type WorkloadKind = 'deployment' | 'statefulset' | 'daemonset' | 'cronjob';
type KubernetesEntityKind = WorkloadKind | 'cluster';

export const KUBERNETES_ENTITY_STORE_TYPES = {
  deployment: 'k8s.deployment',
  statefulset: 'k8s.statefulset',
  daemonset: 'k8s.daemonset',
  cronjob: 'k8s.cronjob',
  cluster: 'k8s.cluster',
} as const satisfies Record<KubernetesEntityKind, string>;

type KubernetesEntityIdentity =
  | { kind: WorkloadKind; namespace: string; name: string }
  | { kind: 'cluster'; name: string };

export const getKubernetesEntityStoreType = <TKind extends KubernetesEntityKind>(
  kind: TKind
): (typeof KUBERNETES_ENTITY_STORE_TYPES)[TKind] => KUBERNETES_ENTITY_STORE_TYPES[kind];

export const buildKubernetesEntityId = (identity: KubernetesEntityIdentity): string => {
  const type = getKubernetesEntityStoreType(identity.kind);
  return 'namespace' in identity
    ? `${type}:${identity.namespace}/${identity.name}`
    : `${type}:${identity.name}`;
};
