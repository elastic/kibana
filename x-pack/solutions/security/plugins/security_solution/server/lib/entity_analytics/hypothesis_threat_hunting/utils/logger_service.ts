/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';

export type ThreatHuntingHypothesesLoggerService = ReturnType<
  typeof createThreatHuntingHypothesesLoggerService
>;

type HypothesesThreatHuntingLogLevel = Exclude<keyof Logger, 'get' | 'log' | 'isLevelEnabled'>;

const createHypothesesThreatHuntingLogger = (logger: Logger, namespace: string) => {
  return {
    log: (level: HypothesesThreatHuntingLogLevel, msg: string) => {
      logger[level](`[Hypotheses Threat Hunting][namespace: ${namespace}] ${msg}`);
    },
  };
};
export const createThreatHuntingHypothesesLoggerService = (
  rootLogger: Logger,
  namespace: string
) => {
  const logger = createHypothesesThreatHuntingLogger(rootLogger, namespace);

  const log = (level: 'debug' | 'info' | 'warn' | 'error', msg: string) => {
    logger.log(level, msg);
  };

  return {
    log,
    info: (msg: string) => log('info', msg),
    warn: (msg: string) => log('warn', msg),
    error: (msg: string) => log('error', msg),
    debug: (msg: string) => log('debug', msg),
  };
};
