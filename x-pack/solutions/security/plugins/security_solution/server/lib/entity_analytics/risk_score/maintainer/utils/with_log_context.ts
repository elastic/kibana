/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, LogMeta } from '@kbn/core/server';

export type ScopedLogger = Pick<Logger, 'debug' | 'info' | 'warn' | 'error'>;

export const withLogContext = (logger: ScopedLogger, context: string): ScopedLogger => ({
  debug: (message: string, meta?: LogMeta) => logger.debug(`${context} ${message}`, meta),
  info: (message: string, meta?: LogMeta) => logger.info(`${context} ${message}`, meta),
  warn: (message: string, meta?: LogMeta) => logger.warn(`${context} ${message}`, meta),
  error: (message: string, meta?: LogMeta) => logger.error(`${context} ${message}`, meta),
});
