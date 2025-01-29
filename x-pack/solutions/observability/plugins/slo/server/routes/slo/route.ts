/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fetchSloHealthRoute } from './fetch_health';
import { getSloSettingsRoute } from './get_slo_settings';
import { createSLORoute } from './create_slo';
import { inspectSLORoute } from './inspect_slo';
import { updateSLORoute } from './update_slo';
import { deleteSLORoute } from './delete_slo';
import { enableSLORoute } from './enable_slo';
import { getSLORoute } from './get_slo';
import { deleteSloInstancesRoute } from './delete_instances';
import { disableSLORoute } from './disable_slo';
import { fetchHistoricalSummary } from './fetch_historical_summary';
import { findSLORoute } from './find_slo';
import { findSloDefinitionsRoute } from './find_definitions';
import { findSLOGroupsRoute } from './find_groups';
import { getDiagnosisRoute } from './get_diagnosis';
import { getSLOGroupingsRoute } from './get_groupings';
import { getPreviewData } from './get_preview_data';
import { getSloBurnRates } from './get_slo_burn_rates';
import { getSLOSuggestionsRoute } from './get_suggestions';
import { putSloSettings } from './put_slo_settings';
import { resetSLORoute } from './reset_slo';
import { getSLOsOverview } from './get_slos_overview';

export const getSloRouteRepository = (isServerless?: boolean) => {
  return {
    ...fetchSloHealthRoute,
    ...getSloSettingsRoute,
    ...putSloSettings(isServerless),
    ...createSLORoute,
    ...inspectSLORoute,
    ...deleteSLORoute,
    ...deleteSloInstancesRoute,
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
    ...getSLOGroupingsRoute,
    ...resetSLORoute,
    ...findSLOGroupsRoute,
    ...getSLOSuggestionsRoute,
    ...getSLOsOverview,
  };
};
