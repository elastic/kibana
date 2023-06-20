/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mapValues } from 'lodash';
import { createTestConfig, CreateTestConfig } from '../common/config';

export const observabilityOnboardingDebugLogger = {
  name: 'plugins.observabilityOnboarding',
  level: 'debug',
  appenders: ['console'],
};

const observabilityOnboardingFtrConfigs = {
  basic: {
    license: 'basic' as const,
    kibanaConfig: {
      'logging.loggers': [observabilityOnboardingDebugLogger],
    },
  },
};

export type ObservabilityOnboardingFtrConfigName = keyof typeof observabilityOnboardingFtrConfigs;

export const configs: Record<ObservabilityOnboardingFtrConfigName, CreateTestConfig> = mapValues(
  observabilityOnboardingFtrConfigs,
  (value, key) => {
    return createTestConfig({
      name: key as ObservabilityOnboardingFtrConfigName,
      ...value,
    });
  }
);
