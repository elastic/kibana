/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import config from '../persona_matrix.config.json';

/**
 * The shipped persona matrix config, not a fixture.
 *
 * The scoring policy decides whether a published cell can be reproduced, so a
 * silent drop of this block during an edit has to fail the build rather than
 * quietly restore the old scoring basis.
 */
describe('persona_matrix.config.json scoring policy', () => {
  it('scores judged evaluators by verdict and admits only reproducible judges', () => {
    expect(config.scoring).toEqual({
      useVerdictLadder: true,
      requireEisJudge: true,
      excludeSelfJudged: true,
    });
  });

  it('warns that these numbers are not comparable to older matrices', () => {
    const notes: string[] = config.provenance?.methodologyNotes ?? [];

    expect(notes.some((note) => note.includes('NOT comparable'))).toBe(true);
    expect(notes.some((note) => note.includes('verdict'))).toBe(true);
  });
});
