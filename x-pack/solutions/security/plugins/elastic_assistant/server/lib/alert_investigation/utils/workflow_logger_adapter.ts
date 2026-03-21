/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';

/**
 * Workflow Logger → Kibana Logger Adapter
 *
 * Problem: Workflow step context provides a logger with different interface than @kbn/core Logger
 * Solution: Adapter pattern that conforms workflow logger to Kibana Logger interface
 *
 * Eliminates all `context.logger as Logger` type casts (HIGH severity finding #5)
 */

interface WorkflowLogger {
  debug: (message: string) => void;
  info: (message: string) => void;
  warn: (message: string) => void;
  error: (message: string) => void;
}

export function adaptWorkflowLogger(workflowLogger: WorkflowLogger): Logger {
  return {
    debug: (message: string | (() => string), meta?: unknown) => {
      const msg = typeof message === 'function' ? message() : message;
      workflowLogger.debug(meta ? `${msg} ${JSON.stringify(meta)}` : msg);
    },
    info: (message: string, meta?: unknown) => {
      workflowLogger.info(meta ? `${message} ${JSON.stringify(meta)}` : message);
    },
    warn: (message: string, meta?: unknown) => {
      workflowLogger.warn(meta ? `${message} ${JSON.stringify(meta)}` : message);
    },
    error: (message: string | Error, meta?: unknown) => {
      const msg = message instanceof Error ? message.message : message;
      workflowLogger.error(meta ? `${msg} ${JSON.stringify(meta)}` : msg);
    },
    fatal: (message: string | Error, meta?: unknown) => {
      // Workflow logger doesn't have fatal, use error
      const msg = message instanceof Error ? message.message : message;
      workflowLogger.error(`[FATAL] ${meta ? `${msg} ${JSON.stringify(meta)}` : msg}`);
    },
    trace: (message: string, meta?: unknown) => {
      // Workflow logger doesn't have trace, use debug
      workflowLogger.debug(meta ? `[TRACE] ${message} ${JSON.stringify(meta)}` : `[TRACE] ${message}`);
    },
    log: (record: unknown) => {
      workflowLogger.info(JSON.stringify(record));
    },
    get: () => {
      return adaptWorkflowLogger(workflowLogger); // Return self for nested loggers
    },
    isLevelEnabled: () => true, // Assume enabled
  } as Logger;
}
