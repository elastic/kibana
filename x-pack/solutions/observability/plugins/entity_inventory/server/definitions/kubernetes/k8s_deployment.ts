/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getPresenceFilter } from '@kbn/entity-store/common';
import type { RegistrableEntityDefinition } from '@kbn/entity-store/server';
import { MANAGED_BY } from '../constants';

/**
 * A Kubernetes deployment, identified by `<namespace>/<name>` read from the ECS names. The
 * ECS<->OTel alias layer resolves those names on the OpenTelemetry stream, so one composition
 * serves both sources. The same namespace and name in two clusters land on one id; the cluster is
 * an attribute.
 */
export const k8sDeploymentDefinition: RegistrableEntityDefinition = {
  type: 'k8s.deployment',
  name: 'K8s Deployment',
  description:
    'A Kubernetes deployment, identified by namespace/name. Read from the Elastic Agent Kubernetes integration (state_deployment) and the OpenTelemetry k8sclusterreceiver. The same namespace/name in two clusters is one entity; the cluster is shown as a column.',
  managedBy: MANAGED_BY,
  identityField: {
    euidRanking: {
      branches: [
        {
          ranking: [
            [
              { field: 'kubernetes.namespace' },
              { sep: '/' },
              { field: 'kubernetes.deployment.name' },
            ],
          ],
        },
      ],
    },
    documentsFilter: getPresenceFilter([['kubernetes.namespace', 'kubernetes.deployment.name']]),
  },
  dynamic: {
    displayLabels: [
      { name: 'kubernetes.namespace', label: 'Namespace' },
      { name: 'kubernetes.deployment.name', label: 'Deployment' },
      { name: 'k8s.cluster.name', label: 'Cluster' },
      { name: 'k8s.deployment.available', label: 'Available replicas' },
      { name: 'k8s.deployment.desired', label: 'Desired replicas' },
      { name: 'k8s.deployment.paused', label: 'Paused' },
      { name: 'k8s.deployment.label.app', label: 'App' },
      { name: 'k8s.deployment.uid', label: 'UID' },
    ],
    sources: [
      {
        indexPattern: 'metrics-kubernetes.state_deployment-*',
        filter: 'metricset.name == "state_deployment"',
        attributes: [
          { name: 'k8s.cluster.name', field: 'orchestrator.cluster.name' },
          { name: 'k8s.deployment.available', field: 'kubernetes.deployment.replicas.available' },
          { name: 'k8s.deployment.desired', field: 'kubernetes.deployment.replicas.desired' },
          { name: 'k8s.deployment.paused', field: 'kubernetes.deployment.paused' },
          { name: 'k8s.deployment.label.app', field: 'kubernetes.labels.app' },
        ],
      },
      {
        indexPattern: 'metrics-k8sclusterreceiver.otel-*',
        attributes: [
          { name: 'k8s.cluster.name', field: 'orchestrator.cluster.name' },
          { name: 'k8s.deployment.available', field: 'k8s.deployment.available' },
          { name: 'k8s.deployment.desired', field: 'k8s.deployment.desired' },
          { name: 'k8s.deployment.uid', field: 'k8s.deployment.uid' },
        ],
      },
    ],
    suggestedFilters: ['k8s.cluster.name', 'kubernetes.namespace'],
    category: 'kubernetes',
    icon: 'logoKubernetes',
    // The identity ranks the namespace first, so its first field would name the namespace.
    nameFields: ['kubernetes.deployment.name'],
    // Last seen stands in for restarts and up time until metric columns exist.
    defaultColumns: [
      'kubernetes.namespace',
      'k8s.cluster.name',
      'k8s.deployment.available',
      'last_seen',
    ],
    badgeColumns: ['k8s.cluster.name'],
  },
};
