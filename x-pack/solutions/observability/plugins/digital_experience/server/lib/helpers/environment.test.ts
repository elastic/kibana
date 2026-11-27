/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENVIRONMENT_NOT_DEFINED_VALUE } from '@kbn/apm-types';
import { sortEnvironments, withNotDefined } from './environment';

describe('withNotDefined', () => {
  it('adds the "Not defined" sentinel when documents have no environment', () => {
    expect(withNotDefined(['production'], 2)).toEqual([
      'production',
      ENVIRONMENT_NOT_DEFINED_VALUE,
    ]);
  });

  it('leaves it out when every document has an environment', () => {
    expect(withNotDefined(['production', ENVIRONMENT_NOT_DEFINED_VALUE], 0)).toEqual([
      'production',
    ]);
  });
});

describe('sortEnvironments', () => {
  it('lists "Not defined" first, then the names alphabetically, without duplicates', () => {
    expect(
      sortEnvironments(['staging', 'production', ENVIRONMENT_NOT_DEFINED_VALUE, 'staging'])
    ).toEqual([ENVIRONMENT_NOT_DEFINED_VALUE, 'production', 'staging']);
  });

  it('leaves out the names the routes do not accept', () => {
    expect(sortEnvironments(['production', 'x'.repeat(1025)])).toEqual(['production']);
    expect(sortEnvironments(['x'.repeat(1024)])).toHaveLength(1);
  });
});
