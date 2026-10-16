/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deduplicateEvidence } from './deduplicate_evidence';

describe('deduplicateEvidence', () => {
  it('deduplicates source lines and returns them in source order', () => {
    /** Supplies source evidence whose ordering and deduplication are tested. */
    const evidence = deduplicateEvidence([
      { excerpt: 'second', line: 9, path: 'src/b.ts' },
      { excerpt: 'first version', line: 4, path: 'src/a.ts' },
      { excerpt: 'replacement', line: 4, path: 'src/a.ts' },
    ]);

    expect(evidence).toEqual([
      { excerpt: 'replacement', line: 4, path: 'src/a.ts' },
      { excerpt: 'second', line: 9, path: 'src/b.ts' },
    ]);
  });
});
