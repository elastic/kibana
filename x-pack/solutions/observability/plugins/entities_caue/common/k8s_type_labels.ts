/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Human-readable label for each Kubernetes entity type. */
export const K8S_TYPE_LABELS: Record<string, string> = {
  'k8s.pod': 'Pod',
  'k8s.container': 'Container',
  'k8s.deployment': 'Deployment',
  'k8s.replicaset': 'ReplicaSet',
  'k8s.namespace': 'Namespace',
  'k8s.node': 'Node',
  'k8s.daemonset': 'DaemonSet',
};
