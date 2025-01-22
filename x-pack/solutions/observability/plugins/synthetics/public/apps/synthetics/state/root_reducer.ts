/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { combineReducers } from '@reduxjs/toolkit';

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
import type { DynamicSettingsState, SettingsState } from './settings';
import { dynamicSettingsReducer, settingsReducer } from './settings';
import type { QueriesState } from './elasticsearch';
import { elasticsearchReducer } from './elasticsearch';
import type { AgentPoliciesState } from './private_locations';
import { agentPoliciesReducer } from './private_locations';
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

export interface SyntheticsAppState {
  ui: UiState;
  settings: SettingsState;
  elasticsearch: QueriesState;
  monitorList: MonitorListState;
  overview: MonitorOverviewState;
  certificates: CertificatesState;
  globalParams: GlobalParamsState;
  networkEvents: NetworkEventsState;
  agentPolicies: AgentPoliciesState;
  manualTestRuns: ManualTestRunsState;
  monitorDetails: MonitorDetailsState;
  browserJourney: BrowserJourneyState;
  certsList: CertsListState;
  defaultAlerting: DefaultAlertingState;
  dynamicSettings: DynamicSettingsState;
  serviceLocations: ServiceLocationsState;
  overviewStatus: OverviewStatusStateReducer;
  syntheticsEnablement: SyntheticsEnablementState;
  monitorStatusHeatmap: MonitorStatusHeatmap;
}

export const rootReducer = combineReducers<SyntheticsAppState>({
  ui: uiReducer,
  settings: settingsReducer,
  monitorList: monitorListReducer,
  overview: monitorOverviewReducer,
  globalParams: globalParamsReducer,
  networkEvents: networkEventsReducer,
  elasticsearch: elasticsearchReducer,
  agentPolicies: agentPoliciesReducer,
  monitorDetails: monitorDetailsReducer,
  browserJourney: browserJourneyReducer,
  manualTestRuns: manualTestRunsReducer,
  overviewStatus: overviewStatusReducer,
  defaultAlerting: defaultAlertingReducer,
  dynamicSettings: dynamicSettingsReducer,
  serviceLocations: serviceLocationsReducer,
  syntheticsEnablement: syntheticsEnablementReducer,
  certificates: certificatesReducer,
  certsList: certsListReducer,
  monitorStatusHeatmap: monitorStatusHeatmapReducer,
});
