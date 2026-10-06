/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { prepareDecisionTreeTurn } from './prepare_turn';

describe('prepareDecisionTreeTurn', () => {
  it('skips when the assessment is blank', () => {
    expect(
      prepareDecisionTreeTurn({
        symptom: 'technique-t1059',
        rationale: '   ',
        propose: false,
      })
    ).toEqual({ skipped: true, mode: 'extract', message: '' });
  });

  it('asks for a new tree when none is on file', () => {
    const prepared = prepareDecisionTreeTurn({
      symptom: 'technique-t1059',
      rationale: 'Real incident. Isolate the host.',
      propose: true,
      actionsSummary: 'system-security-action-isolate-host',
    });

    expect(prepared.skipped).toBe(false);
    expect(prepared.mode).toBe('extract');
    expect(prepared.message).toContain('technique-t1059');
    expect(prepared.message).toContain('None. Extract a new tree');
    expect(prepared.message).toContain('Containment proposed: yes');
  });

  it('asks to update the tree that is already on file', () => {
    const prepared = prepareDecisionTreeTurn({
      symptom: 'technique-t1059',
      priorMermaid: 'flowchart TD\n    S1([Script])',
      rationale: 'Same technique, different host.',
      propose: false,
    });

    expect(prepared.mode).toBe('reinforce');
    expect(prepared.message).toContain('flowchart TD');
    expect(prepared.message).toContain('Containment proposed: no');
  });
});
