/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolResultType } from '@kbn/onechat-common/tools/tool_result';

export interface LogSequence<T = Record<string, unknown>> {
  correlation: AnchorLog['correlation'];
  logs: T[];
  isTruncated?: boolean;
}

export interface GetCorrelatedLogsToolResult<T = Record<string, unknown>> {
  type: ToolResultType.other;
  data: {
    sequences: LogSequence<T>[];
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
