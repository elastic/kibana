/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { combineReducers } from '@reduxjs/toolkit';

import { certsListReducer, type CertsListState } from './certs';
import { certificatesReducer, type CertificatesState } from './certificates/certificates';
import { globalParamsReducer, type GlobalParamsState } from './global_params';
import { overviewStatusReducer, type OverviewStatusStateReducer } from './overview_status';
import { browserJourneyReducer } from './browser_journey';
import { defaultAlertingReducer, type DefaultAlertingState } from './alert_rules';
import { manualTestRunsReducer, type ManualTestRunsState } from './manual_test_runs';
import {
  dynamicSettingsReducer,
  type DynamicSettingsState,
  settingsReducer,
  type SettingsState,
} from './settings';
import { elasticsearchReducer, type QueriesState } from './elasticsearch';
import { agentPoliciesReducer, type AgentPoliciesState } from './private_locations';
import { networkEventsReducer, type NetworkEventsState } from './network_events';
import { monitorDetailsReducer, type MonitorDetailsState } from './monitor_details';
import { uiReducer, type UiState } from './ui';
import { syntheticsEnablementReducer, type SyntheticsEnablementState } from './synthetics_enablement';
import { monitorListReducer, type MonitorListState } from './monitor_list';
import { serviceLocationsReducer, type ServiceLocationsState } from './service_locations';
import { monitorOverviewReducer, type MonitorOverviewState } from './overview';
import { type BrowserJourneyState } from './browser_journey/models';
import { monitorStatusHeatmapReducer, type MonitorStatusHeatmap } from './status_heatmap';

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
