/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type MlPluginSetup } from '@kbn/ml-plugin/public';
import type { SpacesPluginSetup, SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { SecurityPluginStart } from '@kbn/security-plugin/public';
import type { LicensingPluginSetup, LicensingPluginStart } from '@kbn/licensing-plugin/public';
import type {
  TriggersAndActionsUIPublicPluginStart as TriggersActionsStart,
  TriggersAndActionsUIPublicPluginSetup,
} from '@kbn/triggers-actions-ui-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import type { ProductDocBasePluginStart } from '@kbn/product-doc-base-plugin/public';
import type { Storage } from '@kbn/kibana-utils-plugin/public';
import type { DiscoverStart } from '@kbn/discover-plugin/public';
import type { ElasticAssistantSharedStatePublicPluginStart } from '@kbn/elastic-assistant-shared-state-plugin/public';
import type { AIAssistantManagementSelectionPluginPublicStart } from '@kbn/ai-assistant-management-plugin/public';
import type { TelemetryServiceStart } from './src/common/lib/telemetry/telemetry_service';

export interface ElasticAssistantPublicPluginSetupDependencies {
  ml: MlPluginSetup;
  spaces?: SpacesPluginSetup;
  licensing: LicensingPluginSetup;
  triggersActionsUi: TriggersAndActionsUIPublicPluginSetup;
}
export interface ElasticAssistantPublicPluginStartDependencies {
  licensing: LicensingPluginStart;
  triggersActionsUi: TriggersActionsStart;
  spaces: SpacesPluginStart;
  security: SecurityPluginStart;
  productDocBase: ProductDocBasePluginStart;
  discover: DiscoverStart;
  elasticAssistantSharedState: ElasticAssistantSharedStatePublicPluginStart;
  aiAssistantManagementSelection: AIAssistantManagementSelectionPluginPublicStart;
}

export type StartServices = CoreStart &
  ElasticAssistantPublicPluginStartDependencies & {
    telemetry: TelemetryServiceStart;
    storage: Storage;
  };
