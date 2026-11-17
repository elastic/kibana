/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euid } from '@kbn/entity-store/common/euid_helpers';
import { k8sDeploymentDefinition } from './kubernetes/k8s_deployment';

// Pins the identity of a registered type: a change to these snapshots changes every k8s.deployment id.
describe('k8s.deployment identity', () => {
  it('compiles the ES|QL entity id evaluation', () => {
    expect(euid.esql.getEuidEvaluation(k8sDeploymentDefinition, 'entity.id')).toMatchSnapshot();
  });

  it('compiles the ES|QL identity presence predicate', () => {
    expect(euid.esql.getEuidDocumentsContainsIdFilter(k8sDeploymentDefinition)).toMatchSnapshot();
  });

  it('builds the id from namespace then name', () => {
    expect(
      euid.getEuidFromObject(k8sDeploymentDefinition, {
        kubernetes: { namespace: 'default', deployment: { name: 'api' } },
      })
    ).toBe('k8s.deployment:default/api');
  });

  it.each([
    ['namespace', { kubernetes: { deployment: { name: 'api' } } }],
    ['deployment name', { kubernetes: { namespace: 'default' } }],
  ])('builds no id without the %s', (_missing, doc) => {
    expect(euid.getEuidFromObject(k8sDeploymentDefinition, doc)).toBeUndefined();
  });
});
