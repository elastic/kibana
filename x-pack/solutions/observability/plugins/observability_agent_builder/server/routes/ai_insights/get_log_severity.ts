/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { WARNING_AND_ABOVE_VALUES } from '../../utils/warning_and_above_log_filter';
import type { LogDocument } from './get_log_document_by_id';

/**
 * Analyzes a log entry to determine if it is warning level or above
 * (warn, error, critical, fatal)
 */
export function isWarningOrAbove(logDocument: LogDocument): boolean {
  // Check log.level (ECS field, resolves aliases for OTel)
  const logLevel = logDocument['log.level'];
  if (typeof logLevel === 'string' && WARNING_AND_ABOVE_VALUES.includes(logLevel.toLowerCase())) {
    return true;
  }

  // Check HTTP 5xx error status codes
  const httpStatus = logDocument['http.response.status_code'];
  if (httpStatus != null) {
    const statusCode = parseInt(httpStatus, 10);
    if (typeof statusCode === 'number' && statusCode >= 500) {
      return true;
    }
  }

  // Check for exception/error message presence
  if (logDocument['exception.message'] || logDocument['error.message']) {
    return true;
  }

  return false;
}
