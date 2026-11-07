/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { aliasVariants, ECS_ALIASES } from './field_aliases';

describe('aliasVariants', () => {
  it('offers the key itself first, then its ECS spelling', () => {
    expect(aliasVariants(['k8s.pod.uid'])).toEqual([['k8s.pod.uid'], ['kubernetes.pod.uid']]);
  });

  it('spells every column of a composed key in ECS together', () => {
    expect(aliasVariants(['k8s.namespace.name', 'k8s.deployment.name'])).toEqual([
      ['k8s.namespace.name', 'k8s.deployment.name'],
      ['kubernetes.namespace', 'kubernetes.deployment.name'],
    ]);
  });

  it('offers only the key itself when a column has no alias, never a mix of spellings', () => {
    expect(aliasVariants(['k8s.pod.uid', 'host.name'])).toEqual([['k8s.pod.uid', 'host.name']]);
  });

  it('offers only the key itself for a field that is the same in both conventions', () => {
    expect(aliasVariants(['host.name'])).toEqual([['host.name']]);
  });

  it('skips the ECS spelling when another key already is it', () => {
    const own = ['k8s.pod.uid'];
    const ecs = ['kubernetes.pod.uid'];

    expect(aliasVariants(own, [own, ecs])).toEqual([own]);
    expect(aliasVariants(own, [own])).toEqual([own, ecs]);
  });

  it('has no alias that equals its own column', () => {
    Object.entries(ECS_ALIASES).forEach(([column, alias]) => expect(alias).not.toBe(column));
  });
});
