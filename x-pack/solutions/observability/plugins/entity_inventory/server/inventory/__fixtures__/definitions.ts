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
