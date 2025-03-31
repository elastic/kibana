/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { assertUnreachable } from '../../../../utility_types';
import type { RuleExecutionStatus } from './execution_status.gen';
import { RuleExecutionStatusEnum } from './execution_status.gen';
import { LogLevel, LogLevelEnum } from './execution_event.gen';

/**
 * An array of supported log levels.
 */
export const LOG_LEVELS = LogLevel.options;

export const logLevelToNumber = (level: LogLevel | null | undefined): number => {
  if (!level) {
    return 0;
  }

  switch (level) {
    case LogLevelEnum.trace:
      return 0;
    case LogLevelEnum.debug:
      return 10;
    case LogLevelEnum.info:
      return 20;
    case LogLevelEnum.warn:
      return 30;
    case LogLevelEnum.error:
      return 40;
    default:
      assertUnreachable(level);
      return 0;
  }
};

export const logLevelFromNumber = (num: number | null | undefined): LogLevel => {
  if (num === null || num === undefined || num < 10) {
    return LogLevelEnum.trace;
  }
  if (num < 20) {
    return LogLevelEnum.debug;
  }
  if (num < 30) {
    return LogLevelEnum.info;
  }
  if (num < 40) {
    return LogLevelEnum.warn;
  }
  return LogLevelEnum.error;
};

export const eventLogLevelFromExecutionStatus = (status: RuleExecutionStatus): LogLevel => {
  switch (status) {
    case RuleExecutionStatusEnum['going to run']:
    case RuleExecutionStatusEnum.running:
    case RuleExecutionStatusEnum.succeeded:
      return LogLevelEnum.info;
    case RuleExecutionStatusEnum['partial failure']:
      return LogLevelEnum.warn;
    case RuleExecutionStatusEnum.failed:
      return LogLevelEnum.error;
    default:
      assertUnreachable(status);
      return LogLevelEnum.trace;
  }
};

export const consoleLogLevelFromExecutionStatus = (
  status: RuleExecutionStatus,
  userError?: boolean
): LogLevel => {
  if (!userError && status === RuleExecutionStatusEnum.failed) {
    return LogLevelEnum.error;
  }
  return LogLevelEnum.debug;
};
