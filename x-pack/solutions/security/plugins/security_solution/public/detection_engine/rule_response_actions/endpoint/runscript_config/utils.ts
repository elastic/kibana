/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ValidationState } from './types';
import {
  TIMEOUT_VALUE_MUST_BE_GREATER_THAN_ZERO,
  TIMEOUT_VALUE_MUST_BE_NUMBER,
} from './translations';

export const validateTimeoutValue = (value: string | number | undefined): ValidationState => {
  if (value) {
    const timeoutValue = Number(value);

    if (isNaN(timeoutValue)) {
      return {
        isValid: false,
        errors: [TIMEOUT_VALUE_MUST_BE_NUMBER],
      };
    }

    if (timeoutValue < 1) {
      return {
        isValid: false,
        errors: [TIMEOUT_VALUE_MUST_BE_GREATER_THAN_ZERO],
      };
    }
  }

  return { isValid: true };
};
