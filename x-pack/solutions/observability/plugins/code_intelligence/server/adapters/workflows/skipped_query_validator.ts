/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryValidationResult } from '../../domain/models/query_codec';
import type { QueryValidator } from '../../domain/ports/query_validator';

/**
 * Explicit POC substitute while no suitable Kibana validation HTTP API exists.
 * It does not claim syntax validity.
 */
export class SkippedQueryValidator implements QueryValidator {
  /** Returns explicit query validation state, including skipped validation. */
  public async validate(_query: string): Promise<QueryValidationResult> {
    return {
      diagnostics: ['Validation was skipped because no standalone validator is configured.'],
      status: 'skipped',
    };
  }
}
