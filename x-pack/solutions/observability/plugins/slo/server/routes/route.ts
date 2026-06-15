/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { bulkDeleteSLORoute, getBulkDeleteStatusRoute } from './bulk_delete';
import { bulkPurgeRollupRoute } from './bulk_purge_rollup';
import { createCompositeSLORoute } from './composite_slo/create_composite_slo';
import { deleteCompositeSLORoute } from './composite_slo/delete_composite_slo';
import { fetchCompositeHistoricalSummaryRoute } from './composite_slo/fetch_composite_historical_summary';
import { findCompositeSLORoute } from './composite_slo/find_composite_slo_definitions';
import { getCompositeSLORoute } from './composite_slo/get_composite_slo';
import { getCompositeSLOSuggestionsRoute } from './composite_slo/get_composite_slo_suggestions';
import { postCompositeSloSummaryRefreshRoute } from './composite_slo/post_composite_slo_summary_refresh';
import { updateCompositeSLORoute } from './composite_slo/update_composite_slo';
import { createSLORoute } from './create_slo';
import { deleteSloInstancesRoute } from './delete_instances';
import { deleteSLORoute } from './delete_slo';
import { disableSLORoute } from './disable_slo';
import { enableSLORoute } from './enable_slo';
import { fetchSloHealthRoute } from './fetch_health';
import { fetchHistoricalSummary } from './fetch_historical_summary';
import { findSloDefinitionsRoute } from './find_definitions';
import { findSLOGroupsRoute } from './find_groups';
import { findSLOInstancesRoute } from './find_instances';
import { findSLORoute } from './find_slo';
import { getDiagnosisRoute } from './get_diagnosis';
import { getSLOGroupedStatsRoute } from './get_grouped_stats';
import { getPreviewData } from './get_preview_data';
import { getSLORoute } from './get_slo';
import { getSloBurnRates } from './get_slo_burn_rates';
import { getSloSettingsRoute } from './get_slo_settings';
import { getSLOStatsOverview } from './get_slo_stats_overview';
import { getSLOSuggestionsRoute } from './get_suggestions';
import { healthScanRoutes } from './health_scan';
import { inspectSLORoute } from './inspect_slo';
import { getPurgeInstancesStatusRoute, purgeInstancesRoute } from './purge_instances';
import { repairSLORoute } from './repair_slo';
import { resetSLORoute } from './reset_slo';
import { searchSloDefinitionsRoute } from './search_slo_definitions';
import {
  findSLOTemplatesRoute,
  findSLOTemplateTagsRoute,
  getSLOTemplateRoute,
} from './slo_templates';
import { updateSLORoute } from './update_slo';
import { updateSloSettings } from './update_slo_settings';

interface RouteRepositoryOptions {
  isServerless?: boolean;
}

export const getSloRouteRepository = ({ isServerless }: RouteRepositoryOptions = {}) => {
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
    ...getSLOGroupedStatsRoute,
    ...bulkDeleteSLORoute,
    ...getBulkDeleteStatusRoute,
    ...repairSLORoute,
    ...purgeInstancesRoute,
    ...getPurgeInstancesStatusRoute,
    ...findSLOInstancesRoute,
    ...getSLOTemplateRoute,
    ...findSLOTemplatesRoute,
    ...findSLOTemplateTagsRoute,
    ...healthScanRoutes,
    ...searchSloDefinitionsRoute,
    ...createCompositeSLORoute,
    ...getCompositeSLORoute,
    ...findCompositeSLORoute,
    ...updateCompositeSLORoute,
    ...deleteCompositeSLORoute,
    ...fetchCompositeHistoricalSummaryRoute,
    ...getCompositeSLOSuggestionsRoute,
    ...postCompositeSloSummaryRefreshRoute,
  };
};
