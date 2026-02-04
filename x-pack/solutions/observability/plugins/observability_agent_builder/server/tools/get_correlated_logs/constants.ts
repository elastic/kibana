/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Correlation identifier fields in priority order
export const DEFAULT_CORRELATION_IDENTIFIER_FIELDS = [
  'trace.id',
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

export const DEFAULT_LOG_SOURCE_FIELDS = [
  '@timestamp',
  'message',
  'log.level',
  'service.*',
  'host.*',
  'container.*',
  'kubernetes.*',
  'cloud.*',
  'error.*',
  'event.*',
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

export const DEFAULT_ERROR_LOGS_ONLY = true;
export const DEFAULT_MAX_SEQUENCES = 10;
export const DEFAULT_MAX_LOGS_PER_SEQUENCE = 50;
