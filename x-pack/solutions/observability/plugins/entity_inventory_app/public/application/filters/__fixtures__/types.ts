/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityInventoryTypeDefinition } from '../../../inventory_api_types';

export const typesFixture: EntityInventoryTypeDefinition[] = [
  {
    type: 'host',
    name: 'Host',
    category: 'hosts',
    sources: [{ indexPattern: 'metrics-hostmetricsreceiver.otel-*' }],
    attributes: [{ name: 'os.type' }, { name: 'cloud.provider' }, { name: 'host.ip' }],
    suggestedFilters: ['os.type', 'cloud.provider'],
  },
  {
    type: 'k8s.deployment',
    name: 'Deployment',
    category: 'kubernetes',
    sources: [{ indexPattern: 'metrics-k8sclusterreceiver.otel-*' }],
    attributes: [
      { name: 'k8s.cluster.name' },
      { name: 'k8s.namespace.name' },
      { name: 'cloud.provider' },
      { name: 'k8s.deployment.strategy' },
    ],
    suggestedFilters: ['k8s.cluster.name', 'k8s.namespace.name', 'cloud.provider'],
  },
  {
    type: 'k8s.pod',
    name: 'Pod',
    category: 'kubernetes',
    sources: [{ indexPattern: 'metrics-k8sclusterreceiver.otel-*' }],
    attributes: [
      { name: 'k8s.cluster.name' },
      { name: 'k8s.namespace.name' },
      { name: 'k8s.pod.phase' },
      { name: 'k8s.node.name' },
    ],
    suggestedFilters: ['k8s.cluster.name', 'k8s.namespace.name', 'k8s.pod.phase'],
  },
];
