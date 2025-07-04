/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RiskScoreEntity } from '../tasks/risk_scores/common';

export const HOST_RISK_SCORE_NO_DATA_DETECTED =
  '[data-test-subj="host-risk-score-no-data-detected"]';

export const USER_RISK_SCORE_NO_DATA_DETECTED =
  '[data-test-subj="user-risk-score-no-data-detected"]';

export const RISK_SCORE_INSTALLATION_SUCCESS_TOAST = (riskScoreEntity: RiskScoreEntity) =>
  `[data-test-subj="${riskScoreEntity}EnableSuccessToast"]`;

export const HOSTS_DONUT_CHART =
  '[data-test-subj="entity_analytics_hosts"] [data-test-subj="donut-chart"]';

export const HOSTS_TABLE = '[data-test-subj="entity_analytics_hosts"] #hostRiskDashboardTable';

export const HOSTS_TABLE_ROWS = '[data-test-subj="entity_analytics_hosts"] .euiTableRow';

export const USERS_DONUT_CHART =
  '[data-test-subj="entity_analytics_users"] [data-test-subj="donut-chart"]';

export const USERS_TABLE_ROWS = '[data-test-subj="entity_analytics_users"] .euiTableRow';

export const USERS_TABLE = '[data-test-subj="entity_analytics_users"] #userRiskDashboardTable';

export const ENABLE_RISK_SCORE_BUTTON = '[data-test-subj="enable_risk_score"]';

export const ANOMALIES_TABLE =
  '[data-test-subj="entity_analytics_anomalies"] #entityAnalyticsDashboardAnomaliesTable';

export const ANOMALIES_TABLE_ROWS = '[data-test-subj="entity_analytics_anomalies"] .euiTableRow';

export const ANOMALIES_TABLE_ENABLE_JOB_BUTTON = '[data-test-subj="enable-job"]';

export const ANOMALIES_TABLE_ENABLE_JOB_LOADER = '[data-test-subj="job-switch-loader"]';

export const ANOMALIES_TABLE_COUNT_COLUMN = '[data-test-subj="anomalies-table-column-count"]';

export const ANOMALIES_TABLE_NEXT_PAGE_BUTTON =
  '[data-test-subj="entity_analytics_anomalies"] [data-test-subj="pagination-button-next"]';

export const USERS_TABLE_ALERT_CELL =
  '[data-test-subj="entity_analytics_users"] [data-test-subj="risk-score-alerts"]';

export const HOSTS_TABLE_ALERT_CELL =
  '[data-test-subj="entity_analytics_hosts"] [data-test-subj="risk-score-alerts"]';

export const OPEN_RISK_INFORMATION_FLYOUT_BUTTON =
  '[data-test-subj="open-risk-information-flyout-trigger"]';

export const RISK_INFORMATION_FLYOUT_HEADER =
  '[data-test-subj="open-risk-information-flyout"] .euiFlyoutHeader';
