/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CreateTestConfigOptions } from '../../../../../config/serverless/config.base.essentials';
import { createTestConfig } from '../../../../../config/serverless/config.base.essentials';
import { LOGGING_CONFIG } from '../constants';

export function createEssentialsTierTestConfig(options: CreateTestConfigOptions) {
  return createTestConfig({
    kbnTestServerArgs: [`--logging.loggers=${JSON.stringify(LOGGING_CONFIG)}`],
    ...options,
  });
}
