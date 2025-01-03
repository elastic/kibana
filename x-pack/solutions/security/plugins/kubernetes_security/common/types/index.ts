/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type {
  AggregateResult,
  AggregateBucketPaginationResult,
  MultiTermsAggregateGroupBy,
  MultiTermsAggregateResult,
  MultiTermsAggregateBucketPaginationResult,
  MultiTermsBucket,
} from './latest';

import * as v1 from './v1';
export type { v1 };
