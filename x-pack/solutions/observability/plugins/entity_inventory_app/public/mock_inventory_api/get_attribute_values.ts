/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  EntityInventoryAttributeValuesParams,
  EntityInventoryAttributeValuesResponse,
} from '../inventory_api_types';

// TODO: fake entities that stand in for the data the values route would aggregate. Replace with the real route in https://github.com/elastic/observability-dev/issues/6355
const MOCK_ENTITIES: Array<Record<string, string>> = [
  {
    type: 'host.aws_ec2',
    'os.type': 'linux',
    'cloud.provider': 'aws',
    'service.name': 'cartservice',
  },
  {
    type: 'host.aws_ec2',
    'os.type': 'linux',
    'cloud.provider': 'aws',
    'service.name': 'checkoutservice',
  },
  {
    type: 'host.gcp_compute_engine',
    'os.type': 'linux',
    'cloud.provider': 'gcp',
    'service.name': 'frontend',
  },
  {
    type: 'host.azure_vm',
    'os.type': 'windows',
    'cloud.provider': 'azure',
    'service.name': 'paymentservice',
  },
  {
    type: 'host.azure_vm',
    'os.type': 'windows',
    'cloud.provider': 'azure',
    'service.name': 'frontend',
  },
  {
    type: 'host.gcp_compute_engine',
    'os.type': 'darwin',
    'cloud.provider': 'gcp',
    'service.name': 'frontend',
  },
  { type: 'host.bare_metal', 'os.type': 'linux', 'service.name': 'cartservice' },
  { type: 'host.vm', 'os.type': 'windows', 'service.name': 'checkoutservice' },
  {
    type: 'k8s.pod',
    'k8s.cluster.name': 'prod-eu',
    'k8s.node.name': 'node-1',
    'k8s.namespace.name': 'checkout',
    'k8s.deployment.name': 'checkoutservice',
  },
  {
    type: 'k8s.pod',
    'k8s.cluster.name': 'prod-eu',
    'k8s.node.name': 'node-2',
    'k8s.namespace.name': 'checkout',
    'k8s.deployment.name': 'cartservice',
  },
  {
    type: 'k8s.pod',
    'k8s.cluster.name': 'prod-eu',
    'k8s.node.name': 'node-2',
    'k8s.namespace.name': 'default',
    'k8s.deployment.name': 'frontend',
  },
  {
    type: 'k8s.pod',
    'k8s.cluster.name': 'prod-us',
    'k8s.node.name': 'node-3',
    'k8s.namespace.name': 'payments',
    'k8s.deployment.name': 'paymentservice',
  },
  {
    type: 'k8s.pod',
    'k8s.cluster.name': 'prod-us',
    'k8s.node.name': 'node-3',
    'k8s.namespace.name': 'default',
    'k8s.deployment.name': 'frontend',
  },
  {
    type: 'k8s.pod',
    'k8s.cluster.name': 'staging',
    'k8s.node.name': 'node-1',
    'k8s.namespace.name': 'default',
    'k8s.deployment.name': 'cartservice',
  },
  { type: 'k8s.deployment', 'k8s.cluster.name': 'prod-eu', 'k8s.namespace.name': 'checkout' },
  { type: 'k8s.deployment', 'k8s.cluster.name': 'staging', 'k8s.namespace.name': 'default' },
];

export const getEntityInventoryAttributeValues = async ({
  attribute,
  types,
  filters,
  selected,
}: EntityInventoryAttributeValuesParams): Promise<EntityInventoryAttributeValuesResponse> => {
  const matchingEntities = MOCK_ENTITIES.filter(
    (entity) =>
      types.includes(entity.type) &&
      Object.entries(filters).every(
        ([name, values]) => values.length === 0 || values.includes(entity[name])
      )
  );
  const values = [
    ...new Set(matchingEntities.map((entity) => entity[attribute]).filter(Boolean)),
  ].sort();

  return { values, invalidSelections: selected.filter((value) => !values.includes(value)) };
};
