/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { WARNING_AND_ABOVE_VALUES } from '../../utils/ecs_otel_fields';

/**
 * These functions analyze individual log entry objects to determine if they are:
 * - Warning or above (warn, error, critical, fatal) - using isWarningOrAbove()
 */

export function isWarningOrAbove(logEntry: Record<string, unknown>): boolean {
  // 1. Check log level fields (log.level, level, etc.)
  const level =
    (logEntry['log.level'] as string | undefined) ??
    ((logEntry.log as Record<string, unknown> | undefined)?.level as string | undefined);

  if (typeof level === 'string' && WARNING_AND_ABOVE_VALUES.includes(level.toLowerCase())) {
    return true;
  }

  // 2. Check HTTP error status codes
  const httpStatus = logEntry['http.response.status_code'];
  if (typeof httpStatus === 'number' && httpStatus >= 400) return true;

  // 3. Check error.* fields
  for (const key of Object.keys(logEntry)) {
    if (key.startsWith('error.') && logEntry[key] != null) {
      return true;
    }
  }

  return false;
}
