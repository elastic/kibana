/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateDataView } from '@kbn/data-view-validation';

/** Characters explicitly allowed in an index pattern (beyond what validateDataView checks). */
const ALLOWED_PATTERN = /^[a-zA-Z0-9_\-.*,:+]+$/;

/**
 * Validates a user-supplied index pattern for use in an ES|QL FROM clause.
 *
 * Because ES|QL has no identifier param form for index patterns (??idx is rejected),
 * the pattern must be string-interpolated. This validator ensures no ES|QL command
 * fragments (pipe, backtick, newline, quote) can be smuggled in.
 */
export const validateIndexPattern = (pattern: string): string | null => {
  const dvErrors = validateDataView(pattern);
  if (dvErrors.ILLEGAL_CHARACTERS || dvErrors.CONTAINS_SPACES) {
    return `Index pattern "${pattern}" contains illegal characters or spaces`;
  }
  if (!ALLOWED_PATTERN.test(pattern)) {
    return `Index pattern "${pattern}" contains characters not allowed in an ES|QL FROM clause`;
  }
  return null; // valid
};
