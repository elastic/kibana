/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildMitreEntitiesQueryParams } from './build_mitre_entities_query_params';

describe('buildMitreEntitiesQueryParams', () => {
  it('returns an empty object when called with an empty params object', () => {
    expect(buildMitreEntitiesQueryParams({})).toEqual({});
  });

  it('includes all params when all fields are set', () => {
    const result = buildMitreEntitiesQueryParams({
      framework: 'enterprise',
      framework_version: '15.1',
      types: ['tactic', 'technique', 'subtechnique'],
      status: 'all',
    });
    expect(result).toEqual({
      framework: 'enterprise',
      framework_version: '15.1',
      types: 'tactic,technique,subtechnique',
      status: 'all',
    });
  });

  it('joins types arrays as comma-separated strings', () => {
    const result = buildMitreEntitiesQueryParams({ types: ['tactic', 'technique'] });
    expect(result.types).toBe('tactic,technique');
  });

  it('omits types when the array is empty', () => {
    const result = buildMitreEntitiesQueryParams({ types: [] });
    expect(result).not.toHaveProperty('types');
  });

  it('omits undefined fields', () => {
    const result = buildMitreEntitiesQueryParams({ framework: 'enterprise' });
    expect(result).toEqual({ framework: 'enterprise' });
    expect(result).not.toHaveProperty('framework_version');
    expect(result).not.toHaveProperty('types');
    expect(result).not.toHaveProperty('status');
  });
});
