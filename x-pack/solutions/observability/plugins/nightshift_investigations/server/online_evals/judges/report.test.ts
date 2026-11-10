/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { alertOutcomeReferenceDataSchema } from './alert_outcome_shared';
import { MAX_HYPOTHESIS_REASON_CHARS, renderReport, reportReferenceDataSchema } from './report';

const answer = 'Checkout latency is resolved.';

describe('renderReport', () => {
  it.each([undefined, []])('returns the answer unchanged when hypotheses are %p', (hypotheses) => {
    expect(renderReport({ answer, hypotheses })).toBe(answer);
  });

  it('appends the hypotheses panel in call order, with a reason only when it is non-empty', () => {
    expect(
      renderReport({
        answer,
        hypotheses: [
          {
            candidate: 'Bad deploy of checkout',
            status: 'confirmed',
            confidence: 0.9,
            reason: 'Latency began at the 14:02 deploy',
          },
          { candidate: 'Database saturation', status: 'dismissed', confidence: 0.1, reason: '' },
        ],
      })
    ).toBe(
      [
        answer,
        '',
        '## Hypotheses panel (shown to the user)',
        '- [confirmed] Bad deploy of checkout (confidence 0.9)',
        '  Reason: Latency began at the 14:02 deploy',
        '- [dismissed] Database saturation (confidence 0.1)',
      ].join('\n')
    );
  });

  it('truncates a long reason', () => {
    const report = renderReport({
      answer,
      hypotheses: [
        {
          candidate: 'Bad deploy',
          status: 'confirmed',
          confidence: 0.9,
          reason: 'x'.repeat(MAX_HYPOTHESIS_REASON_CHARS + 5),
        },
      ],
    });

    expect(report).toContain(
      `Reason: ${'x'.repeat(MAX_HYPOTHESIS_REASON_CHARS)}\n[truncated 5 characters]`
    );
  });
});

describe('reference data schemas', () => {
  const hypotheses = [{ candidate: 'Bad deploy', status: 'confirmed', confidence: 0.9 }];

  it('keeps hypotheses in the alert outcome reference data and accepts missing report reference data', () => {
    expect(
      alertOutcomeReferenceDataSchema.parse({ alert_outcome: 'Recovered', hypotheses })
    ).toEqual({ alert_outcome: 'Recovered', hypotheses });
    expect(reportReferenceDataSchema.parse(undefined)).toEqual({});
  });
});
