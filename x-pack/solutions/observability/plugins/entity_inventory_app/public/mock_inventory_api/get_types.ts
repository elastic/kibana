/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityInventoryTypeDefinition } from '../inventory_api_types';

const MOCK_TYPES: EntityInventoryTypeDefinition[] = [
  {
    type: 'host',
    name: 'Host',
    category: 'hosts',
    attributes: [
      { name: 'os.type', dimension: true },
      { name: 'host.arch', dimension: true },
      { name: 'cloud.provider', dimension: true },
      { name: 'cloud.region', dimension: true },
      { name: 'os.version' },
      { name: 'host.ip' },
    ],
  },
  {
    type: 'k8s.deployment',
    name: 'Deployment',
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
    name: 'Pod',
    category: 'kubernetes',
    attributes: [
      { name: 'k8s.cluster.name', dimension: true },
      { name: 'k8s.namespace.name', dimension: true },
      { name: 'k8s.pod.phase', dimension: true },
      { name: 'k8s.node.name' },
    ],
  },
];

export const getEntityInventoryTypes = async (): Promise<EntityInventoryTypeDefinition[]> =>
  MOCK_TYPES;
