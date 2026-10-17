/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readProposal } from './proposal_reading';

describe('readProposal', () => {
  it('reads the proposed query of a query-branch review', () => {
    expect(
      readProposal({ change_type: 'query', proposed_query: 'host.name : "a"' }, 'fixture-1', 'old')
    ).toEqual({ measured: true, proposedQuery: 'host.name : "a"' });
  });

  it('reports a non-query branch as unmeasured, naming the fixture', () => {
    // The un-fixed behaviour was a thrown suite failure: nothing is broken, the arm
    // simply has no persisted-query oracle to assert on.
    const reading = readProposal(
      { change_type: 'exception', proposed_query: 'host.name : "a"' },
      'fp-overbroad-query',
      'old'
    );

    expect(reading.measured).toBe(false);
    expect(reading.measured ? '' : reading.reason).toContain('change_type=exception');
    expect(reading.measured ? '' : reading.reason).toContain('fp-overbroad-query');
    expect(reading.measured ? '' : reading.reason).toContain('measured nothing');
  });

  it('reports a query branch with no proposed_query as unmeasured', () => {
    const reading = readProposal({ change_type: 'query' }, 'fixture-1', 'old');

    expect(reading.measured).toBe(false);
    expect(reading.measured ? '' : reading.reason).toContain('change_type=query');
  });

  it("reports a proposal equal to the rule's current query as unmeasured", () => {
    // An approval of the existing query is a no-op patch, so a green assertion
    // there could not distinguish "applied" from "not applied".
    const reading = readProposal(
      { change_type: 'query', proposed_query: 'host.name : "a"' },
      'fixture-1',
      'host.name : "a"'
    );

    expect(reading.measured).toBe(false);
    expect(reading.measured ? '' : reading.reason).toContain('verbatim');
  });

  it('does not treat an unchanged query as degenerate when no current query is known', () => {
    expect(readProposal({ change_type: 'query', proposed_query: 'same' }, 'fixture-1')).toEqual({
      measured: true,
      proposedQuery: 'same',
    });
  });
});
