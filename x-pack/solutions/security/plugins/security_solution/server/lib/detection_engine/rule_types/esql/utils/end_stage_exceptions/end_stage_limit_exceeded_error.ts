/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EndStageLimit } from './build_end_stage_clause';

/**
 * Thrown before the query runs when the exception items cannot be written at the end of the query within the limits:
 * too many comparisons, or a query that is too long. A rule that failed is better than a rule that runs with only some
 * of its exceptions, and the message names the limit and the items to reduce.
 */
export class EndStageLimitExceededError extends Error {
  public readonly limit: EndStageLimit;

  constructor(limit: EndStageLimit) {
    super(
      `The rule did not run because its exceptions do not fit in the query: ${limit.reason}. Remove values from those items, or remove the items that this rule does not need. Splitting an item into several items does not help, because the comparisons of all the items are counted together.`
    );
    this.name = 'EndStageLimitExceededError';
    this.limit = limit;
  }
}
