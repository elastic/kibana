/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateFixedDecisionValues } from '.';

describe('validateFixedDecisionValues', () => {
  it('returns no errors when both fields are answered', () => {
    expect(
      validateFixedDecisionValues({ decision: 'approve', rationale: 'the host is contained' })
    ).toEqual({});
  });

  it('accepts a dismissal, which needs a rationale just as an approval does', () => {
    expect(
      validateFixedDecisionValues({ decision: 'dismiss', rationale: 'a false positive' })
    ).toEqual({});
  });

  it('reports the decision when it is absent', () => {
    expect(validateFixedDecisionValues({ rationale: 'why' })).toEqual({
      decision: 'This field is required',
    });
  });

  it('reports the decision when it is not one _respond accepts', () => {
    expect(validateFixedDecisionValues({ decision: 'Dismiss', rationale: 'why' })).toEqual({
      decision: 'This field is required',
    });
  });

  it('reports the rationale when it is absent', () => {
    expect(validateFixedDecisionValues({ decision: 'approve' })).toEqual({
      rationale: 'This field is required',
    });
  });

  it('reports the rationale when it is blank after trim', () => {
    expect(validateFixedDecisionValues({ decision: 'approve', rationale: '   ' })).toEqual({
      rationale: 'This field is required',
    });
  });

  it('reports the rationale when it is not a string', () => {
    expect(validateFixedDecisionValues({ decision: 'approve', rationale: 7 })).toEqual({
      rationale: 'This field is required',
    });
  });

  it('reports both when nothing is answered', () => {
    expect(validateFixedDecisionValues({})).toEqual({
      decision: 'This field is required',
      rationale: 'This field is required',
    });
  });
});
