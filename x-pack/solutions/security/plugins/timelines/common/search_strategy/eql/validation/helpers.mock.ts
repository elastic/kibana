/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TransportResult } from '@elastic/elasticsearch';
import { ErrorResponse } from './helpers';

export const getValidEqlResponse = (): TransportResult['body'] => ({
  is_partial: false,
  is_running: false,
  took: 162,
  timed_out: false,
  hits: {
    total: {
      value: 1,
      relation: 'eq',
    },
    sequences: [],
  },
});

export const getEqlResponseWithValidationError = (): ErrorResponse => ({
  error: {
    root_cause: [
      {
        type: 'verification_exception',
        reason:
          'Found 2 problems\nline 1:1: Unknown column [event.category]\nline 1:13: Unknown column [event.name]',
      },
    ],
    type: 'verification_exception',
    reason:
      'Found 2 problems\nline 1:1: Unknown column [event.category]\nline 1:13: Unknown column [event.name]',
  },
});

export const getEqlResponseWithValidationErrors = (): ErrorResponse => ({
  error: {
    root_cause: [
      {
        type: 'verification_exception',
        reason:
          'Found 2 problems\nline 1:1: Unknown column [event.category]\nline 1:13: Unknown column [event.name]',
      },
      {
        type: 'parsing_exception',
        reason: "line 1:4: mismatched input '<EOF>' expecting 'where'",
      },
    ],
    type: 'verification_exception',
    reason:
      'Found 2 problems\nline 1:1: Unknown column [event.category]\nline 1:13: Unknown column [event.name]',
  },
});

export const getEqlResponseWithNonValidationError = (): TransportResult['body'] => ({
  error: {
    root_cause: [
      {
        type: 'other_error',
        reason: 'some other reason',
      },
    ],
    type: 'other_error',
    reason: 'some other reason',
  },
});
