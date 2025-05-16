/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EQL_ERROR_CODES } from '../../../../common/hooks/eql/api';
import type { ValidationError } from '../../../../shared_imports';

export const getEqlValidationError = (): ValidationError => ({
  code: EQL_ERROR_CODES.INVALID_EQL,
  messages: ['line 1: WRONG\nline 2: ALSO WRONG'],
  message: '',
});
