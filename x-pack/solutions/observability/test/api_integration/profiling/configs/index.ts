/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mapValues } from 'lodash';
import path from 'path';
import { createTestConfig, CreateTestConfig } from '../common/config';

const kibanaYamlFilePath = path.join(__dirname, './ftr_kibana.yml');

const profilingDebugLogger = {
  name: 'plugins.profiling',
  level: 'debug',
  appenders: ['console'],
};

const profilingFtrConfigs = {
  cloud: {
    license: 'trial' as const,
    kibanaConfig: {
      'logging.loggers': [profilingDebugLogger],
      config: kibanaYamlFilePath,
    },
  },
};

export type ProfilingFtrConfigName = keyof typeof profilingFtrConfigs;

export const configs: Record<ProfilingFtrConfigName, CreateTestConfig> = mapValues(
  profilingFtrConfigs,
  (value, key) => {
    return createTestConfig({
      name: key as ProfilingFtrConfigName,
      ...value,
    });
  }
);
