/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Effect, Layer } from 'effect';

import { Logger } from './logger';
import { Config } from './config_live';

export const LoggerLive = Layer.effect(
  Logger,
  Effect.gen(function* () {
    const config = yield* Config;
    return {
      log: (message) =>
        Effect.gen(function* () {
          const { logLevel } = yield* config.getConfig;
          // eslint-disable-next-line no-console
          console.log(`[${logLevel}] ${message}`);
        }),
    };
  })
);
