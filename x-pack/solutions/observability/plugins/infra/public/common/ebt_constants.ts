/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const INFRA_EBT_ACTIONS = {
  /** User intends to set up or configure the anomaly detection ML jobs. */
  MANAGE_ML_JOBS: 'manageMlJobs',
  /** User intends to re-run a request that failed to load. */
  RETRY_LOAD: 'retryLoad',
} as const;

export const INFRA_EBT_ELEMENTS = {
  LOG_ANALYSIS_ANOMALIES_RESULTS: 'infraLogAnalysisAnomaliesResults',
  LOG_ANALYSIS_DATASETS_SELECTOR: 'infraLogAnalysisDatasetsSelector',
  LOG_ANALYSIS_PAGE_HEADER: 'infraLogAnalysisPageHeader',
} as const;
