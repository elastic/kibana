/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { entitySchema } from '@kbn/entity-store/common';
import { MANAGED_BY } from './constants';
import { k8sDeploymentDefinition } from './kubernetes/k8s_deployment';
import { ENTITY_DEFINITIONS } from '.';

describe('registered entity definitions', () => {
  const cases = ENTITY_DEFINITIONS.map((definition) => [definition.type, definition] as const);

  it('registers k8s.deployment', () => {
    expect(ENTITY_DEFINITIONS).toContain(k8sDeploymentDefinition);
    expect(ENTITY_DEFINITIONS.map(({ type }) => type)).toContain('k8s.deployment');
  });

  it('declares every type name once', () => {
    const types = ENTITY_DEFINITIONS.map(({ type }) => type);
    expect(types).toEqual([...new Set(types)]);
  });

  it.each(cases)('%s parses against the store definition schema', (type, definition) => {
    const result = entitySchema.safeParse({ ...definition, id: `${type}-default` });
    expect(result.error?.issues).toBeUndefined();
    expect(result.data?.dynamic).toEqual(definition.dynamic);
  });

  it.each(cases)('%s is managed by this plugin', (_type, definition) => {
    expect(definition.managedBy).toEqual(MANAGED_BY);
  });

  it.each(cases)('%s carries no extraction block', (_type, definition) => {
    expect(definition.extraction).toBeUndefined();
  });
});
