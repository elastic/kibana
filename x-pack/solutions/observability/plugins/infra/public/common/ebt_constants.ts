/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EBT_CLICK_ACTIONS } from '@kbn/ebt-click';

export const INFRA_EBT_ACTIONS = {
  /** User intends to set up or configure the anomaly detection ML jobs. */
  MANAGE_ML_JOBS: 'manageMlJobs',
  /** User intends to re-run a request that failed to load. */
  RETRY_LOAD: 'retryLoad',
  /** User intends to open Metrics anomaly-detection management. */
  VIEW_ANOMALY_DETECTION: 'viewAnomalyDetection',
  /** User intends to open the Alerts and rules AppHeader menu. */
  OPEN_ALERTS_MENU: 'openAlertsMenu',
  /** User intends to open the Infrastructure rules submenu. */
  OPEN_INFRASTRUCTURE_RULES_MENU: 'openInfrastructureRulesMenu',
  /** User intends to create an inventory threshold rule. */
  CREATE_INVENTORY_RULE: 'createInventoryRule',
  /** User intends to open the Metrics rules submenu. */
  OPEN_METRICS_RULES_MENU: 'openMetricsRulesMenu',
  /** User intends to create a metric threshold rule. */
  CREATE_METRIC_THRESHOLD_RULE: 'createMetricThresholdRule',
  /** User intends to create a custom threshold rule. */
  CREATE_CUSTOM_THRESHOLD_RULE: 'createCustomThresholdRule',
  /** User intends to manage existing rules. */
  MANAGE_RULES: 'manageRules',
  /** User intends to open Metrics settings. */
  VIEW_SETTINGS: 'viewSettings',
  /** User intends to open the inspector. */
  OPEN_INSPECTOR: 'openInspector',
  /** User intends to add data. */
  ADD_DATA: EBT_CLICK_ACTIONS.ADD_DATA,
} as const;

export const INFRA_EBT_DETAILS = {
  /** Add data onboarding for Hosts. */
  ADD_DATA_HOST: 'host',
  /** Add data onboarding for Infrastructure. */
  ADD_DATA_INFRA: 'infra',
} as const;

export const INFRA_EBT_ELEMENTS = {
  LOG_ANALYSIS_ANOMALIES_RESULTS: 'infraLogAnalysisAnomaliesResults',
  LOG_ANALYSIS_DATASETS_SELECTOR: 'infraLogAnalysisDatasetsSelector',
  LOG_ANALYSIS_PAGE_HEADER: 'infraLogAnalysisPageHeader',
} as const;
