/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityDefinitionWithoutId } from '@kbn/entity-store/common';
import { hostLikeFixture, k8sDeploymentFixture, k8sNodeFixture } from '../__fixtures__/definitions';
import { buildColumns, planColumnNames } from './columns';
import { InventoryDefinitionError } from './errors';
import { resolveIdentityPlan } from './identity';
import { planSources } from './source_plans';
import type { QueryEngine } from './types';

const plansOf = (definition: EntityDefinitionWithoutId) =>
  planSources(
    definition,
    (definition.dynamic?.sources ?? []).map((): QueryEngine => 'FROM')
  );

const columnsOf = (definition: EntityDefinitionWithoutId) =>
  buildColumns(definition, plansOf(definition), resolveIdentityPlan(definition));

describe('buildColumns', () => {
  it.each([
    [
      k8sDeploymentFixture.type,
      k8sDeploymentFixture,
      [
        ['entity.id', 'id'],
        ['kubernetes.namespace', 'identity'],
        ['kubernetes.deployment.name', 'identity'],
        ['cluster', 'attribute'],
        ['paused', 'attribute'],
        ['last_seen', 'last_seen'],
      ],
    ],
    [
      k8sNodeFixture.type,
      k8sNodeFixture,
      [
        ['entity.id', 'id'],
        ['kubernetes.node.name', 'identity'],
        ['cluster', 'attribute'],
        ['os', 'attribute'],
        ['os.type', 'attribute'],
        ['last_seen', 'last_seen'],
      ],
    ],
    [
      hostLikeFixture.type,
      hostLikeFixture,
      [
        ['entity.id', 'id'],
        ['host.id', 'identity'],
        ['host.name', 'identity'],
        ['os', 'attribute'],
        ['last_seen', 'last_seen'],
      ],
    ],
  ] as const)('orders the columns of %s', (_type, definition, expected) => {
    expect(columnsOf(definition).map(({ name, kind }) => [name, kind])).toEqual(expected);
  });

  it('lists an entity.id identity field once, as the id column', () => {
    const definition: EntityDefinitionWithoutId = {
      ...k8sNodeFixture,
      identityField: { singleField: 'entity.id' },
    };
    expect(columnsOf(definition).map(({ name, kind }) => [name, kind])).toEqual([
      ['entity.id', 'id'],
      ['cluster', 'attribute'],
      ['os', 'attribute'],
      ['os.type', 'attribute'],
      ['last_seen', 'last_seen'],
    ]);
  });

  it('merges an attribute declared by two sources into one column recording both fields', () => {
    const attributes = columnsOf(k8sDeploymentFixture).filter(({ kind }) => kind === 'attribute');
    expect(attributes).toEqual([
      {
        name: 'cluster',
        kind: 'attribute',
        fieldByPlan: { 0: 'orchestrator.cluster.name', 1: 'orchestrator.cluster.name' },
      },
      { name: 'paused', kind: 'attribute', fieldByPlan: { 1: 'kubernetes.deployment.paused' } },
    ]);
  });

  it.each(['last_seen', 'entity.id'])('throws when an attribute is named %s', (name) => {
    const definition: EntityDefinitionWithoutId = {
      ...k8sNodeFixture,
      dynamic: {
        sources: [{ indexPattern: 'metrics-*', attributes: [{ name, field: 'some.field' }] }],
      },
    };
    expect(() => columnsOf(definition)).toThrow(InventoryDefinitionError);
    expect(() => columnsOf(definition)).toThrow(
      `attribute name "${name}" is reserved by the inventory query generator for its own output column`
    );
  });

  it('throws when an attribute is named like an identity field', () => {
    const definition: EntityDefinitionWithoutId = {
      ...k8sNodeFixture,
      identityField: { singleField: 'hostname' },
      dynamic: {
        sources: [
          { indexPattern: 'metrics-*', attributes: [{ name: 'hostname', field: 'host.name' }] },
        ],
      },
    };
    expect(() => columnsOf(definition)).toThrow(InventoryDefinitionError);
    expect(() => columnsOf(definition)).toThrow(
      'attribute name "hostname" collides with an identity field of definition "k8s.node"'
    );
  });

  it('throws when an attribute is named like a helper column of the identity compiler', () => {
    const definition: EntityDefinitionWithoutId = {
      ...hostLikeFixture,
      dynamic: {
        sources: [
          {
            indexPattern: 'metrics-*',
            attributes: [{ name: 'host_id_present', field: 'host.os.name' }],
          },
        ],
      },
    };
    expect(() => columnsOf(definition)).toThrow(InventoryDefinitionError);
    expect(() => columnsOf(definition)).toThrow(
      'attribute name "host_id_present" is a column the identity compiler generates for definition "inventory_host"'
    );
  });

  it('throws when a dotted attribute name equals an identity field', () => {
    const definition: EntityDefinitionWithoutId = {
      ...k8sNodeFixture,
      identityField: { singleField: 'host.name' },
      dynamic: {
        sources: [
          {
            indexPattern: 'metrics-*',
            attributes: [{ name: 'host.name', field: 'host.hostname' }],
          },
        ],
      },
    };
    expect(() => columnsOf(definition)).toThrow(InventoryDefinitionError);
    expect(() => columnsOf(definition)).toThrow(
      'attribute name "host.name" collides with an identity field of definition "k8s.node"'
    );
  });

  it('records the field of an attribute per plan when the plans read different fields', () => {
    const definition: EntityDefinitionWithoutId = {
      ...k8sNodeFixture,
      dynamic: {
        sources: [
          { indexPattern: 'metrics-a-*', attributes: [{ name: 'os', field: 'host.os.name' }] },
          { indexPattern: 'metrics-b-*', attributes: [{ name: 'os', field: 'os.type' }] },
        ],
      },
    };
    expect(columnsOf(definition).filter(({ kind }) => kind === 'attribute')).toEqual([
      { name: 'os', kind: 'attribute', fieldByPlan: { 0: 'host.os.name', 1: 'os.type' } },
    ]);
  });
});

describe('planColumnNames', () => {
  it('lists the columns each plan of k8s.deployment produces', () => {
    const plans = plansOf(k8sDeploymentFixture);
    const columns = buildColumns(
      k8sDeploymentFixture,
      plans,
      resolveIdentityPlan(k8sDeploymentFixture)
    );
    expect(plans.map((plan) => planColumnNames(columns, plan))).toEqual([
      ['entity.id', 'kubernetes.namespace', 'kubernetes.deployment.name', 'cluster', 'last_seen'],
      [
        'entity.id',
        'kubernetes.namespace',
        'kubernetes.deployment.name',
        'cluster',
        'paused',
        'last_seen',
      ],
    ]);
  });
});
