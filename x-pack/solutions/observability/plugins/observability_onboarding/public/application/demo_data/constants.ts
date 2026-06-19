/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const APM_ANOMALY_DETECTION_ENVIRONMENTS_API_PATH =
  '/internal/apm/settings/anomaly-detection/environments';
export const APM_ANOMALY_DETECTION_JOBS_API_PATH = '/internal/apm/settings/anomaly-detection/jobs';

export const ALERTING_RULE_API_PATH = '/api/alerting/rule';
export const SLO_API_PATH = '/api/observability/slos';
export const SLO_API_VERSION = '2023-10-31';

/** Default APM metrics index used by APM SLO indicators. */
export const APM_METRICS_INDEX = 'metrics-apm*';

/** Tag applied to every resource created by the demo data section. */
export const DEMO_DATA_TAG = 'observability-demo-data';

/** ML modules setup API (POST /internal/ml/modules/setup/{moduleId}). */
export const ML_MODULE_SETUP_API_PATH = '/internal/ml/modules/setup';
export const ML_MODULE_API_VERSION = '1';

/** ML job-service APIs used to start APM datafeeds over the demo data window. */
export const ML_JOBS_SUMMARY_API_PATH = '/internal/ml/jobs/jobs_summary';
export const ML_FORCE_START_DATAFEEDS_API_PATH = '/internal/ml/jobs/force_start_datafeeds';
export const ML_JOBS_API_VERSION = '1';

/** Stable job-id prefix for demo ML module setup — re-runs target the same job names. */
export const DEMO_ML_JOB_PREFIX = 'demo-obs-';

export const LOGS_INDEX_PATTERN = 'logs-*';
export const METRICS_INDEX_PATTERN = 'metrics-*';
