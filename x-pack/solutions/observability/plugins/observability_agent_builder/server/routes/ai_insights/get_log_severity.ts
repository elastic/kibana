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
 * - ECS standard fields (log.level, level, severity)
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

const LOG_LEVEL_FIELDS = ['log.level', 'level', 'severity_text', 'SeverityText', 'severity'];

function isErrorField(fieldName: string): boolean {
  const lower = fieldName.toLowerCase();
  return lower.includes('exception') || lower.includes('error');
}

/**
 * Check if a log entry is warning or above (warn, error, critical, fatal) or has error indicators.
 */
export function isWarningOrAbove(logEntry: Record<string, unknown>): boolean {
  // 1. Check log level text fields
  for (const field of LOG_LEVEL_FIELDS) {
    const level = logEntry[field];
    if (typeof level === 'string' && WARNING_AND_ABOVE_LEVELS.has(level.toLowerCase())) {
      return true;
    }
  }

  // 2. Check OTel severity_number (13-24 = Warn/Error/Fatal)
  const severityNumber = logEntry.severity_number ?? logEntry.SeverityNumber;
  if (typeof severityNumber === 'number' && severityNumber >= 13) return true;

  // 3. Check HTTP error status codes
  const httpStatus = logEntry['http.response.status_code'] ?? logEntry['http.request.status_code'];
  if (typeof httpStatus === 'number' && httpStatus >= 400) return true;

  // 4. Check attributes object (OpenTelemetry)
  const attributes = logEntry.attributes as Record<string, unknown> | undefined;
  if (attributes) {
    for (const key of Object.keys(attributes)) {
      if (isErrorField(key) && attributes[key] != null) return true;
    }
  }

  return false;
}
