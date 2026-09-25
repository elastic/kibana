/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PrivateLocationAttributesCodec } from './private_locations';

const location = {
  label: 'Loc',
  id: 'loc-1',
  agentPolicyId: 'ap-1',
  isServiceManaged: false,
};

describe('PrivateLocationAttributesCodec', () => {
  it('decodes a location', () => {
    expect(PrivateLocationAttributesCodec.safeParse(location).success).toBe(true);
  });

  it('still decodes saved objects written with the removed isAgentSharding attribute', () => {
    expect(
      PrivateLocationAttributesCodec.safeParse({ ...location, isAgentSharding: true }).success
    ).toBe(true);
  });
});
