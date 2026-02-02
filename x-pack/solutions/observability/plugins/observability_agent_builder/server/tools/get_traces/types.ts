/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';

export interface TraceSequence {
  correlation_identifier: Correlation;
  traceItems: Record<string, unknown>[];
  logs: Record<string, unknown>[];
  errorItems: Record<string, unknown>[];
  isTruncated?: boolean;
}

export interface GetTracesToolResult {
  type: ToolResultType.other;
  data: {
    sequences: TraceSequence[];
    message?: string;
  };
}

export interface AnchorLog {
  '@timestamp': string;
  correlation: {
    field: string;
    value: string;
    anchorLogId: string;
  };
}

export interface Correlation {
  start: number;
  end: number;
  identifier: {
    field: string;
    value: string;
  };
}
