/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const DEFAULT_LOG_SOURCE_FIELDS = [
  '@timestamp',
  'message',
  'trace.id',
  'transaction.id',
  'span.id',
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

export interface TraceSequence {
  traceId: string;
  traceItems: {
    [k: string]: unknown;
  }[];
  logs: {
    [k: string]: unknown;
  }[];
}

export const DEFAULT_MAX_APM_EVENTS = 500;
export const DEFAULT_MAX_LOG_EVENTS = 200;

export const DEFAULT_TIME_RANGE = {
  start: 'now-1h',
  end: 'now',
};
