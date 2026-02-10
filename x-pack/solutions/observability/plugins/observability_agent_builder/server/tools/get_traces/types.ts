/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface TraceTimeWindow {
  start: number;
  end: number;
  traceId: string;
}

export interface TraceIdSample {
  timestamp: string | undefined;
  traceId: string;
}
