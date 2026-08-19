/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LogLevelId, LogMeta, LogMessageSource, LogRecord, Logger } from '@kbn/logging';

const prefixMessage = (prefix: string, message: LogMessageSource): LogMessageSource =>
  typeof message === 'function' ? () => `${prefix} ${message()}` : `${prefix} ${message}`;

const prefixErrorOrMessage = (
  prefix: string,
  errorOrMessage: LogMessageSource | Error
): LogMessageSource | Error =>
  errorOrMessage instanceof Error ? errorOrMessage : prefixMessage(prefix, errorOrMessage);

/**
 * Wraps a Kibana Logger to automatically prepend `[execution: {uuid}]`
 * to every log message, providing consistent execution tracing across
 * the pipeline without requiring callers to manage the prefix manually.
 */
export const createTracedLogger = (logger: Logger, executionUuid: string): Logger => {
  const prefix = `[execution: ${executionUuid}]`;

  return {
    trace: <Meta extends LogMeta = LogMeta>(message: LogMessageSource, meta?: Meta): void => {
      if (meta !== undefined) {
        logger.trace(prefixMessage(prefix, message), meta);
      } else {
        logger.trace(prefixMessage(prefix, message));
      }
    },

    debug: <Meta extends LogMeta = LogMeta>(message: LogMessageSource, meta?: Meta): void => {
      if (meta !== undefined) {
        logger.debug(prefixMessage(prefix, message), meta);
      } else {
        logger.debug(prefixMessage(prefix, message));
      }
    },

    info: <Meta extends LogMeta = LogMeta>(message: LogMessageSource, meta?: Meta): void => {
      if (meta !== undefined) {
        logger.info(prefixMessage(prefix, message), meta);
      } else {
        logger.info(prefixMessage(prefix, message));
      }
    },

    warn: <Meta extends LogMeta = LogMeta>(
      errorOrMessage: LogMessageSource | Error,
      meta?: Meta
    ): void => {
      if (meta !== undefined) {
        logger.warn(prefixErrorOrMessage(prefix, errorOrMessage), meta);
      } else {
        logger.warn(prefixErrorOrMessage(prefix, errorOrMessage));
      }
    },

    error: <Meta extends LogMeta = LogMeta>(
      errorOrMessage: LogMessageSource | Error,
      meta?: Meta
    ): void => {
      if (meta !== undefined) {
        logger.error(prefixErrorOrMessage(prefix, errorOrMessage), meta);
      } else {
        logger.error(prefixErrorOrMessage(prefix, errorOrMessage));
      }
    },

    fatal: <Meta extends LogMeta = LogMeta>(
      errorOrMessage: LogMessageSource | Error,
      meta?: Meta
    ): void => {
      if (meta !== undefined) {
        logger.fatal(prefixErrorOrMessage(prefix, errorOrMessage), meta);
      } else {
        logger.fatal(prefixErrorOrMessage(prefix, errorOrMessage));
      }
    },

    log: (record: LogRecord): void => logger.log(record),

    isLevelEnabled: (level: LogLevelId): boolean => logger.isLevelEnabled(level),

    get: (...childContextPaths: string[]): Logger =>
      createTracedLogger(logger.get(...childContextPaths), executionUuid),
  };
};
