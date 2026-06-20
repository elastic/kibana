/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum SplunkDashboardDataInputStepId {
  Rules = 'splunk_dashboard_rules',
  Macros = 'splunk_dashboard_macros',
  Lookups = 'splunk_dashboard_lookups',
}

export enum SentinelDashboardDataInputStepId {
  Workbooks = 'sentinel_dashboard_workbooks',
  Watchlists = 'sentinel_dashboard_watchlists',
}

export enum SentinelDashboardDataInputStep {
  Workbooks = 1,
  Watchlists = 2,
  End = 10,
}
