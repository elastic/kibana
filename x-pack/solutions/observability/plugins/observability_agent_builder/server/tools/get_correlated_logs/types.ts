/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolResultType } from '@kbn/onechat-common/tools/tool_result';

export interface CorrelatedLogGroup<T = Record<string, unknown>> {
  correlation: AnchorLog['correlation'];
  logs: T[];
}

export interface GetCorrelatedLogsToolResult<T = Record<string, unknown>> {
  type: ToolResultType.other;
  data: {
    groups: CorrelatedLogGroup<T>[];
  };
}

export interface AnchorLog {
  '@timestamp': string;
  correlation: {
    field: string;
    value: string;
  };
}
