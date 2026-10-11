/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { evalGuardedTypedEuids } from './guarded_typed_euid_eval';

describe('evalGuardedTypedEuids', () => {
  it('writes a CASE+MV_APPEND EVAL into the given column', () => {
    const evalClause = evalGuardedTypedEuids('derived_euids');
    expect(evalClause).toContain('| EVAL derived_euids = CASE(');
    expect(evalClause).toContain('MV_APPEND(MV_APPEND(user_euid, host_euid), service_euid)');
    expect(evalClause).toContain('MV_APPEND(user_euid, host_euid)');
    expect(evalClause).toContain('MV_APPEND(user_euid, service_euid)');
    expect(evalClause).toContain('MV_APPEND(host_euid, service_euid)');
  });
});
