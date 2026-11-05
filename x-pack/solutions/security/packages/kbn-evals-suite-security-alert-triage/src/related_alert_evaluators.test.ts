/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  GET_RELATED_ALERTS_TOOL_ID,
  parseVerdict,
  relatedAlertsRetrieved,
  verdictAccuracy,
  verdictAccuracyWithRelated,
  verdictParsed,
} from './related_alert_evaluators';

const converseOutput = (message: string, steps: unknown[] = []) => ({
  messages: [{ message: 'question' }, { message }],
  steps,
});

const relatedAlertsStep = (relatedAlerts: unknown[]) => ({
  type: 'tool_call',
  tool_id: GET_RELATED_ALERTS_TOOL_ID,
  results: [{ type: 'other', data: { message: 'ok', relatedAlerts } }],
});

const run = (evaluator: typeof verdictAccuracy, output: unknown, expected?: string) =>
  evaluator.evaluate({
    input: {},
    output,
    expected: expected ? { classification: expected } : null,
    metadata: {},
  });

describe('parseVerdict', () => {
  it.each([
    ['Verdict: true_positive', 'true_positive'],
    ['Analysis...\n\nVerdict: false_positive\n', 'false_positive'],
    ['**Verdict:** inconclusive', 'inconclusive'],
    ['verdict: `False_Positive`.', 'false_positive'],
    ['Verdict: false_positive\nVerdict: true_positive', 'true_positive'],
  ])('parses %j', (message, expected) => {
    expect(parseVerdict(message)).toBe(expected);
  });

  it.each([
    ['no verdict here'],
    ['Verdict: benign'],
    ['Verdict: true_positive|false_positive|inconclusive'],
    ['The verdict: true_positive is likely given the evidence'],
    [''],
  ])('returns undefined for %j', (message) => {
    expect(parseVerdict(message)).toBeUndefined();
  });
});

describe('verdictAccuracy', () => {
  it('scores 1 when the parsed verdict matches the label', async () => {
    const result = await run(
      verdictAccuracy,
      converseOutput('Verdict: false_positive'),
      'false_positive'
    );
    expect(result.score).toBe(1);
  });

  it('scores 0 on a mismatch and when no verdict line is present', async () => {
    expect(
      (await run(verdictAccuracy, converseOutput('Verdict: true_positive'), 'false_positive')).score
    ).toBe(0);
    expect((await run(verdictAccuracy, converseOutput('looks bad'), 'true_positive')).score).toBe(
      0
    );
  });
});

describe('verdictParsed', () => {
  it('flags a missing verdict line', async () => {
    expect((await run(verdictParsed, converseOutput('Verdict: true_positive'))).score).toBe(1);
    expect((await run(verdictParsed, converseOutput('no line'))).label).toBe('missing');
  });
});

describe('relatedAlertsRetrieved', () => {
  it('scores 1 when the tool returned related alerts', async () => {
    const result = await run(
      relatedAlertsRetrieved,
      converseOutput('x', [relatedAlertsStep([{ _id: 'a' }, { _id: 'b' }])])
    );
    expect(result).toMatchObject({ score: 1, label: 'found', metadata: { relatedCount: 2 } });
  });

  it('scores 0 when the tool returned an empty list', async () => {
    const result = await run(relatedAlertsRetrieved, converseOutput('x', [relatedAlertsStep([])]));
    expect(result).toMatchObject({ score: 0, label: 'empty' });
  });

  it('scores 0 when the tool was never called or errored', async () => {
    expect((await run(relatedAlertsRetrieved, converseOutput('x'))).label).toBe('not_called');
    const errored = {
      type: 'tool_call',
      tool_id: GET_RELATED_ALERTS_TOOL_ID,
      results: [{ type: 'error', data: { message: 'boom' } }],
    };
    expect((await run(relatedAlertsRetrieved, converseOutput('x', [errored]))).label).toBe('empty');
  });

  it('treats a tool step without results as empty', async () => {
    const noResults = { type: 'tool_call', tool_id: GET_RELATED_ALERTS_TOOL_ID };
    expect((await run(relatedAlertsRetrieved, converseOutput('x', [noResults]))).label).toBe(
      'empty'
    );
  });

  it('ignores other tools', async () => {
    const other = {
      type: 'tool_call',
      tool_id: 'security.alerts',
      results: [{ data: { relatedAlerts: [1] } }],
    };
    expect((await run(relatedAlertsRetrieved, converseOutput('x', [other]))).label).toBe(
      'not_called'
    );
  });
});

describe('verdictAccuracyWithRelated', () => {
  const found = [relatedAlertsStep([{ _id: 'a' }])];

  it('scores 0 premise_unmet when a correct verdict was reached without the tool', async () => {
    const result = await run(
      verdictAccuracyWithRelated,
      converseOutput('Verdict: true_positive'),
      'true_positive'
    );
    expect(result).toMatchObject({ score: 0, label: 'premise_unmet' });
  });

  it('scores 0 premise_unmet when the tool returned no related alerts', async () => {
    const result = await run(
      verdictAccuracyWithRelated,
      converseOutput('Verdict: true_positive', [relatedAlertsStep([])]),
      'true_positive'
    );
    expect(result).toMatchObject({ score: 0, label: 'premise_unmet' });
  });

  it('scores 1 for a correct verdict with related alerts retrieved', async () => {
    const result = await run(
      verdictAccuracyWithRelated,
      converseOutput('Verdict: true_positive', found),
      'true_positive'
    );
    expect(result).toMatchObject({ score: 1, label: 'true_positive' });
  });

  it('scores 0 for a wrong verdict with related alerts retrieved', async () => {
    const result = await run(
      verdictAccuracyWithRelated,
      converseOutput('Verdict: false_positive', found),
      'true_positive'
    );
    expect(result.score).toBe(0);
    expect(result.label).toBe('false_positive');
  });

  it('keeps raw VerdictAccuracy independent of the tool call and free of workflow-only metadata', async () => {
    const result = await run(
      verdictAccuracy,
      converseOutput('Verdict: true_positive'),
      'true_positive'
    );
    expect(result.score).toBe(1);
    expect(result.metadata).toEqual({ predicted: 'true_positive', expected: 'true_positive' });
  });
});
