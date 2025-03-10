/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type FormData, type ValidationFunc } from '../../../../../shared_imports';
import * as i18n from './translations';

export const forbiddenIndexPatternValidator: ValidationFunc<FormData, string, string[]> = (
  ...args
) => {
  const [{ value, path }] = args;

  if (Array.isArray(value) && value.includes('*')) {
    return {
      code: 'ERR_FIELD_FORMAT',
      path,
      message: i18n.THREAT_MATCH_INDEX_FIELD_VALIDATION_FORBIDDEN_PATTERN_ERROR,
    };
  }
};
