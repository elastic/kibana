/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EndStageLimit } from './build_end_stage_clause';

/** Thrown before the query runs when the items exceed the comparison, query length or parenthesis limit, naming the limit and the items to reduce. */
export class EndStageLimitExceededError extends Error {
  public readonly limit: EndStageLimit;

  constructor(limit: EndStageLimit) {
    super(
      limit.limit === 'left_parentheses'
        ? `The rule did not run because its exceptions do not fit in the query: ${limit.reason}. Remove entries or values from that exception item.`
        : `The rule did not run because its exceptions do not fit in the query: ${limit.reason}. Remove values from those exception items, or remove the exception items that this rule does not need. Splitting an exception item into several exception items does not help, because all the exception items are counted together.`
    );
    this.name = 'EndStageLimitExceededError';
    this.limit = limit;
  }
}
