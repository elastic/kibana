/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EndStageLimitExceededError } from './end_stage_limit_exceeded_error';

describe('EndStageLimitExceededError', () => {
  it('tells the user to reduce that exception item when one item needs too many left parentheses', () => {
    const error = new EndStageLimitExceededError({
      limit: 'left_parentheses',
      reason: 'the exception item "big" needs 505 left parentheses in one stage of the query',
    });

    expect(error.message).toBe(
      'The rule did not run because its exceptions do not fit in the query: the exception item "big" needs 505 left parentheses in one stage of the query. Remove entries or values from that exception item.'
    );
    expect(error.limit.limit).toBe('left_parentheses');
  });

  it.each(['comparisons', 'query_length'] as const)(
    'tells the user to reduce the exception items, and that splitting one does not help, for the %s limit',
    (limit) => {
      const error = new EndStageLimitExceededError({ limit, reason: 'the reason' });

      expect(error.message).toBe(
        'The rule did not run because its exceptions do not fit in the query: the reason. Remove values from those exception items, or remove the exception items that this rule does not need. Splitting an exception item into several exception items does not help, because all the exception items are counted together.'
      );
    }
  );
});
