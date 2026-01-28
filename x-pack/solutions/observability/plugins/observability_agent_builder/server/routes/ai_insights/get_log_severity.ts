/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { WARNING_AND_ABOVE_VALUES } from '../../utils/warning_and_above_log_filter';
import type { LogDocument } from './get_log_document_by_id';

const ERROR_PATTERNS = [/\berror\b/i, /\bexception\b/i, /\bfail(?:ed|ure|ing)?\b/i, /\btimeout\b/i];

/**
 * Analyzes a log entry to determine if it is warning level or above
 * (warn, error, critical, fatal)
 */
export function isWarningOrAbove(logDocument: LogDocument): boolean {
  const logLevel = logDocument['log.level'];
  if (typeof logLevel === 'string' && WARNING_AND_ABOVE_VALUES.includes(logLevel.toLowerCase())) {
    return true;
  }

  const statusCode = Number(logDocument['http.response.status_code']);
  if (statusCode >= 500) {
    return true;
  }

  if (logDocument['exception.message'] || logDocument['error.message']) {
    return true;
  }

  const message = logDocument.message;
  if (typeof message === 'string' && ERROR_PATTERNS.some((pattern) => pattern.test(message))) {
    return true;
  }

  return false;
}
