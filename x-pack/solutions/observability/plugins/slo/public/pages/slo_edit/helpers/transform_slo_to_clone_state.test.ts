/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformSloToCloneState } from './transform_slo_to_clone_state';
import { buildSlo } from '../../../data/slo/slo';

describe('transformSloToCloneState', () => {
  it('returns only a subset of the SLO fields used to populate the Edit form', () => {
    const state = transformSloToCloneState(buildSlo());
    expect(Object.keys(state)).toEqual([
      'id',
      'name',
      'description',
      'tags',
      'objective',
      'indicator',
      'settings',
      'budgetingMethod',
      'timeWindow',
      'groupBy',
    ]);
    expect(state.id).toBeUndefined();
    expect(state.name).toMatch(/^\[Copy\] /);
  });
});
