/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isRight } from 'fp-ts/Either';
import { PrivateLocationCodec } from './synthetics_private_locations';

const classic = {
  label: 'Loc',
  id: 'loc-1',
  agentPolicyId: 'ap-1',
};

describe('PrivateLocationCodec isAgentSharding', () => {
  it('decodes a classic location without the flag', () => {
    expect(isRight(PrivateLocationCodec.decode(classic))).toBe(true);
  });

  it('decodes a scalable location with the flag', () => {
    const result = PrivateLocationCodec.decode({ ...classic, isAgentSharding: true });
    expect(isRight(result)).toBe(true);
    if (isRight(result)) {
      expect(result.right.isAgentSharding).toBe(true);
    }
  });

  it('rejects a non-boolean flag', () => {
    expect(isRight(PrivateLocationCodec.decode({ ...classic, isAgentSharding: 'yes' }))).toBe(
      false
    );
  });
});
