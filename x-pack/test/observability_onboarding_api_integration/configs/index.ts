/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mapValues } from 'lodash';
import { createTestConfig, CreateTestConfig } from '../common/config';

export const MOCKED_PUBLIC_BASE_URL = 'http://mockedpublicbaseurl';
// my.mocked.domain$myMockedEsUr$myKibanaMockedUrl
export const MOCKED_ENCODED_CLOUD_ID =
  'bXkubW9ja2VkLmRvbWFpbiRteU1vY2tlZEVzVXJsJG15TW9ja2VkS2liYW5hVXJs';
export const MOCKED_KIBANA_URL = 'https://mymockedkibanaurl.my.mocked.domain';

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
      'server.publicBaseUrl': MOCKED_PUBLIC_BASE_URL,
    },
  },
  cloud: {
    license: 'basic' as const,
    kibanaConfig: {
      'logging.loggers': [observabilityOnboardingDebugLogger],
      'xpack.cloud.id': MOCKED_ENCODED_CLOUD_ID,
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
