/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CloudSetup } from '@kbn/cloud-plugin/server';
import type { AuthenticatedUser } from '@kbn/core-security-common';
import { SecurityPluginSetup, SecurityPluginStart } from '@kbn/security-plugin/server';
import type {
  IRouter,
  CustomRequestHandlerContext,
  Logger,
  SavedObjectsClientContract,
  IScopedClusterClient,
} from '@kbn/core/server';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/server';
import type {
  FleetStartContract,
  FleetRequestHandlerContext,
  AgentService,
  PackageService,
  AgentPolicyServiceInterface,
  PackagePolicyClient,
} from '@kbn/fleet-plugin/server';
import type {
  PluginSetup as DataPluginSetup,
  PluginStart as DataPluginStart,
} from '@kbn/data-plugin/server';

import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface CloudDefendPluginSetup {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface CloudDefendPluginStart {}

export interface CloudDefendPluginSetupDeps {
  data: DataPluginSetup;
  security: SecurityPluginSetup;
  cloud: CloudSetup;
  usageCollection?: UsageCollectionSetup;
}
export interface CloudDefendPluginStartDeps {
  data: DataPluginStart;
  fleet: FleetStartContract;
  security: SecurityPluginStart;
  licensing: LicensingPluginStart;
}

export interface CloudDefendApiRequestHandlerContext {
  user: AuthenticatedUser | null;
  logger: Logger;
  esClient: IScopedClusterClient;
  soClient: SavedObjectsClientContract;
  agentPolicyService: AgentPolicyServiceInterface;
  agentService: AgentService;
  packagePolicyService: PackagePolicyClient;
  packageService: PackageService;
}

export type CloudDefendRequestHandlerContext = CustomRequestHandlerContext<{
  cloudDefend: CloudDefendApiRequestHandlerContext;
  fleet: FleetRequestHandlerContext['fleet'];
}>;

/**
 * Convenience type for routers in cloud_defend that includes the CloudDefendRequestHandlerContext type
 * @internal
 */
export type CloudDefendRouter = IRouter<CloudDefendRequestHandlerContext>;
