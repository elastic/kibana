/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { canRevealParameterValues } from './can_reveal_parameter_values';

describe('canRevealParameterValues', () => {
  it.each([
    { save: true, canReadParamValues: true, expected: true },
    { save: true, canReadParamValues: false, expected: false },
    { save: false, canReadParamValues: true, expected: false },
    { save: false, canReadParamValues: false, expected: false },
    { save: true, expected: false },
  ])(
    'requires both monitor write and parameter-value read privileges',
    ({ expected, ...capabilities }) => {
      expect(canRevealParameterValues(capabilities)).toBe(expected);
    }
  );

  it('does not reveal when the capabilities are missing', () => {
    expect(canRevealParameterValues(undefined)).toBe(false);
  });
});
