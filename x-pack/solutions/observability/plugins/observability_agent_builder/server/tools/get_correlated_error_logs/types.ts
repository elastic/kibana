/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolResultType } from '@kbn/onechat-common/tools/tool_result';

export interface GetCorrelatedErrorLogsToolResult {
  type: ToolResultType.other;
  data: {
    correlatedLogs: ErrorLogDoc[][];
  };
}

export interface ErrorAnchor {
  '@timestamp': string;
  correlation: {
    field: string;
    value: string;
  };
}

export interface ErrorLogDoc {
  '@timestamp': string;
  message: string;
}
