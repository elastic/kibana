/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/logging';
import { ToolingLog } from '@kbn/tooling-log';

export function getLoggerMock(toolingLog: ToolingLog) {
  return {
    debug: (...args: any[]) => toolingLog.debug(...args),
    error: (errorOrMessage: Error) => toolingLog.error(errorOrMessage),
    info: (...args: any[]) => toolingLog.info(...args),
    warn: (...args: any[]) => toolingLog.warning(...args),
    fatal: (...args: any[]) => toolingLog.warning(...args),
    trace: (...args: any[]) => toolingLog.debug(...args),
  } as unknown as Logger;
}
