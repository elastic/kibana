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

const apmFtrConfigs = {
  basic: {
    license: 'basic' as const,
    kibanaConfig: {
      'xpack.apm.forceSyntheticSource': 'true',
      'logging.loggers': [apmDebugLogger],
      'server.publicBaseUrl': 'http://mockedPublicBaseUrl',
    },
  },
  trial: {
    license: 'trial' as const,
    kibanaConfig: {
      'xpack.apm.forceSyntheticSource': 'true',
      'logging.loggers': [apmDebugLogger],
    },
  },
  rules: {
    license: 'trial' as const,
    kibanaConfig: {
      'xpack.ruleRegistry.write.enabled': 'true',
      'xpack.apm.forceSyntheticSource': 'true',
      'logging.loggers': [apmDebugLogger],
    },
  },
  cloud: {
    license: 'basic' as const,
    kibanaConfig: {
      'xpack.apm.agent.migrations.enabled': 'true',
      'xpack.apm.forceSyntheticSource': 'true',
      'logging.loggers': [apmDebugLogger],
    },
  },
  serverless: {
    license: 'basic' as const,
    kibanaConfig: {
      'xpack.apm.featureFlags.agentConfigurationAvailable': 'false',
      'xpack.apm.featureFlags.configurableIndicesAvailable': 'false',
      'xpack.apm.featureFlags.infrastructureTabAvailable': 'false',
      'xpack.apm.featureFlags.infraUiAvailable': 'false',
      'xpack.apm.featureFlags.migrationToFleetAvailable': 'false',
      'xpack.apm.featureFlags.sourcemapApiAvailable': 'false',
      'xpack.apm.featureFlags.storageExplorerAvailable': 'false',
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
