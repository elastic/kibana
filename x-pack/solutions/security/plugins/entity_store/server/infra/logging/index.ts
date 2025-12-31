/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, LogMeta } from '@kbn/core/server';
import type { LogLevelId, LogMessageSource, LogRecord } from '@kbn/logging';

const LOGGER_PREFIX = `[Entity Store v2]`;

export class EntityStoreLogger implements Logger {
  readonly logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  debug(message: LogMessageSource, meta?: LogMeta) {
    this.logger.debug(`${LOGGER_PREFIX} ${message}`, meta);
  }

  info(message: LogMessageSource, meta?: LogMeta) {
    this.logger.info(`${LOGGER_PREFIX} ${message}`, meta);
  }

  warn(message: LogMessageSource | Error, meta?: LogMeta) {
    this.logger.warn(`${LOGGER_PREFIX} ${message}`, meta);
  }

  error(message: LogMessageSource | Error, meta?: LogMeta) {
    this.logger.error(`${LOGGER_PREFIX} ${message}`, meta);
  }

  trace(message: LogMessageSource, meta?: LogMeta): void {
    this.logger.trace(`${LOGGER_PREFIX} ${message}`, meta);
  }

  fatal(message: LogMessageSource | Error, meta?: LogMeta): void {
    this.logger.fatal(`${LOGGER_PREFIX} ${message}`, meta);
  }

  log(record: LogRecord): void {
    this.logger.log({ ...record, message: `${LOGGER_PREFIX} ${record.message}` });
  }

  isLevelEnabled(level: LogLevelId): boolean {
    return this.logger.isLevelEnabled(level);
  }

  get(...childContextPaths: string[]): Logger {
    return this.logger.get(...childContextPaths);
  }
}
