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
import { updateAssetCriticalityMappings } from '../asset_criticality/migrations/update_asset_criticality_mappings';
import { updateRiskScoreMappings } from '../risk_engine/migrations/update_risk_score_mappings';
import { renameRiskScoreComponentTemplate } from '../risk_engine/migrations/rename_risk_score_component_templates';
import { createEventIngestedPipelineInAllNamespaces } from '../utils/event_ingested_pipeline';

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
  const paramsWithScopedLogger = {
    ...params,
    logger: params.logger.get('entityAnalytics.migration'),
  };
  await createEventIngestedPipelineInAllNamespaces(paramsWithScopedLogger);
  await updateAssetCriticalityMappings(paramsWithScopedLogger);
  await scheduleAssetCriticalityEcsCompliancyMigration(paramsWithScopedLogger);
  await renameRiskScoreComponentTemplate(paramsWithScopedLogger);
  await updateRiskScoreMappings(paramsWithScopedLogger);
};
