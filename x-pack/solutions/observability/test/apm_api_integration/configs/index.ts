/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mapValues } from 'lodash';
import { createTestConfig, CreateTestConfig } from '../common/config';

const apmDebugLogger = {
  name: 'plugins.apm',
  level: 'debug',
  appenders: ['console'],
};

const kibanaConfig = {
  'xpack.apm.forceSyntheticSource': 'true',
  'logging.loggers': [apmDebugLogger],
  'server.publicBaseUrl': 'http://mockedPublicBaseUrl',
};

const apmFtrConfigs = {
  basic: {
    license: 'basic' as const,
    kibanaConfig,
  },
  trial: {
    license: 'trial' as const,
    kibanaConfig,
  },
  rules: {
    license: 'trial' as const,
    kibanaConfig: {
      ...kibanaConfig,
      'xpack.ruleRegistry.write.enabled': 'true',
    },
  },
  cloud: {
    license: 'basic' as const,
    kibanaConfig: {
      ...kibanaConfig,
      'xpack.apm.agent.migrations.enabled': 'true',
    },
  },
};

export type APMFtrConfigName = keyof typeof apmFtrConfigs;

export const configs: Record<APMFtrConfigName, CreateTestConfig> = mapValues(
  apmFtrConfigs,
  (value, key) => {
    return createTestConfig({
      name: key as APMFtrConfigName,
      ...value,
    });
  }
);
