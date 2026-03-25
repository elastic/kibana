/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginConfigDescriptor, PluginInitializerContext } from '@kbn/core/server';
import { configSchema } from './config_schema';

export const config: PluginConfigDescriptor = {
  schema: configSchema,
};
export async function plugin(initializerContext: PluginInitializerContext) {
  const { ElasticAssistantPlugin } = await import('./plugin');
  return new ElasticAssistantPlugin(initializerContext);
}

export type {
  ElasticAssistantPluginSetup,
  ElasticAssistantPluginStart,
  ElasticAssistantPluginSetupDependencies,
  ElasticAssistantPluginStartDependencies,
  AssistantTool,
  AssistantToolParams,
} from './types';

// Alert Investigation Pipeline - pure algorithm exports for Agent Builder tools
export { deduplicateAlerts } from './lib/alert_investigation/deduplication';
export { extractEntitiesFromAlerts } from './lib/alert_investigation/entity_extraction';
export { matchAlertsToCases } from './lib/alert_investigation/case_matching';
export type {
  ExtractedEntity,
  CaseMatchScore,
  ObservableTypeKey,
} from './lib/alert_investigation/types';
