/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mapValues } from 'lodash';
import path from 'path';
import { createTestConfig, CreateTestConfig } from '../common/config';

export const observabilityAIAssistantDebugLogger = {
  name: 'plugins.observabilityAIAssistant',
  level: 'debug',
  appenders: ['console'],
};

export const observabilityAIAssistantFtrConfigs = {
  basic: {
    license: 'basic' as const,
    kibanaConfig: {
      'logging.loggers': [observabilityAIAssistantDebugLogger],
    },
  },
  enterprise: {
    license: 'trial' as const,
    kibanaConfig: {
      'logging.loggers': [observabilityAIAssistantDebugLogger],
      'plugin-path': path.resolve(
        __dirname,
        '../../../../test/analytics/plugins/analytics_ftr_helpers'
      ),
    },
  },
};

export type ObservabilityAIAssistantFtrConfigName = keyof typeof observabilityAIAssistantFtrConfigs;

export const configs: Record<ObservabilityAIAssistantFtrConfigName, CreateTestConfig> = mapValues(
  observabilityAIAssistantFtrConfigs,
  (value, key) => {
    return createTestConfig({
      name: key as ObservabilityAIAssistantFtrConfigName,
      ...value,
    });
  }
);
