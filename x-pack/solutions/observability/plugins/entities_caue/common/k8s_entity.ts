/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Row shape produced by K8S_ENTITIES_QUERY against the entity store latest index.
 * Mirrors the fields kept in common/constants.ts.
 *
 * Fields written by `collectValues` in the entity definitions are multi-value and
 * arrive as `string | string[] | null` — Elasticsearch renders single-element
 * multivalues as scalars, so the client must handle both forms.
 */
export interface K8sEntity {
  'entity.id': string;
  'entity.name': string;
  'entity.EngineMetadata.Type': string;
  // --- collected (multi-value) fields ---
  'k8s.namespace.name': string | string[] | null;
  'kubernetes.namespace': string | string[] | null;
  'k8s.pod.uid': string | string[] | null;
  'k8s.replicaset.name': string | string[] | null;
  'k8s.deployment.name': string | string[] | null;
  'k8s.daemonset.name': string | string[] | null;
  'k8s.node.name': string | string[] | null;
  'service.name': string | string[] | null;
  'fields.cluster': string | string[] | null;
  'kubernetes.container.image': string | string[] | null;
  // --- container status (newestValue, always scalar) ---
  'kubernetes.container.status.phase': string | null;
  'kubernetes.container.status.ready': boolean | null;
  'kubernetes.container.status.reason': string | null;
  // --- lifecycle (newestValue / oldestValue, always scalar) ---
  'entity.lifecycle.first_seen': string | null;
  'entity.lifecycle.last_seen': string | null;
}
