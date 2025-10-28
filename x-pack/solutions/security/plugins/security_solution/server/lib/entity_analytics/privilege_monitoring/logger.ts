/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';

export type PrivMonLogLevel = Exclude<keyof Logger, 'get' | 'log' | 'isLevelEnabled'>;

export interface PrivMonLogger {
  log: (level: PrivMonLogLevel, msg: string) => void;
}

export const createPrivMonLogger = (logger: Logger, namespace: string) => {
  return {
    log: (level: PrivMonLogLevel, msg: string) => {
      logger[level](`[Privileged Monitoring Engine][namespace: ${namespace}] ${msg}`);
    },
  };
};
