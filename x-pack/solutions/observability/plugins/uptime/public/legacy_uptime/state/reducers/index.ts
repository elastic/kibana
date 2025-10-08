/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { combineReducers } from 'redux';
import type { MonitorState } from './monitor';
import { monitorReducer } from './monitor';
import type { UiState } from './ui';
import { uiReducer } from './ui';
import type { MonitorStatusState } from './monitor_status';
import { monitorStatusReducer } from './monitor_status';
import type { MonitorList } from './monitor_list';
import { monitorListReducer } from './monitor_list';
import type { DynamicSettingsState } from './dynamic_settings';
import { dynamicSettingsReducer } from './dynamic_settings';
import type { PingState } from './ping';
import { pingReducer } from './ping';
import type { PingListState } from './ping_list';
import { pingListReducer } from './ping_list';
import type { MonitorDuration } from './monitor_duration';
import { monitorDurationReducer } from './monitor_duration';
import type { IndexStatusState } from './index_status';
import { indexStatusReducer } from './index_status';
import type { MLJobState } from './ml_anomaly';
import { mlJobsReducer } from './ml_anomaly';
import type { CertificatesState } from '../certificates/certificates';
import { certificatesReducer } from '../certificates/certificates';
import { selectedFiltersReducer } from './selected_filters';
import type { SelectedFilters } from '../actions/selected_filters';
import type { AlertState } from '../alerts/alerts';
import { alertsReducer } from '../alerts/alerts';
import type { JourneyKVP } from './journey';
import { journeyReducer } from './journey';
import type { NetworkEventsState } from './network_events';
import { networkEventsReducer } from './network_events';
import type { SyntheticsReducerState } from './synthetics';
import { syntheticsReducer } from './synthetics';

export interface RootState {
  monitor: MonitorState;
  ui: UiState;
  monitorList: MonitorList;
  monitorStatus: MonitorStatusState;
  dynamicSettings: DynamicSettingsState;
  ping: PingState;
  pingList: PingListState;
  ml: MLJobState;
  monitorDuration: MonitorDuration;
  indexStatus: IndexStatusState;
  certificates: CertificatesState;
  selectedFilters: SelectedFilters | null;
  alerts: AlertState;
  journeys: JourneyKVP;
  networkEvents: NetworkEventsState;
  synthetics: SyntheticsReducerState;
}

export const rootReducer = combineReducers<RootState>({
  monitor: monitorReducer,
  ui: uiReducer,
  monitorList: monitorListReducer,
  monitorStatus: monitorStatusReducer,
  dynamicSettings: dynamicSettingsReducer,
  ping: pingReducer,
  pingList: pingListReducer,
  ml: mlJobsReducer,
  monitorDuration: monitorDurationReducer,
  indexStatus: indexStatusReducer,
  certificates: certificatesReducer,
  selectedFilters: selectedFiltersReducer,
  alerts: alertsReducer,
  journeys: journeyReducer,
  networkEvents: networkEventsReducer,
  synthetics: syntheticsReducer,
});
