/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mapValues } from 'lodash';
import type { ObservabilityAIAssistantFtrConfigName } from '../common/config';
import { observabilityAIAssistantFtrConfigs } from '../common/config';
import type { CreateTestConfig } from '../common/config';
import { createTestConfig } from '../common/config';

export const configs: Record<ObservabilityAIAssistantFtrConfigName, CreateTestConfig> = mapValues(
  observabilityAIAssistantFtrConfigs,
  (value, key) => {
    return createTestConfig({
      name: key as ObservabilityAIAssistantFtrConfigName,
      ...value,
    });
  }
);
