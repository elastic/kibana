/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { combineReducers } from '@reduxjs/toolkit';

import type { MaintenanceWindowsState } from './maintenance_windows';
import { maintenanceWindowsReducer } from './maintenance_windows';
import type { CertsListState } from './certs';
import { certsListReducer } from './certs';
import type { CertificatesState } from './certificates/certificates';
import { certificatesReducer } from './certificates/certificates';
import type { GlobalParamsState } from './global_params';
import { globalParamsReducer } from './global_params';
import type { OverviewStatusStateReducer } from './overview_status';
import { overviewStatusReducer } from './overview_status';
import { browserJourneyReducer } from './browser_journey';
import type { DefaultAlertingState } from './alert_rules';
import { defaultAlertingReducer } from './alert_rules';
import type { ManualTestRunsState } from './manual_test_runs';
import { manualTestRunsReducer } from './manual_test_runs';
import type { DynamicSettingsState } from './settings';
import { dynamicSettingsReducer } from './settings';
import type { QueriesState } from './elasticsearch';
import { elasticsearchReducer } from './elasticsearch';
import type { PrivateLocationsState } from './private_locations';
import { privateLocationsStateReducer } from './private_locations';
import type { NetworkEventsState } from './network_events';
import { networkEventsReducer } from './network_events';
import type { MonitorDetailsState } from './monitor_details';
import { monitorDetailsReducer } from './monitor_details';
import type { UiState } from './ui';
import { uiReducer } from './ui';
import type { SyntheticsEnablementState } from './synthetics_enablement';
import { syntheticsEnablementReducer } from './synthetics_enablement';
import type { MonitorListState } from './monitor_list';
import { monitorListReducer } from './monitor_list';
import type { ServiceLocationsState } from './service_locations';
import { serviceLocationsReducer } from './service_locations';
import type { MonitorOverviewState } from './overview';
import { monitorOverviewReducer } from './overview';
import type { BrowserJourneyState } from './browser_journey/models';
import type { MonitorStatusHeatmap } from './status_heatmap';
import { monitorStatusHeatmapReducer } from './status_heatmap';
import type { AgentPoliciesState } from './agent_policies';
import { agentPoliciesReducer } from './agent_policies';

export interface SyntheticsAppState {
  agentPolicies: AgentPoliciesState;
  browserJourney: BrowserJourneyState;
  certificates: CertificatesState;
  certsList: CertsListState;
  defaultAlerting: DefaultAlertingState;
  dynamicSettings: DynamicSettingsState;
  elasticsearch: QueriesState;
  globalParams: GlobalParamsState;
  manualTestRuns: ManualTestRunsState;
  monitorDetails: MonitorDetailsState;
  monitorList: MonitorListState;
  monitorStatusHeatmap: MonitorStatusHeatmap;
  networkEvents: NetworkEventsState;
  overview: MonitorOverviewState;
  overviewStatus: OverviewStatusStateReducer;
  privateLocations: PrivateLocationsState;
  serviceLocations: ServiceLocationsState;
  syntheticsEnablement: SyntheticsEnablementState;
  ui: UiState;
  maintenanceWindows: MaintenanceWindowsState;
}

export const rootReducer = combineReducers<SyntheticsAppState>({
  agentPolicies: agentPoliciesReducer,
  browserJourney: browserJourneyReducer,
  certificates: certificatesReducer,
  certsList: certsListReducer,
  defaultAlerting: defaultAlertingReducer,
  dynamicSettings: dynamicSettingsReducer,
  elasticsearch: elasticsearchReducer,
  globalParams: globalParamsReducer,
  manualTestRuns: manualTestRunsReducer,
  monitorDetails: monitorDetailsReducer,
  monitorList: monitorListReducer,
  monitorStatusHeatmap: monitorStatusHeatmapReducer,
  networkEvents: networkEventsReducer,
  overview: monitorOverviewReducer,
  overviewStatus: overviewStatusReducer,
  privateLocations: privateLocationsStateReducer,
  serviceLocations: serviceLocationsReducer,
  syntheticsEnablement: syntheticsEnablementReducer,
  ui: uiReducer,
  maintenanceWindows: maintenanceWindowsReducer,
});
