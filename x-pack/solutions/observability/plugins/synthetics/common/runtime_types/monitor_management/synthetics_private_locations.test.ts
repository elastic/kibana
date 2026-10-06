/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PrivateLocationCodec } from './synthetics_private_locations';

const location = {
  label: 'Loc',
  id: 'loc-1',
  agentPolicyId: 'ap-1',
};

describe('PrivateLocationCodec', () => {
  it('decodes a location', () => {
    expect(PrivateLocationCodec.safeParse(location).success).toBe(true);
  });

  it('still decodes locations carrying the removed isAgentSharding attribute', () => {
    expect(PrivateLocationCodec.safeParse({ ...location, isAgentSharding: true }).success).toBe(
      true
    );
  });
});
