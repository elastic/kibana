/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';

export type HypothesesThreatHuntingLogLevel = Exclude<
  keyof Logger,
  'get' | 'log' | 'isLevelEnabled'
>;

export interface HypothesesThreatHuntingLogger {
  log: (level: HypothesesThreatHuntingLogLevel, msg: string) => void;
}

export const createHypothesesThreatHuntingLogger = (logger: Logger, namespace: string) => {
  return {
    log: (level: HypothesesThreatHuntingLogLevel, msg: string) => {
      logger[level](`[Hypotheses Threat Hunting][namespace: ${namespace}] ${msg}`);
    },
  };
};
