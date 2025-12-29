/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, LogMeta } from '@kbn/core/server';
import type { LogMessageSource } from '@kbn/logging';

const LOGGER_PREFIX = `[Entity Store v2]`;

export class EntityStoreLogger {
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
}
