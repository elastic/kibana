/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/server';
import {
  OBSERVABILITY_AGENT_FEATURE_FLAG,
  OBSERVABILITY_AGENT_FEATURE_FLAG_DEFAULT,
} from '../../common/constants';
import type {
  ObservabilityAgentBuilderPluginStart,
  ObservabilityAgentBuilderPluginStartDependencies,
} from '../types';

export async function getIsObservabilityAgentEnabled(
  core: CoreSetup<
    ObservabilityAgentBuilderPluginStartDependencies,
    ObservabilityAgentBuilderPluginStart
  >
) {
  const [coreStart] = await core.getStartServices();
  const isFeatureFlagEnabled = await coreStart.featureFlags.getBooleanValue(
    OBSERVABILITY_AGENT_FEATURE_FLAG,
    OBSERVABILITY_AGENT_FEATURE_FLAG_DEFAULT
  );

  return isFeatureFlagEnabled;
}
