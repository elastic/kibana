/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BulkActionSkipResult } from '@kbn/alerting-plugin/common';
import type { BulkActionError } from './bulk_actions_response';
import { extractNotFoundAsSkipped, RULE_NOT_FOUND_MESSAGE } from './utils';

describe('extractNotFoundAsSkipped', () => {
  it('extracts a PromisePoolError<string> with matching message', () => {
    const errors: BulkActionError[] = [
      { item: 'rule-1', error: new Error(RULE_NOT_FOUND_MESSAGE) },
    ];
    const skipped: BulkActionSkipResult[] = [];

    extractNotFoundAsSkipped(errors, skipped);

    expect(errors).toEqual([]);
    expect(skipped).toEqual([{ id: 'rule-1', skip_reason: 'RULE_NOT_FOUND' }]);
  });

  it('does not extract a PromisePoolError<RuleAlertType> (item is not a string)', () => {
    const ruleObject = { id: 'rule-1', name: 'Rule 1' };
    const errors: BulkActionError[] = [
      { item: ruleObject as never, error: new Error(RULE_NOT_FOUND_MESSAGE) },
    ];
    const skipped: BulkActionSkipResult[] = [];

    extractNotFoundAsSkipped(errors, skipped);

    expect(errors).toHaveLength(1);
    expect(skipped).toEqual([]);
  });

  it('does not extract a BulkOperationError (no item property)', () => {
    const errors: BulkActionError[] = [
      { message: RULE_NOT_FOUND_MESSAGE, status: 404, rule: { id: 'rule-1', name: 'Rule 1' } },
    ];
    const skipped: BulkActionSkipResult[] = [];

    extractNotFoundAsSkipped(errors, skipped);

    expect(errors).toHaveLength(1);
    expect(skipped).toEqual([]);
  });

  it('does not extract when error message does not match', () => {
    const errors: BulkActionError[] = [{ item: 'rule-1', error: new Error('Something else') }];
    const skipped: BulkActionSkipResult[] = [];

    extractNotFoundAsSkipped(errors, skipped);

    expect(errors).toHaveLength(1);
    expect(skipped).toEqual([]);
  });

  it('does not extract when error is not an Error instance', () => {
    const errors: BulkActionError[] = [
      { item: 'rule-1', error: { message: RULE_NOT_FOUND_MESSAGE } as unknown as Error },
    ];
    const skipped: BulkActionSkipResult[] = [];

    extractNotFoundAsSkipped(errors, skipped);

    expect(errors).toHaveLength(1);
    expect(skipped).toEqual([]);
  });

  it('handles empty arrays', () => {
    const errors: BulkActionError[] = [];
    const skipped: BulkActionSkipResult[] = [];

    extractNotFoundAsSkipped(errors, skipped);

    expect(errors).toEqual([]);
    expect(skipped).toEqual([]);
  });

  it('extracts multiple matching errors and preserves non-matching ones', () => {
    const errors: BulkActionError[] = [
      { item: 'rule-1', error: new Error(RULE_NOT_FOUND_MESSAGE) },
      { item: 'rule-2', error: new Error('Internal error') },
      { item: 'rule-3', error: new Error(RULE_NOT_FOUND_MESSAGE) },
    ];
    const skipped: BulkActionSkipResult[] = [];

    extractNotFoundAsSkipped(errors, skipped);

    expect(errors).toEqual([{ item: 'rule-2', error: expect.any(Error) }]);
    expect(skipped).toEqual([
      { id: 'rule-3', skip_reason: 'RULE_NOT_FOUND' },
      { id: 'rule-1', skip_reason: 'RULE_NOT_FOUND' },
    ]);
  });
});
