/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CustomRequestHandlerContext } from '@kbn/core-http-request-handler-context-server';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import type { ObservabilityPluginSetup } from '@kbn/observability-plugin/server';
import type { SpacesPluginStart, SpacesPluginSetup } from '@kbn/spaces-plugin/server';
import type { CloudSetup, CloudStart } from '@kbn/cloud-plugin/server';
import type { FleetSetupContract, FleetStartContract } from '@kbn/fleet-plugin/server';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import type {
  ProfilingDataAccessPluginSetup,
  ProfilingDataAccessPluginStart,
} from '@kbn/profiling-data-access-plugin/server';
import type { SecurityPluginSetup, SecurityPluginStart } from '@kbn/security-plugin/server';
import type {
  ApmDataAccessPluginSetup,
  ApmDataAccessPluginStart,
} from '@kbn/apm-data-access-plugin/server';

export interface ProfilingPluginSetupDeps {
  observability: ObservabilityPluginSetup;
  features: FeaturesPluginSetup;
  cloud?: CloudSetup;
  fleet?: FleetSetupContract;
  spaces?: SpacesPluginSetup;
  usageCollection?: UsageCollectionSetup;
  profilingDataAccess: ProfilingDataAccessPluginSetup;
  security?: SecurityPluginSetup;
  apmDataAccess?: ApmDataAccessPluginSetup;
}

export interface ProfilingPluginStartDeps {
  observability: {};
  features: {};
  cloud?: CloudStart;
  fleet?: FleetStartContract;
  spaces?: SpacesPluginStart;
  profilingDataAccess: ProfilingDataAccessPluginStart;
  security?: SecurityPluginStart;
  apmDataAccess?: ApmDataAccessPluginStart;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ProfilingPluginSetup {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ProfilingPluginStart {}

export type ProfilingRequestHandlerContext = CustomRequestHandlerContext<{}>;

export type TelemetryUsageCounter = ReturnType<UsageCollectionSetup['createUsageCounter']>;
