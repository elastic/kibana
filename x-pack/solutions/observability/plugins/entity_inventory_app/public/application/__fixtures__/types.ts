/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InventoryType, InventoryTypeColumn } from '@kbn/entity-inventory-plugin/common';

export const attributeColumn = (name: string, label?: string): InventoryTypeColumn => ({
  name,
  kind: 'attribute',
  ...(label ? { label } : {}),
});

export const inventoryType = ({
  type,
  ...overrides
}: Partial<InventoryType> & Pick<InventoryType, 'type'>): InventoryType => ({
  type,
  name: type,
  identityFields: [],
  columns: [],
  suggestedFilters: [],
  sources: [],
  ...overrides,
});

export const typesFixture: InventoryType[] = [
  inventoryType({
    type: 'host',
    name: 'Host',
    sources: [{ indexPattern: 'metrics-hostmetricsreceiver.otel-*' }],
    columns: [
      attributeColumn('os.type'),
      attributeColumn('cloud.provider'),
      attributeColumn('host.ip'),
    ],
    suggestedFilters: ['os.type', 'cloud.provider'],
  }),
  inventoryType({
    type: 'k8s.deployment',
    name: 'Deployment',
    sources: [{ indexPattern: 'metrics-k8sclusterreceiver.otel-*' }],
    columns: [
      attributeColumn('k8s.cluster.name'),
      attributeColumn('k8s.namespace.name'),
      attributeColumn('cloud.provider'),
      attributeColumn('k8s.deployment.strategy'),
    ],
    suggestedFilters: ['k8s.cluster.name', 'k8s.namespace.name', 'cloud.provider'],
  }),
  inventoryType({
    type: 'k8s.pod',
    name: 'Pod',
    sources: [{ indexPattern: 'metrics-k8sclusterreceiver.otel-*' }],
    columns: [
      attributeColumn('k8s.cluster.name'),
      attributeColumn('k8s.namespace.name'),
      attributeColumn('k8s.pod.phase'),
      attributeColumn('k8s.node.name'),
    ],
    suggestedFilters: ['k8s.cluster.name', 'k8s.namespace.name', 'k8s.pod.phase'],
  }),
];
