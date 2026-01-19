/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CreateTestConfigOptions } from '../../../../../config/serverless/config.base';
import { createTestConfig } from '../../../../../config/serverless/config.base';
import { LOGGING_CONFIG, FLEET_PLUGIN_READY_LOG_MESSAGE_REGEXP } from '../constants';

export function createCompleteTierTestConfig(options: CreateTestConfigOptions) {
  return createTestConfig({
    kbnTestServerArgs: [`--logging.loggers=${JSON.stringify(LOGGING_CONFIG)}`],
    kbnTestServerWait: FLEET_PLUGIN_READY_LOG_MESSAGE_REGEXP,
    ...options,
  });
}
