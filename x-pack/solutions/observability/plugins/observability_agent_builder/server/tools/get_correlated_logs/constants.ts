/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@kbn/data-views-plugin/common/types';

// Correlation identifier fields in priority order
export const DEFAULT_CORRELATION_IDENTIFIER_FIELDS = [
  'trace.id',
  'trace_id',
  'x-trace-id',
  'request.id',
  'request_id',
  'x_request_id',
  'transaction.id',
  'correlation.id',
  'correlation_id',
  'x-correlation-id',
  'http.request.id',
  'session.id',
  'session_id',
  'event.id',
  'cloud.trace_id',
  'parent.id',
  'span.id',
  'process.pid',
];

const ERROR_SEVERITY_LEVELS = [
  'ALERT',
  'CRIT',
  'CRITICAL',
  'EMERGENCY',
  'ERR',
  'ERROR',
  'FATAL',
  'SEVERE',
  'WARN',
  'WARNING',
].flatMap((level) => [level.toUpperCase(), level.toLowerCase()]);

export const DEFAULT_ERROR_SEVERITY_FILTER: QueryDslQueryContainer = {
  bool: {
    minimum_should_match: 1,
    should: [
      { terms: { 'log.level': ERROR_SEVERITY_LEVELS } },
      { terms: { level: ERROR_SEVERITY_LEVELS } },
      { terms: { severity: ERROR_SEVERITY_LEVELS } },
      { terms: { 'event.severity': ERROR_SEVERITY_LEVELS } },

      // 2. Syslog Numeric Severities (0=Emergency to 3=Error)
      { range: { 'syslog.severity': { lte: 3 } } },
      { range: { 'log.syslog.severity.code': { lte: 3 } } },
      { range: { severity: { lte: 3 } } },

      // 3. OpenTelemetry Numeric Severities (17=Error to 24=Fatal)
      { range: { SeverityNumber: { gte: 17 } } },

      // 4. Windows Event Logs (1=Critical, 2=Error)
      { terms: { 'winlog.level_id': ['1', '2'] } },

      // 5. HTTP Status Codes (Server Access Logs)
      { range: { 'http.response.status_code': { gte: 500 } } },

      // 6. Presence of error fields
      { exists: { field: 'error.type' } },
      { exists: { field: 'error.code' } },
    ],
  },
};

export const DEFAULT_LOG_SOURCE_FIELDS = [
  '@timestamp',
  'message',
  // Correlation fields
  ...DEFAULT_CORRELATION_IDENTIFIER_FIELDS,

  // Error severity fields
  'log.level',
  'level',
  'severity',
  'event.severity',

  // Service fields
  'service.*',

  // Host fields
  'host.*',

  // Container fields
  'container.*',

  // Kubernetes fields
  'kubernetes.*',

  // Cloud fields
  'cloud.*',

  // Error fields
  'error.*',

  // Event fields
  'event.*',

  // HTTP/URL/User Agent fields
  'url.*',
  'user_agent.*',
  'http.request.method',
  'http.response.status_code',
  'client.ip',
];

export const DEFAULT_TIME_RANGE = {
  start: 'now-1h',
  end: 'now',
};
