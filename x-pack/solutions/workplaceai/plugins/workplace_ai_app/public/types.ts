/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferencePublicStart } from '@kbn/inference-plugin/public';
import type { CloudStart } from '@kbn/cloud-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { TriggersAndActionsUIPublicPluginStart } from '@kbn/triggers-actions-ui-plugin/public';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface WorkplaceAIAppPluginSetup {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface WorkplaceAIAppPluginStart {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface WorkplaceAIAppPluginSetupDependencies {}

export interface WorkplaceAIAppPluginStartDependencies {
  inference: InferencePublicStart;
  spaces: SpacesPluginStart;
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
  cloud?: CloudStart;
  share?: SharePluginStart;
}
