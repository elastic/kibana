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
import { updateAssetCriticalityMappings } from '../asset_criticality/migrations/update_asset_criticality_mappings';
import { updateRiskScoreMappings } from '../risk_engine/migrations/update_risk_score_mappings';

export interface EntityAnalyticsMigrationsParams {
  taskManager?: TaskManagerSetupContract;
  logger: Logger;
  getStartServices: StartServicesAccessor<StartPlugins>;
  auditLogger: AuditLogger | undefined;
  kibanaVersion: string;
}

/**
 * ### How to add a new field to the risk score index and template mappings?

 * - Update the mapping object [here](../risk_score/configurations.ts)
 * - Pump the `mappingsVersion` version [here](../risk_engine/utils/saved_object_configuration.ts)
 *
 * ### How to add a new field to the asset criticality index?
 * - Update the mapping object [here](../asset_criticality/constants.ts)
 * - Pump the `ASSET_CRITICALITY_MAPPINGS_VERSIONS` version [here](../asset_criticality/constants.ts)
 *
 * ### How to update the risk score transform config?
 * - Update the transform config [here](../risk_score/configurations.ts)
 * - Pump the `version` [here](../risk_score/configurations.ts)
 *
 * note: If you change the `latest` property, the transform will reinstall after the engine task runs.
 */
export const scheduleEntityAnalyticsMigration = async (params: EntityAnalyticsMigrationsParams) => {
  const scopedLogger = params.logger.get('entityAnalytics.migration');

  await updateAssetCriticalityMappings({ ...params, logger: scopedLogger });
  await scheduleAssetCriticalityEcsCompliancyMigration({ ...params, logger: scopedLogger });
  await updateRiskScoreMappings({ ...params, logger: scopedLogger });
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
