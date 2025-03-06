/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CoreSetup, ElasticsearchClient, Logger, LoggerFactory } from '@kbn/core/server';
import type { SecurityPluginSetup, SecurityPluginStart } from '@kbn/security-plugin/server';
import type { FeaturesPluginSetup, FeaturesPluginStart } from '@kbn/features-plugin/server';
import type {
  PluginSetup as SecuritySolutionPluginSetup,
  PluginStart as SecuritySolutionPluginStart,
} from '@kbn/security-solution-plugin/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { CloudSetup } from '@kbn/cloud-plugin/server';
import type { SecuritySolutionEssPluginSetup } from '@kbn/security-solution-ess/server';
import type { FleetStartContract } from '@kbn/fleet-plugin/server';
import type { PluginSetupContract as ActionsPluginSetupContract } from '@kbn/actions-plugin/server';

import type { ServerlessPluginSetup } from '@kbn/serverless/server';
import type { AutomaticImportPluginSetup } from '@kbn/automatic-import-plugin/server';
import type { ProductTier } from '../common/product';

import type { ServerlessSecurityConfig } from './config';
import type { UsageReportingService } from './common/services/usage_reporting_service';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SecuritySolutionServerlessPluginSetup {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SecuritySolutionServerlessPluginStart {}

export interface SecuritySolutionServerlessPluginSetupDeps {
  security: SecurityPluginSetup;
  securitySolution: SecuritySolutionPluginSetup;
  securitySolutionEss: SecuritySolutionEssPluginSetup;
  serverless: ServerlessPluginSetup;
  features: FeaturesPluginSetup;
  taskManager: TaskManagerSetupContract;
  cloud: CloudSetup;
  actions: ActionsPluginSetupContract;
  automaticImport?: AutomaticImportPluginSetup;
}

export interface SecuritySolutionServerlessPluginStartDeps {
  security: SecurityPluginStart;
  securitySolution: SecuritySolutionPluginStart;
  features: FeaturesPluginStart;
  taskManager: TaskManagerStartContract;
  fleet: FleetStartContract;
}

export interface UsageRecord {
  id: string;
  usage_timestamp: string;
  creation_timestamp: string;
  usage: UsageMetrics;
  source: UsageSource;
}

export interface UsageMetrics {
  type: string;
  sub_type?: string;
  quantity: number;
  period_seconds?: number;
  cause?: string;
  metadata?: ResourceSubtypeCounter;
}

export interface UsageSource {
  id: string;
  instance_group_id: string;
  metadata?: { tier?: Tier };
}

export type Tier = ProductTier | 'none';

export interface SecurityUsageReportingTaskSetupContract {
  core: CoreSetup;
  logFactory: LoggerFactory;
  config: ServerlessSecurityConfig;
  taskManager: TaskManagerSetupContract;
  cloudSetup: CloudSetup;
  taskType: string;
  taskTitle: string;
  version: string;
  meteringCallback: MeteringCallback;
  usageReportingService: UsageReportingService;
}

export interface SecurityUsageReportingTaskStartContract {
  taskManager: TaskManagerStartContract;
  interval: string;
}

export interface MeteringCallBackResponse {
  records: UsageRecord[];
  latestTimestamp?: Date; // timestamp of the latest record
  shouldRunAgain?: boolean; // if task should run again immediately
}

export type MeteringCallback = (
  metringCallbackInput: MeteringCallbackInput
) => Promise<MeteringCallBackResponse>;

export interface MeteringCallbackInput {
  esClient: ElasticsearchClient;
  cloudSetup: CloudSetup;
  logger: Logger;
  taskId: string;
  lastSuccessfulReport: Date;
  abortController: AbortController;
  config: ServerlessSecurityConfig;
}

export interface MetringTaskProperties {
  taskType: string;
  taskTitle: string;
  meteringCallback: MeteringCallback;
  interval: string;
  periodSeconds: number;
  version: string;
}
export interface ResourceSubtypeCounter {
  [key: string]: string;
}
