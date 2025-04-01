/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { combineReducers } from '@reduxjs/toolkit';

import { certsListReducer, CertsListState } from './certs';
import { certificatesReducer, CertificatesState } from './certificates/certificates';
import { globalParamsReducer, GlobalParamsState } from './global_params';
import { overviewStatusReducer, OverviewStatusStateReducer } from './overview_status';
import { browserJourneyReducer } from './browser_journey';
import { defaultAlertingReducer, DefaultAlertingState } from './alert_rules';
import { manualTestRunsReducer, ManualTestRunsState } from './manual_test_runs';
import {
  dynamicSettingsReducer,
  DynamicSettingsState,
  settingsReducer,
  SettingsState,
} from './settings';
import { elasticsearchReducer, QueriesState } from './elasticsearch';
import { PrivateLocationsState, privateLocationsStateReducer } from './private_locations';
import { networkEventsReducer, NetworkEventsState } from './network_events';
import { monitorDetailsReducer, MonitorDetailsState } from './monitor_details';
import { uiReducer, UiState } from './ui';
import { syntheticsEnablementReducer, SyntheticsEnablementState } from './synthetics_enablement';
import { monitorListReducer, MonitorListState } from './monitor_list';
import { serviceLocationsReducer, ServiceLocationsState } from './service_locations';
import { monitorOverviewReducer, MonitorOverviewState } from './overview';
import { BrowserJourneyState } from './browser_journey/models';
import { monitorStatusHeatmapReducer, MonitorStatusHeatmap } from './status_heatmap';
import { agentPoliciesReducer, AgentPoliciesState } from './agent_policies';

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
  settings: SettingsState;
  syntheticsEnablement: SyntheticsEnablementState;
  ui: UiState;
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
  settings: settingsReducer,
  syntheticsEnablement: syntheticsEnablementReducer,
  ui: uiReducer,
});
