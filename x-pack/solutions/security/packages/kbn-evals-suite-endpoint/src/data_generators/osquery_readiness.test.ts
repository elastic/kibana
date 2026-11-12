/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { assertOsqueryLiveQuerySupported } from './osquery_readiness';

describe('assertOsqueryLiveQuerySupported', () => {
  it('throws when no online Osquery-capable Fleet agent exists', () => {
    expect(() =>
      assertOsqueryLiveQuerySupported(
        {
          packageInstalled: true,
          osqueryAgentPolicyIds: ['policy-1'],
          onlineOsqueryAgents: 0,
        },
        'Endpoint Forensic Analysis — Osquery live state'
      )
    ).toThrow(
      'Endpoint Forensic Analysis — Osquery live state requires an online Fleet agent enrolled in an Osquery-capable policy'
    );
  });

  it('does not throw when an online Osquery-capable Fleet agent exists', () => {
    expect(() =>
      assertOsqueryLiveQuerySupported(
        {
          packageInstalled: true,
          osqueryAgentPolicyIds: ['policy-1'],
          onlineOsqueryAgents: 1,
        },
        'Endpoint Forensic Analysis — Osquery live state'
      )
    ).not.toThrow();
  });
});
