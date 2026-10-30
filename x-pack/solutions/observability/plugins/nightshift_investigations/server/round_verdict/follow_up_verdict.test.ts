/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describeFollowUpVerdict, followUpVerdictFromInputs } from './follow_up_verdict';

describe('followUpVerdictFromInputs', () => {
  // Liquid renders a missing round kind as ''.
  it.each([undefined, '', 'initial'])('gives a %p round no verdict', (roundKind) => {
    expect(
      followUpVerdictFromInputs({ roundKind, isFeedback: true, causalConfirmed: true })
    ).toBeUndefined();
  });

  it.each(['follow_up', 'alert_recovery'])('reads the verdict on a %s round', (roundKind) => {
    expect(
      followUpVerdictFromInputs({
        roundKind,
        isFeedback: true,
        causalConfirmed: true,
        causalSummary: 'The deploy caused it.',
      })
    ).toEqual({ isFeedback: true, causalConfirmed: true, causalSummary: 'The deploy caused it.' });
  });

  // The verdict step failed or did not run.
  it('reads a follow-up with no verdict as one that proved nothing', () => {
    expect(followUpVerdictFromInputs({ roundKind: 'follow_up', causalConfirmed: true })).toEqual({
      isFeedback: false,
      causalConfirmed: false,
      causalSummary: '',
    });
  });
});

describe('describeFollowUpVerdict', () => {
  it('passes the advice on only for a contradicted cause', () => {
    const advice = 'Archive what rests on it.';
    expect(
      describeFollowUpVerdict(
        { isFeedback: true, causalConfirmed: true, causalSummary: 'Proven.' },
        advice
      )
    ).toBe('## Outcome of this follow-up\nThe follow-up proved the root cause.\nProven.');
    expect(
      describeFollowUpVerdict(
        { isFeedback: true, causalConfirmed: false, causalSummary: 'Contradicted.' },
        advice
      )
    ).toContain(
      'did not confirm the earlier root cause.\nContradicted.\nArchive what rests on it.'
    );
    expect(
      describeFollowUpVerdict(
        { isFeedback: false, causalConfirmed: false, causalSummary: '' },
        advice
      )
    ).toContain('neither confirmed nor contradicted');
  });
});
