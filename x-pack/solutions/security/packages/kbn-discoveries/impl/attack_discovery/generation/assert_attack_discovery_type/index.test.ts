/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { assertAttackDiscoveryType } from '.';

describe('assertAttackDiscoveryType', () => {
  it('does not throw for attack_discovery', () => {
    expect(() => assertAttackDiscoveryType({ type: 'attack_discovery' })).not.toThrow();
  });

  it('throws for unknown types', () => {
    expect(() => assertAttackDiscoveryType({ type: 'bad_type' })).toThrow(
      'Unknown insight type: bad_type'
    );
  });
});
