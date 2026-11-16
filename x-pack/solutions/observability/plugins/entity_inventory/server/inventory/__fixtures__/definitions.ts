/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Test fixtures only. Nothing registers these, and like every `__fixtures__` directory this one is
 * left out of the distributable, so an import from production code fails the build rather than
 * shipping them.
 *
 * Each fixture carries `dynamic` and no `extraction`, shaped like a definition this plugin will
 * register, so the generator is tested against the store's schema. Index patterns and field names
 * are illustrative and not checked against data.
 */

import { getPresenceFilter } from '@kbn/entity-store/common';
import type {
  EntityDefinitionManagedBy,
  EntityDefinitionWithoutId,
} from '@kbn/entity-store/common';

/** A fixture with `managedBy` set, so it can go straight to the registry in tests. */
export type InventoryDefinitionFixture = EntityDefinitionWithoutId & {
  managedBy: EntityDefinitionManagedBy;
};

const managedBy: EntityDefinitionManagedBy = { kind: 'plugin', id: 'entityInventory' };

export const k8sDeploymentFixture: InventoryDefinitionFixture = {
  type: 'k8s.deployment',
  name: 'Deployment',
  managedBy,
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
    sources: [
      {
        indexPattern: 'metrics-kubeletstatsreceiver.otel-default',
        attributes: [{ name: 'cluster', field: 'orchestrator.cluster.name' }],
      },
      {
        indexPattern: 'metrics-kubernetes.state_deployment-*',
        filter: 'metricset.name == "state_deployment"',
        attributes: [
          { name: 'cluster', field: 'orchestrator.cluster.name' },
          { name: 'paused', field: 'kubernetes.deployment.paused' },
        ],
      },
    ],
  },
};

export const k8sNodeFixture: InventoryDefinitionFixture = {
  type: 'k8s.node',
  name: 'Node',
  managedBy,
  identityField: { singleField: 'kubernetes.node.name' },
  dynamic: {
    sources: [
      {
        indexPattern: 'metrics-kubeletstatsreceiver.otel-default',
        attributes: [
          { name: 'cluster', field: 'orchestrator.cluster.name' },
          { name: 'os', field: 'host.os.name' },
          { name: 'os.type', field: 'host.os.type' },
        ],
      },
    ],
  },
};

/** A ranked identity shaped like the built-in `host`, under another type name. */
export const hostLikeFixture: InventoryDefinitionFixture = {
  type: 'inventory_host',
  name: 'Host',
  managedBy,
  identityField: {
    euidRanking: {
      branches: [{ ranking: [[{ field: 'host.id' }], [{ field: 'host.name' }]] }],
    },
    documentsFilter: getPresenceFilter([['host.id'], ['host.name']]),
  },
  dynamic: {
    sources: [
      {
        indexPattern: 'metrics-system.*',
        attributes: [{ name: 'os', field: 'host.os.name' }],
      },
    ],
  },
};

/** Every fixture above. */
export const INVENTORY_DEFINITION_FIXTURES: readonly InventoryDefinitionFixture[] = [
  k8sDeploymentFixture,
  k8sNodeFixture,
  hostLikeFixture,
];

/**
 * An identity on `entity.id`, like the built-in `generic` but keeping the type prefix, with the
 * `k8s.node` sources. Left out of the list above: its list query carries a raw column.
 */
export const entityIdFixture: InventoryDefinitionFixture = {
  ...k8sNodeFixture,
  type: 'inventory_generic',
  name: 'Generic',
  identityField: { singleField: 'entity.id' },
};

/**
 * A `k8s.deployment` ranking the OpenTelemetry names before the Elastic Agent ones, read from both
 * conventions' sources, with a description. Left out of the list above too.
 */
export const k8sDeploymentOtelAndAgentFixture: InventoryDefinitionFixture = {
  type: 'k8s.deployment',
  name: 'K8s Deployment',
  description:
    'A Kubernetes deployment, identified by cluster/namespace/name. Read from the Elastic Agent Kubernetes integration (state_deployment) and the OpenTelemetry k8sclusterreceiver.',
  managedBy,
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

/** A ranking led by `entity.id`, with the host-like sources. Left out of the list above too. */
export const rankedEntityIdFixture: InventoryDefinitionFixture = {
  ...hostLikeFixture,
  type: 'inventory_ranked_generic',
  name: 'Ranked generic',
  identityField: {
    euidRanking: {
      branches: [{ ranking: [[{ field: 'entity.id' }], [{ field: 'host.hostname' }]] }],
    },
    documentsFilter: getPresenceFilter([['entity.id'], ['host.hostname']]),
  },
};
