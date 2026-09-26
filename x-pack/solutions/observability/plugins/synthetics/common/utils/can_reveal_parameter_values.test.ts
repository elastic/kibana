/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License.
 */

import { canRevealParameterValues } from './can_reveal_parameter_values';

describe('canRevealParameterValues', () => {
  it.each([
    { canSave: true, canReadParamValues: true, expected: true },
    { canSave: true, canReadParamValues: false, expected: false },
    { canSave: false, canReadParamValues: true, expected: false },
    { canSave: false, canReadParamValues: false, expected: false },
  ])(
    'requires both monitor write and parameter-value read privileges',
    ({ canSave, canReadParamValues, expected }) => {
      expect(canRevealParameterValues({ canSave, canReadParamValues })).toBe(expected);
    }
  );
});
