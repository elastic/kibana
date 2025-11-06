/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClient, type CoreSetup } from '@kbn/core/server';
import { OBSERVABILITY_REGISTER_OBSERVABILITY_AGENT_ID } from '@kbn/management-settings-ids';
import {
  OBSERVABILITY_AGENT_FEATURE_FLAG,
  OBSERVABILITY_AGENT_FEATURE_FLAG_DEFAULT,
} from '../../common/constants';
import type {
  ObservabilityAgentPluginStart,
  ObservabilityAgentPluginStartDependencies,
} from '../types';

export async function getIsObservabilityAgentEnabled(
  core: CoreSetup<ObservabilityAgentPluginStartDependencies, ObservabilityAgentPluginStart>
) {
  const [coreStart] = await core.getStartServices();
  const savedObjectsClient = new SavedObjectsClient(
    coreStart.savedObjects.createInternalRepository()
  );
  const uiSettingsClient = coreStart.uiSettings.asScopedToClient(savedObjectsClient);
  const isObservabilityAgentEnabled = await uiSettingsClient.get<boolean>(
    OBSERVABILITY_REGISTER_OBSERVABILITY_AGENT_ID
  );

  const isFeatureFlagEnabled = await coreStart.featureFlags.getBooleanValue(
    OBSERVABILITY_AGENT_FEATURE_FLAG,
    OBSERVABILITY_AGENT_FEATURE_FLAG_DEFAULT
  );

  return isFeatureFlagEnabled && isObservabilityAgentEnabled;
}
