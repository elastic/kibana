/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuditLogger, Logger, StartServicesAccessor } from '@kbn/core/server';
import type { TaskManagerSetupContract } from '@kbn/task-manager-plugin/server';
import type { StartPlugins } from '../../../plugin';
import { scheduleAssetCriticalityEcsCompliancyMigration } from '../asset_criticality/migrations/schedule_ecs_compliancy_migration';
import { assetCrticalityCopyTimestampToEventIngested } from './asset_criticality_copy_timestamp_to_event_ingested';
import { riskScoreCopyTimestampToEventIngested } from './risk_score_copy_timestamp_to_event_ingested';

export interface EntityAnalyticsMigrationsParams {
  taskManager?: TaskManagerSetupContract;
  logger: Logger;
  getStartServices: StartServicesAccessor<StartPlugins>;
  auditLogger: AuditLogger | undefined;
}

export const scheduleEntityAnalyticsMigration = async (params: EntityAnalyticsMigrationsParams) => {
  const scopedLogger = params.logger.get('entityAnalytics.migration');

  await scheduleAssetCriticalityEcsCompliancyMigration({ ...params, logger: scopedLogger });
};

export const scheduleAssetCriticalityCopyTimestampToEventIngested = async (
  params: EntityAnalyticsMigrationsParams
) => {
  const scopedLogger = params.logger.get(
    'entityAnalytics.assetCriticality.copyTimestampToEventIngested'
  );

  await assetCrticalityCopyTimestampToEventIngested({ ...params, logger: scopedLogger });
};

export const scheduleRiskScoreCopyTimestampToEventIngested = async (
  params: EntityAnalyticsMigrationsParams
) => {
  const scopedLogger = params.logger.get('entityAnalytics.riskScore.copyTimestampToEventIngested');

  await riskScoreCopyTimestampToEventIngested({ ...params, logger: scopedLogger });
};
