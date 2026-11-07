/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { entitySchema } from '@kbn/entity-store/common';
import {
  generateCountQuery,
  generateListQueries,
  getDynamicBlock,
  planSources,
} from '../generator';
import type { QueryEngine, TimeWindow } from '../generator';
import {
  K8S_ENTITY_DEFINITIONS,
  k8sClusterDefinition,
  k8sDaemonSetDefinition,
  k8sDeploymentDefinition,
  k8sNamespaceDefinition,
  k8sNodeDefinition,
  k8sPodDefinition,
  k8sStatefulSetDefinition,
} from './k8s_definitions';

const window: TimeWindow = { from: '2026-11-02T10:00:00.000Z', to: '2026-11-02T11:00:00.000Z' };

const cases = K8S_ENTITY_DEFINITIONS.map((definition) => [definition.type, definition] as const);

describe('k8s entity definitions', () => {
  it('declares each type once', () => {
    expect(K8S_ENTITY_DEFINITIONS.map(({ type }) => type)).toEqual([
      'k8s.node',
      'k8s.deployment',
      'k8s.pod',
      'k8s.daemonset',
      'k8s.statefulset',
      'k8s.namespace',
      'k8s.cluster',
    ]);
  });

  it.each(cases)('%s parses against the store definition schema', (type, definition) => {
    const result = entitySchema.safeParse({ ...definition, id: `${type}-default` });
    expect(result.error?.issues).toBeUndefined();
    expect(result.data?.dynamic).toEqual(definition.dynamic);
  });

  it.each(cases)('%s is managed by the inventory plugin', (_type, definition) => {
    expect(definition.managedBy).toEqual({ kind: 'plugin', id: 'entityInventory' });
  });

  it.each(cases)(
    '%s generates a list query per source and one count query',
    (_type, definition) => {
      const sources = getDynamicBlock(definition).sources;
      const plans = planSources(
        definition,
        sources.map((): QueryEngine => 'TS')
      );

      const listQueries = generateListQueries(definition, plans, window, 10000);
      const countQuery = generateCountQuery(definition, plans, window);

      expect(listQueries).toHaveLength(sources.length);
      expect(countQuery.esql).toContain('COUNT(*)');
    }
  );

  it('identifies a pod by uid and reads the name, namespace and node as attributes', () => {
    const attributes = (k8sPodDefinition.dynamic?.sources ?? []).flatMap(
      ({ attributes: sourceAttributes = [] }) => sourceAttributes.map(({ name }) => name)
    );

    expect(k8sPodDefinition.identityField).toEqual({ singleField: 'k8s.pod.uid' });
    expect(attributes).toEqual(
      expect.arrayContaining(['k8s.pod.name', 'k8s.namespace.name', 'k8s.node.name'])
    );
  });

  it.each([
    ['k8s.deployment', k8sDeploymentDefinition, 'k8s.deployment.name'],
    ['k8s.daemonset', k8sDaemonSetDefinition, 'k8s.daemonset.name'],
    ['k8s.statefulset', k8sStatefulSetDefinition, 'k8s.statefulset.name'],
  ])('%s is identified by namespace and its own name', (_type, definition, nameField) => {
    const identity = JSON.stringify(definition.identityField);

    expect(identity).toContain('k8s.namespace.name');
    expect(identity).toContain(nameField);
  });

  it('identifies a node, a namespace and a cluster by one field each', () => {
    expect(k8sNodeDefinition.identityField).toEqual({ singleField: 'k8s.node.name' });
    expect(k8sNamespaceDefinition.identityField).toEqual({ singleField: 'k8s.namespace.name' });
    expect(k8sClusterDefinition.identityField).toEqual({ singleField: 'k8s.cluster.name' });
  });
});
