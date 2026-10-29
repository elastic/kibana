/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deriveAutonomyMode } from './derive_autonomy_mode';

describe('deriveAutonomyMode', () => {
  it('returns `auto_accept` for supervised, the only level whose gate auto-approves', () => {
    const result = deriveAutonomyMode('supervised');

    expect(result).toBe('auto_accept');
  });

  it.each([['manual'], ['assisted']] as const)('returns `gated` for %s', (level) => {
    const result = deriveAutonomyMode(level);

    expect(result).toBe('gated');
  });
});
