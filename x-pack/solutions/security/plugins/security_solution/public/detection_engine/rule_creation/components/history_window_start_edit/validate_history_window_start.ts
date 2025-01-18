/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type ValidationFunc } from '../../../../shared_imports';
import * as i18n from './translations';

export function validateHistoryWindowStart(...args: Parameters<ValidationFunc>) {
  const [{ path, value }] = args;

  const historyWindowSize = Number.parseInt(String(value), 10);

  if (Number.isNaN(historyWindowSize)) {
    return {
      code: 'ERR_NOT_INT_NUMBER',
      path,
      message: i18n.MUST_BE_POSITIVE_INTEGER_VALIDATION_ERROR,
    };
  }

  if (historyWindowSize <= 0) {
    return {
      code: 'ERR_MIN_LENGTH',
      path,
      message: i18n.MUST_BE_GREATER_THAN_ZERO_VALIDATION_ERROR,
    };
  }
}
