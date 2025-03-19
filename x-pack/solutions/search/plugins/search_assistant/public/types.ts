/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UsageCollectionStart } from '@kbn/usage-collection-plugin/public';
import { ObservabilityAIAssistantPublicStart } from '@kbn/observability-ai-assistant-plugin/public';
import { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import { MlPluginStart } from '@kbn/ml-plugin/public';
import { SharePluginStart } from '@kbn/share-plugin/public';
import { TriggersAndActionsUIPublicPluginStart } from '@kbn/triggers-actions-ui-plugin/public';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SearchAssistantPluginSetup {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SearchAssistantPluginStart {}

export interface SearchAssistantPluginStartDependencies {
  licensing: LicensingPluginStart;
  ml: MlPluginStart;
  observabilityAIAssistant: ObservabilityAIAssistantPublicStart;
  share: SharePluginStart;
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
  usageCollection?: UsageCollectionStart;
}
