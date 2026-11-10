/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AttackDiscoveryDatasetExample,
  AttackDiscoveryTaskOutput,
} from '@kbn/evals-suite-attack-discovery/src/types';
import {
  AD_FAILURE_CLASS_EVALUATOR_NAME,
  classifyAdFailure,
  createAdFailureClassEvaluator,
} from './ad_failure_class_evaluator';

const run = async (output: AttackDiscoveryTaskOutput) => {
  const evaluator = createAdFailureClassEvaluator();
  return evaluator.evaluate({
    input: {} as AttackDiscoveryDatasetExample['input'],
    output,
    expected: undefined,
    metadata: {},
  } as Parameters<typeof evaluator.evaluate>[0]);
};

describe('AD Failure Class evaluator', () => {
  it('exposes the matrix-facing name', () => {
    expect(AD_FAILURE_CLASS_EVALUATOR_NAME).toBe('AD Failure Class');
  });

  it.each([
    ['generate HTTP 500: boom', 'http_error'],
    ['generate response missing execution_uuid', 'other'],
    ['poll HTTP 404 (generation never materialized): not found', 'never_materialized'],
    ['poll HTTP 502: bad gateway', 'http_error'],
    ['poll HTTP n/a: socket hang up', 'http_error'],
    ['generation failed: Unexpected end of JSON input', 'truncation'],
    ['generation failed: response was truncated', 'truncation'],
    ['generation failed: Unterminated string in JSON', 'truncation'],
    ['generation failed: reached max generation attempts', 'max_attempts'],
    ['generation failed: maximum attempts exceeded', 'max_attempts'],
    ['generation canceled: something else', 'other'],
    ['poll timed out after 600s', 'poll_timeout'],
    [
      'Failed to parse insights from the LLM response after 3 attempts: SyntaxError',
      'max_attempts',
    ],
    ['something unexpected', 'other'],
  ])('classifies %j as %s', (error, expected) => {
    expect(classifyAdFailure({ insights: null, errors: [error] })).toBe(expected);
  });

  it('classifies a run with insights and no errors as none', async () => {
    const output = { insights: [{ title: 't' }] };

    expect(classifyAdFailure(output)).toBe('none');
    const result = await run(output);
    expect(result.score).toBe(1);
    expect(result.label).toBe('none');
  });

  it('scores 0 and labels the class for a failure', async () => {
    const result = await run({ insights: null, errors: ['poll timed out after 600s'] });

    expect(result.score).toBe(0);
    expect(result.label).toBe('poll_timeout');
  });

  it('falls back to raw.status when there are no error strings', () => {
    expect(classifyAdFailure({ insights: null, raw: { status: 'timed_out' } })).toBe(
      'poll_timeout'
    );
    expect(classifyAdFailure({ insights: null, raw: { status: 'weird' } })).toBe('other');
  });

  it.each(['failed', 'canceled', 'dismissed'])(
    'classifies no insights, no errors and terminal status %s as never_materialized',
    (status) => {
      expect(classifyAdFailure({ insights: null, raw: { status } })).toBe('never_materialized');
      expect(classifyAdFailure({ insights: [], raw: { status } })).toBe('never_materialized');
    }
  );

  it('classifies a succeeded generation with no insights as empty_result', () => {
    expect(classifyAdFailure({ insights: null, raw: { status: 'succeeded' } })).toBe(
      'empty_result'
    );
    expect(classifyAdFailure({ insights: [], raw: { status: 'succeeded' } })).toBe('empty_result');
  });

  it('keeps timed_out as poll_timeout rather than never_materialized', () => {
    expect(classifyAdFailure({ insights: null, raw: { status: 'timed_out' } })).toBe(
      'poll_timeout'
    );
  });

  it('classifies empty output with no signal as other', () => {
    expect(classifyAdFailure({ insights: null })).toBe('other');
  });
});
