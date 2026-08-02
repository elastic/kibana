/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readProposalRationale } from '.';

describe('readProposalRationale', () => {
  it('reads the rationale the analyst wrote', () => {
    expect(readProposalRationale({ decision: 'approve', rationale: 'Confirmed on host-1.' })).toBe(
      'Confirmed on host-1.'
    );
  });

  it('reads a rationale beside a gate’s own schema-driven fields', () => {
    expect(
      readProposalRationale({
        decision: 'approve',
        isolateHost: true,
        rationale: 'Confirmed on host-1.',
      })
    ).toBe('Confirmed on host-1.');
  });

  it('returns nothing for an answer that carries no rationale', () => {
    expect(readProposalRationale({ decision: 'approve' })).toBeUndefined();
  });

  /** Seeding a field with "42" would be worse than leaving it empty: it looks like an answer. */
  it('returns nothing for a rationale that is not text', () => {
    expect(readProposalRationale({ rationale: 42 })).toBeUndefined();
  });

  it('returns nothing for a null rationale', () => {
    expect(readProposalRationale({ rationale: null })).toBeUndefined();
  });

  /**
   * Blank is not a rationale — `_respond` refuses one, so seeding the next dialog with whitespace
   * would present an answer that cannot be submitted as though it could.
   */
  it('returns nothing for a whitespace-only rationale', () => {
    expect(readProposalRationale({ rationale: '   ' })).toBeUndefined();
  });

  it('returns nothing for an empty rationale', () => {
    expect(readProposalRationale({ rationale: '' })).toBeUndefined();
  });

  /** Untrimmed, because the analyst may still be typing: the mutation is what trims. */
  it('leaves the surrounding whitespace of a real rationale alone', () => {
    expect(readProposalRationale({ rationale: '  Confirmed.  ' })).toBe('  Confirmed.  ');
  });

  it('returns nothing for an empty answer', () => {
    expect(readProposalRationale({})).toBeUndefined();
  });
});
