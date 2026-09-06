/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  cleanSkipFallbacks,
  isAssessed,
  summarizeDiscrimination,
  triageCorrectness,
  validOutputContract,
  verdictCorrectness,
} from './evaluators';
import type { GateOutcome } from './evaluators';
import { DEEP_WATCH_GOLDEN_ROWS, selectGoldenRows } from './golden_dataset';

const outcome = (over: Partial<GateOutcome> = {}): GateOutcome => ({
  id: 'row',
  expectedIncident: true,
  actualIncident: true,
  gate: 'assessed',
  ...over,
});

describe('isAssessed', () => {
  it('accepts only a real assessed verdict', () => {
    expect(isAssessed(outcome())).toBe(true);
    expect(isAssessed(outcome({ gate: 'agent_no_structured_output' }))).toBe(false);
    expect(isAssessed(outcome({ gate: 'no_host_resolved' }))).toBe(false);
  });
});

describe('verdictCorrectness', () => {
  it('credits a verdict that matched the golden label', () => {
    expect(verdictCorrectness(outcome())).toBe(1);
  });

  it('fails a false positive on a benign row', () => {
    expect(verdictCorrectness(outcome({ expectedIncident: false, actualIncident: true }))).toBe(0);
  });

  it('refuses to credit an unassessed row even when the default happens to match', () => {
    // A harness failure emits isIncident:false. On a benign row that value
    // coincides with the golden label -- crediting it would turn a broken agent
    // run into a passing score.
    expect(
      verdictCorrectness(
        outcome({
          expectedIncident: false,
          actualIncident: false,
          gate: 'agent_no_structured_output',
        })
      )
    ).toBe(0);
  });
});

describe('triageCorrectness', () => {
  it('scores the verdict against the golden label', () => {
    expect(triageCorrectness(outcome({ expectedIncident: false, actualIncident: true }))).toBe(0);
  });
});

describe('summarizeDiscrimination', () => {
  it('refuses to call an all-positive run discriminating even at 100% accuracy', () => {
    const report = summarizeDiscrimination([outcome({ id: 'a' }), outcome({ id: 'b' })]);
    expect(report.accuracy).toBe(1);
    expect(report.discriminates).toBe(false);
  });

  it('refuses to call an all-negative run discriminating', () => {
    const report = summarizeDiscrimination([
      outcome({ id: 'a', expectedIncident: false, actualIncident: false }),
      outcome({ id: 'b', expectedIncident: false, actualIncident: false }),
    ]);
    expect(report.accuracy).toBe(1);
    expect(report.discriminates).toBe(false);
  });

  it('reports discrimination only once both directions are observed', () => {
    const report = summarizeDiscrimination([
      outcome({ id: 'pos' }),
      outcome({ id: 'neg', expectedIncident: false, actualIncident: false }),
    ]);
    expect(report.discriminates).toBe(true);
    expect(report.truePositives).toBe(1);
    expect(report.trueNegatives).toBe(1);
    expect(report.harnessErrors).toBe(0);
  });

  it('does not credit an always-open watch with discrimination', () => {
    const report = summarizeDiscrimination([
      outcome({ id: 'pos' }),
      outcome({ id: 'neg', expectedIncident: false, actualIncident: true }),
    ]);
    expect(report.discriminates).toBe(false);
    expect(report.accuracy).toBeLessThan(1);
  });

  it('never counts a harness error as a correct close', () => {
    // Regression for the v28 metric bug: an agent run that produced no
    // structured output emits isIncident:false. Counting that as a true
    // negative would report a green gate from a run that never assessed
    // anything.
    const report = summarizeDiscrimination([
      outcome({ id: 'pos' }),
      outcome({
        id: 'neg',
        expectedIncident: false,
        actualIncident: false,
        gate: 'agent_no_structured_output',
      }),
    ]);
    expect(report.trueNegatives).toBe(0);
    expect(report.harnessErrors).toBe(1);
    expect(report.discriminates).toBe(false);
  });

  it('excludes unassessed rows from the denominator claim by reporting them separately', () => {
    const report = summarizeDiscrimination([
      outcome({ id: 'a', gate: 'no_host_resolved' }),
      outcome({ id: 'b', gate: 'no_host_resolved' }),
    ]);
    expect(report.harnessErrors).toBe(2);
    expect(report.positives).toBe(0);
    expect(report.accuracy).toBe(0);
    expect(report.discriminates).toBe(false);
  });
});

