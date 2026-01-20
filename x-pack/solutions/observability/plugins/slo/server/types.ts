/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertingServerSetup, AlertingServerStart } from '@kbn/alerting-plugin/server';
import type { CloudSetup } from '@kbn/cloud-plugin/server';
import type { KibanaRequest } from '@kbn/core/server';
import type { DataViewsServerPluginStart } from '@kbn/data-views-plugin/server';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import type { LicensingPluginSetup, LicensingPluginStart } from '@kbn/licensing-plugin/server';
import type {
  RuleRegistryPluginSetupContract,
  RuleRegistryPluginStartContract,
} from '@kbn/rule-registry-plugin/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import type { SharePluginSetup } from '@kbn/share-plugin/server';
import type { SloSharedPluginSetup, SloSharedPluginStart } from '@kbn/slo-shared-plugin/server';
import type { SpacesPluginSetup, SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import type { SloClient } from './client';

export type { SLOConfig } from '../common/config';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SLOServerSetup {}

export interface SLOServerStart {
  getSloClientWithRequest: (request: KibanaRequest) => Promise<SloClient>;
}

export interface SLOPluginSetupDependencies {
  alerting: AlertingServerSetup;
  ruleRegistry: RuleRegistryPluginSetupContract;
  share: SharePluginSetup;
  features: FeaturesPluginSetup;
  taskManager: TaskManagerSetupContract;
  spaces?: SpacesPluginSetup;
  cloud?: CloudSetup;
  usageCollection: UsageCollectionSetup;
  licensing: LicensingPluginSetup;
  dataViews: DataViewsServerPluginStart;
  security: SecurityPluginStart;
  sloShared: SloSharedPluginSetup;
}

export interface SLOPluginStartDependencies {
  alerting: AlertingServerStart;
  taskManager: TaskManagerStartContract;
  spaces?: SpacesPluginStart;
  ruleRegistry: RuleRegistryPluginStartContract;
  dataViews: DataViewsServerPluginStart;
  licensing: LicensingPluginStart;
  sloShared: SloSharedPluginStart;
}
