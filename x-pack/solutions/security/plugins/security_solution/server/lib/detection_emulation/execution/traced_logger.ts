/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, LogMeta } from '@kbn/core/server';

/**
 * A thin wrapper around Kibana's `Logger` that prefixes every message with a
 * stable, grep-friendly execution context string. Inspired by the
 * `createTracedLogger` pattern in the Workflows orchestration stack
 * (PR #260793).
 *
 * Usage:
 * ```ts
 * const log = createTracedLogger(logger, {
 *   tool: 'validate-rule',
 *   ruleId: 'abc-123',
 *   mode: 'log_injection',
 * });
 * log.info('Step 4: scenario generated');
 * // => [detection-emulation][validate-rule][abc-123][log_injection] Step 4: scenario generated
 * ```
 *
 * The returned object implements the four severity methods used across the
 * detection-emulation codebase (`debug`, `info`, `warn`, `error`). It does
 * NOT re-export every Logger method — callers that need `trace`, `fatal`, or
 * `isLevelEnabled` should fall through to the underlying logger directly.
 */
export interface TracedLogger {
  debug(message: string, meta?: LogMeta): void;
  info(message: string, meta?: LogMeta): void;
  warn(message: string, meta?: LogMeta): void;
  error(message: string, meta?: LogMeta): void;
  /** The underlying Kibana logger, for pass-through to APIs that require `Logger`. */
  readonly raw: Logger;
}

export interface TracedLoggerContext {
  /** Tool or surface name, e.g. `'validate-rule'` or `'run-command'`. */
  tool: string;
  /** Primary entity identifier (ruleId, emulationId, etc.). */
  entityId?: string;
  /** Execution mode when applicable. */
  mode?: string;
}

/**
 * Create an execution-scoped logger that prefixes every message with a
 * structured context tag. The prefix is computed once at construction so
 * repeated calls pay no allocation cost.
 */
export function createTracedLogger(logger: Logger, ctx: TracedLoggerContext): TracedLogger {
  const parts = ['detection-emulation', ctx.tool];
  if (ctx.entityId) parts.push(ctx.entityId);
  if (ctx.mode) parts.push(ctx.mode);
  const prefix = parts.map((p) => `[${p}]`).join('');

  return {
    debug: (message, meta?) => logger.debug(`${prefix} ${message}`, meta as Record<string, unknown>),
    info: (message, meta?) => logger.info(`${prefix} ${message}`, meta as Record<string, unknown>),
    warn: (message, meta?) => logger.warn(`${prefix} ${message}`, meta as Record<string, unknown>),
    error: (message, meta?) => logger.error(`${prefix} ${message}`, meta as Record<string, unknown>),
    raw: logger,
  };
}
