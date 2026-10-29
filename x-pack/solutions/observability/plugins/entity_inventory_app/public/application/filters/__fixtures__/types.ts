/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityInventoryTypeDefinition } from '../../../mock_inventory_api/types';

export const typesFixture: EntityInventoryTypeDefinition[] = [
  {
    type: 'host',
    category: 'hosts',
    attributes: [
      { name: 'os.type', dimension: true },
      { name: 'cloud.provider', dimension: true },
      { name: 'host.ip' },
    ],
  },
  {
    type: 'k8s.deployment',
    category: 'kubernetes',
    attributes: [
      { name: 'k8s.cluster.name', dimension: true },
      { name: 'k8s.namespace.name', dimension: true },
      { name: 'cloud.provider', dimension: true },
      { name: 'k8s.deployment.strategy' },
    ],
  },
  {
    type: 'k8s.pod',
    category: 'kubernetes',
    attributes: [
      { name: 'k8s.cluster.name', dimension: true },
      { name: 'k8s.namespace.name', dimension: true },
      { name: 'k8s.pod.phase', dimension: true },
      { name: 'k8s.node.name' },
    ],
  },
];
