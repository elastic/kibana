/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';

export interface LogSequence {
  correlation: AnchorLog['correlation'];
  logs: Record<string, unknown>[];
  isTruncated?: boolean;
}

export interface GetCorrelatedLogsToolResult {
  type: ToolResultType.other;
  data: {
    sequences: LogSequence[];
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
