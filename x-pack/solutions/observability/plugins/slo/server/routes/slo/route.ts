/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { bulkDeleteSLORoute, getBulkDeleteStatusRoute } from './bulk_delete';
import { bulkPurgeRollupRoute } from './bulk_purge_rollup';
import { createSLORoute } from './create_slo';
import { deleteSloInstancesRoute } from './delete_instances';
import { findSLOInstancesRoute } from './find_instances';
import { deleteSLORoute } from './delete_slo';
import { disableSLORoute } from './disable_slo';
import { enableSLORoute } from './enable_slo';
import { fetchSloHealthRoute } from './fetch_health';
import { fetchHistoricalSummary } from './fetch_historical_summary';
import { findSloDefinitionsRoute } from './find_definitions';
import { findSLOGroupsRoute } from './find_groups';
import { findSLORoute } from './find_slo';
import { getDiagnosisRoute } from './get_diagnosis';
import { getPreviewData } from './get_preview_data';
import { getSLORoute } from './get_slo';
import { getSloBurnRates } from './get_slo_burn_rates';
import { getSloSettingsRoute } from './get_slo_settings';
import { getSLOStatsOverview } from './get_slo_stats_overview';
import { getSLOSuggestionsRoute } from './get_suggestions';
import { inspectSLORoute } from './inspect_slo';
import { getPurgeInstancesStatusRoute, purgeInstancesRoute } from './purge_instances';
import { resetSLORoute } from './reset_slo';
import { repairSLORoute } from './repair_slo';
import { updateSLORoute } from './update_slo';
import { updateSloSettings } from './update_slo_settings';
import { getSLOTemplateRoute, findSLOTemplatesRoute } from './slo_templates';

export const getSloRouteRepository = (isServerless?: boolean) => {
  return {
    ...fetchSloHealthRoute,
    ...getSloSettingsRoute,
    ...updateSloSettings(isServerless),
    ...createSLORoute,
    ...inspectSLORoute,
    ...deleteSLORoute,
    ...deleteSloInstancesRoute,
    ...bulkPurgeRollupRoute,
    ...disableSLORoute,
    ...enableSLORoute,
    ...fetchHistoricalSummary,
    ...findSloDefinitionsRoute,
    ...findSLORoute,
    ...getSLORoute,
    ...updateSLORoute,
    ...getDiagnosisRoute,
    ...getSloBurnRates,
    ...getPreviewData,
    ...resetSLORoute,
    ...findSLOGroupsRoute,
    ...getSLOSuggestionsRoute,
    ...getSLOStatsOverview,
    ...bulkDeleteSLORoute,
    ...getBulkDeleteStatusRoute,
    ...repairSLORoute,
    ...purgeInstancesRoute,
    ...getPurgeInstancesStatusRoute,
    ...findSLOInstancesRoute,
    ...getSLOTemplateRoute,
    ...findSLOTemplatesRoute,
  };
};
