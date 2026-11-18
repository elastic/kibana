/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  EntityInventoryTypeDefinition,
  EntityInventoryTypeSource,
} from '../inventory_api_types';

// TODO: hardcoded types, as the `types` route would return them. Replace with the real route in https://github.com/elastic/observability-dev/issues/6355
const OS = { name: 'os.type', label: 'Operating system', dimension: true };
const CLOUD_PROVIDER = { name: 'cloud.provider', label: 'Cloud provider', dimension: true };
const SERVICE = { name: 'service.name', label: 'Service name', dimension: true };
const CLUSTER = { name: 'k8s.cluster.name', label: 'Cluster', dimension: true };
const NODE = { name: 'k8s.node.name', label: 'Node', dimension: true };
const NAMESPACE = { name: 'k8s.namespace.name', label: 'Namespace', dimension: true };
const DEPLOYMENT = { name: 'k8s.deployment.name', label: 'Deployment', dimension: true };

const HOST_ATTRIBUTES = [OS, CLOUD_PROVIDER, SERVICE];

const SOURCES_BY_CATEGORY: Record<string, EntityInventoryTypeSource[]> = {
  hosts: [
    { indexPattern: 'metrics-hostmetricsreceiver.otel-*' },
    { indexPattern: 'metrics-system.*' },
  ],
  kubernetes: [
    { indexPattern: 'metrics-k8sclusterreceiver.otel-*' },
    { indexPattern: 'metrics-kubeletstatsreceiver.otel-*' },
  ],
};

const MOCK_TYPE_DEFINITIONS: Array<Omit<EntityInventoryTypeDefinition, 'sources'>> = [
  {
    type: 'host.aws_ec2',
    name: 'AWS EC2 instance',
    category: 'hosts',
    attributes: HOST_ATTRIBUTES,
  },
  { type: 'host.azure_vm', name: 'Azure VM', category: 'hosts', attributes: HOST_ATTRIBUTES },
  { type: 'host.bare_metal', name: 'Bare metal', category: 'hosts', attributes: HOST_ATTRIBUTES },
  {
    type: 'host.gcp_compute_engine',
    name: 'GCP Compute Engine',
    category: 'hosts',
    attributes: HOST_ATTRIBUTES,
  },
  { type: 'host.vm', name: 'VM', category: 'hosts', attributes: HOST_ATTRIBUTES },
  { type: 'k8s.cluster', name: 'K8s cluster', category: 'kubernetes', attributes: [] },
  { type: 'k8s.node', name: 'K8s node', category: 'kubernetes', attributes: [CLUSTER] },
  {
    type: 'k8s.namespace',
    name: 'K8s namespace',
    category: 'kubernetes',
    attributes: [CLUSTER],
  },
  {
    type: 'k8s.pod',
    name: 'K8s pod',
    category: 'kubernetes',
    attributes: [CLUSTER, NODE, NAMESPACE, DEPLOYMENT],
  },
  {
    type: 'k8s.container',
    name: 'K8s container',
    category: 'kubernetes',
    attributes: [CLUSTER, NODE, NAMESPACE, DEPLOYMENT],
  },
  {
    type: 'k8s.deployment',
    name: 'K8s deployment',
    category: 'kubernetes',
    attributes: [CLUSTER, NAMESPACE],
  },
  {
    type: 'k8s.cronjob',
    name: 'K8s cronjob',
    category: 'kubernetes',
    attributes: [CLUSTER, NAMESPACE],
  },
  {
    type: 'k8s.daemonset',
    name: 'K8s daemonset',
    category: 'kubernetes',
    attributes: [CLUSTER, NAMESPACE],
  },
  {
    type: 'k8s.replicaset',
    name: 'K8s replicaset',
    category: 'kubernetes',
    attributes: [CLUSTER, NAMESPACE, DEPLOYMENT],
  },
  {
    type: 'k8s.statefulset',
    name: 'K8s statefulset',
    category: 'kubernetes',
    attributes: [CLUSTER, NAMESPACE],
  },
];

const MOCK_TYPES: EntityInventoryTypeDefinition[] = MOCK_TYPE_DEFINITIONS.map((definition) => ({
  ...definition,
  sources: SOURCES_BY_CATEGORY[definition.category ?? ''] ?? [],
}));

export const getEntityInventoryTypes = async (): Promise<EntityInventoryTypeDefinition[]> =>
  MOCK_TYPES;
