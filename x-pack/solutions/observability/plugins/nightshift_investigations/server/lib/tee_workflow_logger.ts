/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { StepHandlerContext } from '@kbn/workflows-extensions/server';

const resolveMessage = (message: unknown): string => {
  if (typeof message === 'function') {
    try {
      const result = message();
      return typeof result === 'string' ? result : String(result);
    } catch {
      return '[log message threw]';
    }
  }
  if (typeof message === 'string') {
    return message;
  }
  if (message instanceof Error) {
    return message.message;
  }
  return String(message);
};

/**
 * Forwards plugin-logger lines onto the workflow step logger so they appear in
 * the execution Logs panel. Independent of LLM connector selection.
 */
export const teeWorkflowLogger = (
  pluginLogger: Logger,
  workflowLogger: StepHandlerContext['logger']
): Logger => {
  const wrap =
    (level: 'debug' | 'info' | 'warn' | 'error') =>
    (message: unknown, ...args: unknown[]) => {
      (pluginLogger[level] as (msg: unknown, ...rest: unknown[]) => void)(message, ...args);
      const text = resolveMessage(message);
      if (level === 'error') {
        workflowLogger.error(text, args[0] instanceof Error ? args[0] : undefined);
      } else {
        workflowLogger[level](text);
      }
    };

  return Object.create(pluginLogger, {
    debug: { value: wrap('debug') },
    info: { value: wrap('info') },
    warn: { value: wrap('warn') },
    error: { value: wrap('error') },
    get: {
      value: (...bindings: Parameters<Logger['get']>) =>
        teeWorkflowLogger(pluginLogger.get(...bindings), workflowLogger),
    },
  }) as Logger;
};
