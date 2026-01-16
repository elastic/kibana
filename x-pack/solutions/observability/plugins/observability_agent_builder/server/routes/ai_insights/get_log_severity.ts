/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Handler utility functions for identifying log severity levels based on ECS and OTel standards.
 *
 * These functions analyze individual log entry objects to determine if they are:
 * - Warning or above (warn, error, critical, fatal) - using isWarningOrAbove()
 *
 * Supports multiple log formats:
 * - ECS standard field (log.level) - aliases handle mapping from other fields
 * - OpenTelemetry fields (severity_number, SeverityText, attributes.*)
 * - HTTP status codes
 * - Error/exception indicators in field names
 */

const WARNING_AND_ABOVE_LEVELS = new Set([
  'alert',
  'crit',
  'critical',
  'emergency',
  'err',
  'error',
  'fatal',
  'severe',
  'warn',
  'warning',
]);

/**
 * Check if a log entry is warning or above (warn, error, critical, fatal) or has error indicators.
 */
export function isWarningOrAbove(logEntry: Record<string, unknown>): boolean {
  // 1. Check log.level (aliases handle mapping from other fields)
  // Handle both flattened {log.level: level} and nested {log: {level: level}} formats
  const level =
    (logEntry['log.level'] as string | undefined) ??
    ((logEntry.log as Record<string, unknown> | undefined)?.level as string | undefined);
  if (typeof level === 'string' && WARNING_AND_ABOVE_LEVELS.has(level.toLowerCase())) {
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

  // 4. Check message and body.text fields for error/exception keywords
  const message = logEntry.message;
  if (typeof message === 'string') {
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('error') || lowerMessage.includes('exception')) {
      return true;
    }
  }

  // 5. Check if any field value contains 'error' or 'exception'
  for (const value of Object.values(logEntry)) {
    if (typeof value === 'string') {
      const lowerValue = value.toLowerCase();
      if (lowerValue.includes('error') || lowerValue.includes('exception')) {
        return true;
      }
    }
  }

  return false;
}
