/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { carriesAllPriorEvents, missingPriorEvents } from './timeline_carryover';

const PRIOR = [
  { type: 'tool_result', summary: 'ES|QL lateral movement query returned 4 hosts' },
  { type: 'agent_message', summary: 'C2 185.220.101.42 confirmed in network logs' },
];
const PROMOTION = { type: 'promotion', summary: 'Promoted to incident' };

describe('lossless fork carry-over', () => {
  it('accepts the incident that carries every prior event plus the promotion', () => {
    expect(carriesAllPriorEvents(PRIOR, [...PRIOR, PROMOTION])).toBe(true);
    expect(missingPriorEvents(PRIOR, [...PRIOR, PROMOTION])).toEqual([]);
  });

  it('rejects a fork that dropped one prior event and wrote another in its place', () => {
    // Count-preserving loss: 2 prior + 1 promotion = 3, and the lossy fork is
    // also 3. The count-only check passed this; the multiset check must not.
    const lossy = [
      PRIOR[0],
      { type: 'agent_message', summary: 'unrelated reworded summary' },
      PROMOTION,
    ];

    expect(lossy).toHaveLength(PRIOR.length + 1);
    expect(carriesAllPriorEvents(PRIOR, lossy)).toBe(false);
    expect(missingPriorEvents(PRIOR, lossy)).toEqual([
      'agent_message|C2 185.220.101.42 confirmed in network logs',
    ]);
  });

  it('rejects a fork that collapses duplicate prior events into one', () => {
    const duplicated = [PRIOR[0], PRIOR[0]];
    const collapsed = [PRIOR[0], PROMOTION];

    expect(collapsed).toHaveLength(duplicated.length);
    expect(carriesAllPriorEvents(duplicated, collapsed)).toBe(false);
    expect(missingPriorEvents(duplicated, collapsed)).toEqual([
      'tool_result|ES|QL lateral movement query returned 4 hosts',
    ]);
  });

  it('rejects a fork with no prior events to carry (nothing to verify)', () => {
    expect(carriesAllPriorEvents([], [PROMOTION])).toBe(false);
  });

  it('rejects an incident that carries the events but no promotion audit event', () => {
    expect(carriesAllPriorEvents(PRIOR, PRIOR)).toBe(false);
  });
});
