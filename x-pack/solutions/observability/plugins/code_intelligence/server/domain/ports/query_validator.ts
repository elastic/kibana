/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryValidationResult, RenderedQuery } from '../models/query_codec';

/** Validates sample-rendered ES|QL only; it never receives an unrendered template. */
export interface QueryValidator {
  /** Returns explicit query validation state, including skipped validation. */
  validate(query: RenderedQuery): Promise<QueryValidationResult>;
}
