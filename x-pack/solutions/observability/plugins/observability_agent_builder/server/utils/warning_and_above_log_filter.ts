/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';

const WARNING_AND_ABOVE_VALUES = [
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

export function warningAndAboveLogFilter(): QueryDslQueryContainer {
  return {
    bool: {
      should: [
        { terms: { 'log.level': WARNING_AND_ABOVE_VALUES } },
        // OTel severity_number 13-24 = Warn/Error/Fatal (supports both snake_case and PascalCase)
        { range: { severity_number: { gte: 13 } } },
        { range: { SeverityNumber: { gte: 13 } } },
        // Syslog severity 0-4 = Emergency to Warning
        { range: { 'syslog.severity': { lte: 4 } } },
        { range: { 'log.syslog.severity.code': { lte: 4 } } },
        // Windows Event Logs
        { terms: { 'winlog.level_id': ['1', '2', '3'] } },
        // HTTP 5xx
        { range: { 'http.response.status_code': { gte: 500 } } },
        // Error fields present
        { exists: { field: 'error.type' } },
        { exists: { field: 'error.code' } },
      ],
      minimum_should_match: 1,
    },
  };
}