describe('validOutputContract', () => {
  it('accepts an assessed verdict carrying its narrative', () => {
    expect(validOutputContract({ gate: 'assessed', isIncident: true, rationale: 'why' })).toBe(1);
  });

  it('rejects an assessed verdict with an empty rationale', () => {
    expect(validOutputContract({ gate: 'assessed', isIncident: true, rationale: '   ' })).toBe(0);
  });

  it('never passes a harness-error output', () => {
    expect(validOutputContract({ gate: 'agent_no_structured_output', isIncident: false })).toBe(0);
  });

  it('rejects a non-array recommendedActions', () => {
    expect(
      validOutputContract({ recommendedActions: 'isolate' as unknown as unknown[] })
    ).toBe(0);
  });
});

describe('cleanSkipFallbacks', () => {
  it('passes narrative fields that rendered', () => {
    expect(cleanSkipFallbacks({ rationale: 'confirmed kill chain', proposal: 'isolate' })).toBe(1);
  });

  it('fails a run that leaked an unrendered template expression', () => {
    // A leaked `{{ ... }}` is non-empty text, so every emptiness-based check
    // reads it as a populated field. This is the only guard that catches it.
    expect(
      cleanSkipFallbacks({
        rationale: 'WKSTN-RECV01',
        proposal: '{{ steps.follow_up_analysis.output.structured_output.proposal }}',
      })
    ).toBe(0);
  });
});

describe('golden dataset', () => {
  it('contains both verdict directions so the suite can discriminate', () => {
    expect(DEEP_WATCH_GOLDEN_ROWS.some((r) => r.expectedIncident)).toBe(true);
    expect(DEEP_WATCH_GOLDEN_ROWS.some((r) => !r.expectedIncident)).toBe(true);
  });

  it('keeps at least one negative row: it carries the entire closed path', () => {
    const negatives = DEEP_WATCH_GOLDEN_ROWS.filter((r) => !r.expectedIncident);
    expect(negatives.length).toBeGreaterThanOrEqual(1);
  });

  it('includes a contradiction row so a label-trusting watch cannot pass', () => {
    const contradictions = DEEP_WATCH_GOLDEN_ROWS.filter((r) => r.rowType === 'contradiction');
    expect(contradictions.length).toBeGreaterThanOrEqual(1);
    // The contradiction row must be a positive whose narrative claims benign:
    // that is what makes trusting the narrative insufficient.
    expect(contradictions.every((r) => r.expectedIncident)).toBe(true);
  });
});

describe('selectGoldenRows', () => {
  it('returns every row when no selector is set', () => {
    expect(selectGoldenRows(DEEP_WATCH_GOLDEN_ROWS, undefined)).toHaveLength(
      DEEP_WATCH_GOLDEN_ROWS.length
    );
    expect(selectGoldenRows(DEEP_WATCH_GOLDEN_ROWS, '  ')).toHaveLength(
      DEEP_WATCH_GOLDEN_ROWS.length
    );
  });

  it('narrows to a single row by id prefix', () => {
    const selected = selectGoldenRows(DEEP_WATCH_GOLDEN_ROWS, 'dw-002');
    expect(selected).toHaveLength(1);
    expect(selected[0].id).toContain('dw-002');
  });

  it('accepts several ids', () => {
    expect(selectGoldenRows(DEEP_WATCH_GOLDEN_ROWS, 'dw-001,dw-002')).toHaveLength(2);
  });

  it('throws on a selector that matches nothing rather than running an empty suite', () => {
    // An empty dataset would report zero positives and zero negatives, which
    // reads as "did not discriminate" instead of "you typo-ed the filter".
    expect(() => selectGoldenRows(DEEP_WATCH_GOLDEN_ROWS, 'dw-999')).toThrow(/matched no golden rows/);
  });
});
