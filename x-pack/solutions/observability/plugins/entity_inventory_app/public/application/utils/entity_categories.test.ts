/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENTITY_TYPE_ID_PREFIX_BY_CATEGORY, getCategoryOfType } from './entity_categories';
import type { EntityInventoryEntityCategory } from '../../types';

describe('getCategoryOfType', () => {
  it('returns the category whose prefix the type starts with', () => {
    expect(getCategoryOfType('host')).toBe('hosts');
    expect(getCategoryOfType('k8s.deployment')).toBe('kubernetes');
  });

  it('returns undefined for a type that no prefix matches', () => {
    expect(getCategoryOfType('service')).toBeUndefined();
  });

  it('matches a type that only starts with the host prefix', () => {
    expect(getCategoryOfType('host.aws_ec2')).toBe('hosts');
    expect(getCategoryOfType('hostfoo')).toBe('hosts');
  });

  it('does not match the kubernetes prefix without its dot', () => {
    expect(getCategoryOfType('k8s')).toBeUndefined();
  });

  it('agrees with the prefix of every category of the page map', () => {
    (
      Object.entries(ENTITY_TYPE_ID_PREFIX_BY_CATEGORY) as Array<
        [EntityInventoryEntityCategory, string]
      >
    ).forEach(([category, prefix]) => {
      expect(getCategoryOfType(`${prefix}x`)).toBe(category);
    });
  });
});
