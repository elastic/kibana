/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReviewIocsExample, ReviewIocsResponse, ReviewedIoc } from '../types';
import {
  createEmailHuntedEvaluator,
  createEmailNotHuntedEvaluator,
  createEmailUnlabelledEvaluator,
} from './review_iocs_evaluators';

const email = (value: string, overrides: Partial<ReviewedIoc> = {}): ReviewedIoc => ({
  type: 'email',
  value,
  tier: 'uncertain',
  tier_basis: 'semantic_indicator:uncertain_default',
  ...overrides,
});

const rejected = (value: string): ReviewedIoc =>
  email(value, { tier: 'reference', tier_basis: 'semantic_reference' });

const run = async (
  evaluator: ReturnType<typeof createEmailHuntedEvaluator>,
  output: ReviewIocsResponse,
  emails: NonNullable<ReviewIocsExample['output']>['emails']
) =>
  evaluator.evaluate({
    input: undefined,
    metadata: undefined,
    output,
    expected: { emails },
  });

describe('createEmailHuntedEvaluator', () => {
  const evaluator = createEmailHuntedEvaluator();

  it('scores the share of attacker addresses that are hunted', async () => {
    const result = await run(evaluator, { iocs: [email('a@evil.com'), rejected('b@evil.com')] }, [
      { value: 'a@evil.com', hunted: true, decidedBy: 'model' },
      { value: 'b@evil.com', hunted: true, decidedBy: 'model' },
    ]);
    expect(result.score).toBe(0.5);
  });

  it('fails a model that approves nothing', async () => {
    const result = await run(evaluator, { iocs: [rejected('a@evil.com')] }, [
      { value: 'a@evil.com', hunted: true, decidedBy: 'model' },
    ]);
    expect(result.score).toBe(0);
  });

  it('is null for a row with no attacker address', async () => {
    const result = await run(evaluator, { iocs: [rejected('a@vendor.com')] }, [
      { value: 'a@vendor.com', hunted: false, decidedBy: 'model' },
    ]);
    expect(result.score).toBeNull();
  });

  it('counts a deferred address as not hunted', async () => {
    const result = await run(
      evaluator,
      { iocs: [email('a@evil.com', { deferred_unreviewed: true })] },
      [{ value: 'a@evil.com', hunted: true, decidedBy: 'model' }]
    );
    expect(result.score).toBe(0);
  });
});

describe('createEmailNotHuntedEvaluator', () => {
  const evaluator = createEmailNotHuntedEvaluator();

  it('scores the share of model-decided non-attacker addresses that are not hunted', async () => {
    const result = await run(
      evaluator,
      { iocs: [rejected('a@vendor.com'), email('b@vendor.com')] },
      [
        { value: 'a@vendor.com', hunted: false, decidedBy: 'model' },
        { value: 'b@vendor.com', hunted: false, decidedBy: 'model' },
      ]
    );
    expect(result.score).toBe(0.5);
  });

  it('fails a model that approves everything', async () => {
    const result = await run(evaluator, { iocs: [email('a@vendor.com')] }, [
      { value: 'a@vendor.com', hunted: false, decidedBy: 'model' },
    ]);
    expect(result.score).toBe(0);
  });

  it('counts an address the pipeline did not store as not hunted', async () => {
    const result = await run(evaluator, { iocs: [] }, [
      { value: 'a@vendor.com', hunted: false, decidedBy: 'model' },
    ]);
    expect(result.score).toBe(1);
  });

  it('ignores rule-decided addresses and is null for a row with none', async () => {
    const result = await run(
      evaluator,
      { iocs: [email('test@test.com', { tier: 'reference', tier_basis: 'placeholder_email' })] },
      [{ value: 'test@test.com', hunted: false, decidedBy: 'rule' }]
    );
    expect(result.score).toBeNull();
  });
});

describe('createEmailUnlabelledEvaluator', () => {
  const evaluator = createEmailUnlabelledEvaluator();

  it('is 1 when every hunt-eligible email is labelled hunted', async () => {
    const result = await run(evaluator, { iocs: [email('a@evil.com'), rejected('b@vendor.com')] }, [
      { value: 'a@evil.com', hunted: true, decidedBy: 'model' },
      { value: 'b@vendor.com', hunted: false, decidedBy: 'model' },
    ]);
    expect(result.score).toBe(1);
  });

  it('is 0 when a hunt-eligible email was not labelled hunted', async () => {
    const result = await run(evaluator, { iocs: [email('b@vendor.com')] }, [
      { value: 'b@vendor.com', hunted: false, decidedBy: 'model' },
    ]);
    expect(result.score).toBe(0);
  });

  it('is 0 for an unexpected extra hunt-eligible email', async () => {
    const result = await run(evaluator, { iocs: [email('surprise@evil.com')] }, []);
    expect(result.score).toBe(0);
  });

  it('does not count a placeholder email as hunted', async () => {
    const result = await run(
      evaluator,
      { iocs: [email('test@test.com', { tier: 'reference', tier_basis: 'placeholder_email' })] },
      []
    );
    expect(result.score).toBe(1);
  });
});
