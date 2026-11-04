/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENVIRONMENT_NOT_DEFINED_VALUE } from '@kbn/apm-types';
import { environmentsOf, pickerEnvironments } from './environments';

const terms = (...keys: string[]) => ({ buckets: keys.map((key) => ({ key })) });

describe('environmentsOf', () => {
  it('merges both environment fields of every aggregation, without duplicates', () => {
    expect(
      environmentsOf(
        { environments: terms('production'), environmentNames: terms('production', 'staging') },
        { environments: terms('canary'), environmentNames: terms() }
      )
    ).toEqual(['production', 'staging', 'canary']);
  });

  it('skips missing aggregations', () => {
    expect(
      environmentsOf(undefined, { environments: terms('dev'), environmentNames: terms() })
    ).toEqual(['dev']);
  });
});

describe('pickerEnvironments', () => {
  const aggregations = (notDefinedCount: number) => ({
    environments: terms('production'),
    environmentNames: terms('staging'),
    environmentNotDefined: { doc_count: notDefinedCount },
    inEnvironment: {},
  });

  it('adds "Not defined" when some documents have no environment', () => {
    expect(pickerEnvironments(aggregations(3))).toEqual([
      'production',
      'staging',
      ENVIRONMENT_NOT_DEFINED_VALUE,
    ]);
  });

  it('lists only the names when every document has an environment', () => {
    expect(pickerEnvironments(aggregations(0))).toEqual(['production', 'staging']);
  });

  it('is empty without aggregations, as when the index does not exist', () => {
    expect(pickerEnvironments()).toEqual([]);
  });
});
