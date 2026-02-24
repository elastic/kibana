/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface RuleExecutionSettings {
  extendedLogging: {
    isEnabled: boolean;
    minLevel: LogLevelSetting;
  };
}

export enum LogLevelSetting {
  'trace' = 'trace',
  'debug' = 'debug',
  'info' = 'info',
  'warn' = 'warn',
  'error' = 'error',
  'off' = 'off',
}

export const getExtendedLoggingSettings = (
  minLevel: LogLevelSetting = LogLevelSetting.info
): RuleExecutionSettings['extendedLogging'] => ({
  isEnabled: minLevel !== LogLevelSetting.off,
  minLevel,
});

export const DEFAULT_EXTENDED_LOGGING_SETTINGS: RuleExecutionSettings['extendedLogging'] = {
  isEnabled: true,
  minLevel: LogLevelSetting.info,
};
