/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import type { SavedObjectsClientContract, IScopedClusterClient, IBasePath } from '@kbn/core/server';
import type { ObservabilityPluginSetup } from '@kbn/observability-plugin/server';
import type {
  EncryptedSavedObjectsPluginSetup,
  EncryptedSavedObjectsPluginStart,
} from '@kbn/encrypted-saved-objects-plugin/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import type { MlPluginSetup as MlSetup } from '@kbn/ml-plugin/server';
import type { RuleRegistryPluginSetupContract } from '@kbn/rule-registry-plugin/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import type { CloudSetup } from '@kbn/cloud-plugin/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { FleetStartContract } from '@kbn/fleet-plugin/server';
import type { SharePluginSetup } from '@kbn/share-plugin/server';
import type { UptimeEsClient } from '../../lib';
import type { UptimeConfig } from '../../../../../common/config';

export type UMElasticsearchQueryFnParams<P> = {
  uptimeEsClient: UptimeEsClient;
  esClient?: IScopedClusterClient;
} & P;

export type UMElasticsearchQueryFn<P, R = any> = (
  params: UMElasticsearchQueryFnParams<P>
) => Promise<R>;

export type UMSavedObjectsQueryFn<T = any, P = undefined> = (
  client: SavedObjectsClientContract,
  params?: P
) => Promise<T> | T;

export interface UptimeServerSetup {
  config: UptimeConfig;
  share: SharePluginSetup;
  basePath: IBasePath;
  isDev?: boolean;
}

export interface UptimeCorePluginsSetup {
  features: FeaturesPluginSetup;
  alerting: any;
  observability: ObservabilityPluginSetup;
  usageCollection: UsageCollectionSetup;
  ml: MlSetup;
  cloud?: CloudSetup;
  ruleRegistry: RuleRegistryPluginSetupContract;
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup;
  taskManager: TaskManagerSetupContract;
  share: SharePluginSetup;
}

export interface UptimeCorePluginsStart {
  security: SecurityPluginStart;
  fleet: FleetStartContract;
  encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
  taskManager: TaskManagerStartContract;
  spaces?: SpacesPluginStart;
}
