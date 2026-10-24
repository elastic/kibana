/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { corpusGateAlertsDeltaMustBeZero } from './phases';

describe('C1 corpus gate (relative)', () => {
  it('passes on an empty index (delta 0)', () => {
    expect(corpusGateAlertsDeltaMustBeZero(0, 0)).toBeNull();
  });

  it('passes when pre-existing alerts survive untouched (golden: 233)', () => {
    expect(corpusGateAlertsDeltaMustBeZero(233, 233)).toBeNull();
  });

  it('fails when E0 adds alerts on top of pre-existing ones', () => {
    const failure = corpusGateAlertsDeltaMustBeZero(233, 236);
    expect(failure).not.toBeNull();
    expect(failure?.control).toBe('C1');
    expect(failure?.detail).toContain('3 new alerts');
    expect(failure?.detail).toContain('233 pre-existing');
  });

  it('fails when the index was empty and E0 alerts', () => {
    expect(corpusGateAlertsDeltaMustBeZero(0, 2)?.control).toBe('C1');
  });
});
