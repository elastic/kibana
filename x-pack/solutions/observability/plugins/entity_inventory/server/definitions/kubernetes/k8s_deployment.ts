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
 * A Kubernetes deployment, identified by `<cluster>/<namespace>/<name>`. The ranking reads the OpenTelemetry
 * names first and falls back to the Elastic Agent ones, so the same deployment reported under both
 * conventions gets the same id and merges into one entity.
 */
export const k8sDeploymentDefinition: RegistrableEntityDefinition = {
  type: 'k8s.deployment',
  name: 'K8s Deployment',
  description:
    'A Kubernetes deployment, identified by namespace/name. Read from the Elastic Agent Kubernetes integration (state_deployment) and the OpenTelemetry k8sclusterreceiver.',
  managedBy: MANAGED_BY,
  identityField: {
    euidRanking: {
      branches: [
        {
          ranking: [
            [
              { field: 'k8s.cluster.name' },
              { sep: '/' },
              { field: 'k8s.namespace.name' },
              { sep: '/' },
              { field: 'k8s.deployment.name' },
            ],
            [
              { field: 'orchestrator.cluster.name' },
              { sep: '/' },
              { field: 'kubernetes.namespace' },
              { sep: '/' },
              { field: 'kubernetes.deployment.name' },
            ],
          ],
        },
      ],
    },
    documentsFilter: getPresenceFilter([
      ['k8s.cluster.name', 'k8s.namespace.name', 'k8s.deployment.name'],
      ['orchestrator.cluster.name', 'kubernetes.namespace', 'kubernetes.deployment.name'],
    ]),
  },
  dynamic: {
    sources: [
      {
        indexPattern: 'metrics-kubernetes.state_deployment-*',
        filter: 'metricset.name == "state_deployment"',
        attributes: [
          { name: 'available_replicas', field: 'kubernetes.deployment.replicas.available' },
          { name: 'desired_replicas', field: 'kubernetes.deployment.replicas.desired' },
          { name: 'paused', field: 'kubernetes.deployment.paused' },
          { name: 'app', field: 'kubernetes.labels.app' },
        ],
      },
      {
        indexPattern: 'metrics-k8sclusterreceiver.otel-*',
        attributes: [
          { name: 'available_replicas', field: 'k8s.deployment.available' },
          { name: 'desired_replicas', field: 'k8s.deployment.desired' },
          { name: 'resource_id', field: 'k8s.deployment.uid' },
        ],
      },
    ],
  },
};
