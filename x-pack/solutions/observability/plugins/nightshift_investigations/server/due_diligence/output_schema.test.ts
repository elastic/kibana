/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatDueDiligenceNotice } from './format_notice';
import { selectReviewedHypotheses, type DueDiligenceOutput } from './output_schema';

const hypothesis = (
  overrides: Partial<DueDiligenceOutput['hypotheses'][number]> = {}
): DueDiligenceOutput['hypotheses'][number] => ({
  candidate: 'Pool exhausted',
  confidence: 0.7,
  alert_state_change: 'explained',
  thoughts: 'Holds up.',
  ...overrides,
});

describe('selectReviewedHypotheses', () => {
  it('keeps only hypotheses at 60% or more, strongest first', () => {
    const reviewed = selectReviewedHypotheses({
      hypotheses: [
        hypothesis({ candidate: 'weak', confidence: 0.59 }),
        hypothesis({ candidate: 'at the bar', confidence: 0.6 }),
        hypothesis({ candidate: 'strong', confidence: 0.9 }),
      ],
    });

    expect(reviewed.map(({ candidate }) => candidate)).toEqual(['strong', 'at the bar']);
  });

  it('reads a confidence given as a percentage', () => {
    const [reviewed] = selectReviewedHypotheses({ hypotheses: [hypothesis({ confidence: 75 })] });

    expect(reviewed.confidence).toBe(0.75);
  });

  it('returns nothing when no hypothesis reaches the bar', () => {
    expect(selectReviewedHypotheses({ hypotheses: [hypothesis({ confidence: 0.3 })] })).toEqual([]);
  });
});

describe('formatDueDiligenceNotice', () => {
  it('says when a hypothesis does not explain why the alert changed state', () => {
    const { text } = formatDueDiligenceNotice(
      selectReviewedHypotheses({
        hypotheses: [
          hypothesis({
            candidate: 'Chronic retry storm',
            confidence: 0.8,
            alert_state_change: 'background_only',
            thoughts: 'Flat across the recovery. Compare the rule evaluation history.',
          }),
        ],
      })
    );

    expect(text).toContain('Chronic retry storm (about 80%');
    expect(text).toContain('not shown to explain the alert change');
    expect(text).toContain('Compare the rule evaluation history.');
  });

  it('does not mention the alert for an investigation that is not about one', () => {
    const { text } = formatDueDiligenceNotice(
      selectReviewedHypotheses({
        hypotheses: [hypothesis({ alert_state_change: 'not_applicable' })],
      })
    );

    expect(text).not.toContain('alert change');
  });
});
