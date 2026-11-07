/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getPresenceFilter } from '@kbn/entity-store/common';
import type { RegistrableEntityDefinition } from '@kbn/entity-store/server';

/**
 * Kubernetes entity definitions for the inventory, over the OpenTelemetry kubelet stats receiver.
 * Identity and attribute names follow the OTel semantic conventions, like the built-in `host`. The
 * kubernetes integration's ECS names (`kubernetes.*`) are not covered: a definition has one
 * spelling per identity field.
 *
 * The cluster receiver's stream is deliberately not a source. With the default EDOT kube-stack
 * chart (9.5.6), its `k8s_attributes` processor falls back to the connection and overwrites
 * `k8s.pod.name`, `k8s.namespace.name` and `k8s.node.name` with the collector's own pod's values
 * on pod and container documents, so every workload reads as living in the collector's namespace.
 * The kubelet stream carries the right values, for the nodes the daemon collector runs on.
 */

const KUBELET_STATS_RECEIVER = 'metrics-kubeletstatsreceiver.otel-*';

const CLUSTER_ATTRIBUTE = { name: 'k8s.cluster.name', field: 'k8s.cluster.name' };

const managedBy: RegistrableEntityDefinition['managedBy'] = {
  kind: 'plugin',
  id: 'entityInventory',
};

export const k8sNodeDefinition: RegistrableEntityDefinition = {
  type: 'k8s.node',
  name: 'Node',
  managedBy,
  identityField: { singleField: 'k8s.node.name' },
  dynamic: {
    sources: [{ indexPattern: KUBELET_STATS_RECEIVER, attributes: [CLUSTER_ATTRIBUTE] }],
  },
};

/**
 * A workload identified by its namespace and its own name, which is how the alert rules that
 * target it group. Pods report the controller that owns them, so a workload is listed while at
 * least one of its pods reports.
 */
const namespacedWorkloadDefinition = (
  type: string,
  name: string,
  nameField: string
): RegistrableEntityDefinition => ({
  type,
  name,
  managedBy,
  identityField: {
    euidRanking: {
      branches: [
        { ranking: [[{ field: 'k8s.namespace.name' }, { sep: '/' }, { field: nameField }]] },
      ],
    },
    documentsFilter: getPresenceFilter([['k8s.namespace.name', nameField]]),
  },
  dynamic: {
    sources: [{ indexPattern: KUBELET_STATS_RECEIVER, attributes: [CLUSTER_ATTRIBUTE] }],
  },
});

export const k8sDeploymentDefinition = namespacedWorkloadDefinition(
  'k8s.deployment',
  'Deployment',
  'k8s.deployment.name'
);

export const k8sDaemonSetDefinition = namespacedWorkloadDefinition(
  'k8s.daemonset',
  'DaemonSet',
  'k8s.daemonset.name'
);

export const k8sStatefulSetDefinition = namespacedWorkloadDefinition(
  'k8s.statefulset',
  'StatefulSet',
  'k8s.statefulset.name'
);

/** Identified by uid. The name, namespace and node are attributes so alerts, which name pods, can be matched. */
const POD_ATTRIBUTES = [
  { name: 'k8s.pod.name', field: 'k8s.pod.name' },
  { name: 'k8s.namespace.name', field: 'k8s.namespace.name' },
  { name: 'k8s.node.name', field: 'k8s.node.name' },
  CLUSTER_ATTRIBUTE,
];

export const k8sPodDefinition: RegistrableEntityDefinition = {
  type: 'k8s.pod',
  name: 'Pod',
  managedBy,
  identityField: { singleField: 'k8s.pod.uid' },
  dynamic: {
    sources: [{ indexPattern: KUBELET_STATS_RECEIVER, attributes: POD_ATTRIBUTES }],
  },
};

/**
 * Identified by the namespace name alone, because most alert rules that target a namespace group
 * by it and cannot supply the cluster. Two clusters with a namespace of the same name therefore
 * read as one entity; the cluster is an attribute.
 */
export const k8sNamespaceDefinition: RegistrableEntityDefinition = {
  type: 'k8s.namespace',
  name: 'Namespace',
  managedBy,
  identityField: { singleField: 'k8s.namespace.name' },
  dynamic: {
    sources: [{ indexPattern: KUBELET_STATS_RECEIVER, attributes: [CLUSTER_ATTRIBUTE] }],
  },
};

export const k8sClusterDefinition: RegistrableEntityDefinition = {
  type: 'k8s.cluster',
  name: 'Cluster',
  managedBy,
  identityField: { singleField: 'k8s.cluster.name' },
  dynamic: {
    sources: [{ indexPattern: KUBELET_STATS_RECEIVER }],
  },
};

export const K8S_ENTITY_DEFINITIONS: readonly RegistrableEntityDefinition[] = [
  k8sNodeDefinition,
  k8sDeploymentDefinition,
  k8sPodDefinition,
  k8sDaemonSetDefinition,
  k8sStatefulSetDefinition,
  k8sNamespaceDefinition,
  k8sClusterDefinition,
];
