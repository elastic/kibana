/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RULES_API_ALL } from '@kbn/security-solution-features/constants';
import { THREAT_INTEL_READ_AUTHZ, THREAT_INTEL_WRITE_AUTHZ } from './authz';

describe('threat intel route authz', () => {
  it('gates reads on the base Security API privilege', () => {
    expect(THREAT_INTEL_READ_AUTHZ.requiredPrivileges).toEqual(['securitySolution']);
  });

  it('requires more than the base privilege for writes and model calls', () => {
    // Security Read holds `securitySolution`, so requiring only that would let a
    // read-only user add feed sources, ingest reports, and spend model budget.
    expect(THREAT_INTEL_WRITE_AUTHZ.requiredPrivileges).toEqual([
      { allRequired: ['securitySolution', RULES_API_ALL] },
    ]);
  });
});
