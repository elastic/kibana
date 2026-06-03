/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

/*
 * Prototype "BA-v.2" translations — i18n keys are namespaced under
 * `behavioralAnomaliesV2` so they don't collide with the v1 keys and can be
 * deleted in one go when the version is removed.
 */

export const BEHAVIORAL_ANOMALIES_V2_TAB_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.behavioralAnomaliesV2.tabLabel',
  { defaultMessage: 'BA-v.2' }
);

export const ANOMALY_TIMELINE_V2_TITLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.behavioralAnomaliesV2.anomalyTimelineTitle',
  { defaultMessage: 'Anomaly timeline' }
);

export const ANOMALY_TIMELINE_V2_MANAGE_ML_JOBS = i18n.translate(
  'xpack.securitySolution.entityAnalytics.behavioralAnomaliesV2.manageMlJobs',
  { defaultMessage: 'Manage ML jobs' }
);

export const ANOMALIES_TABLE_V2_TITLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.behavioralAnomaliesV2.anomaliesTableTitle',
  { defaultMessage: 'Anomalies' }
);

export const ANOMALIES_TABLE_V2_JOB_COLUMN = i18n.translate(
  'xpack.securitySolution.entityAnalytics.behavioralAnomaliesV2.table.jobColumn',
  { defaultMessage: 'ML job' }
);

export const ANOMALIES_TABLE_V2_TIMESTAMP_COLUMN = i18n.translate(
  'xpack.securitySolution.entityAnalytics.behavioralAnomaliesV2.table.timestampColumn',
  { defaultMessage: 'Timestamp' }
);

export const ANOMALIES_TABLE_V2_BASELINE_COLUMN = i18n.translate(
  'xpack.securitySolution.entityAnalytics.behavioralAnomaliesV2.table.baselineColumn',
  { defaultMessage: 'Baseline' }
);

export const ANOMALIES_TABLE_V2_ANOMALY_COLUMN = i18n.translate(
  'xpack.securitySolution.entityAnalytics.behavioralAnomaliesV2.table.anomalyColumn',
  { defaultMessage: 'Anomaly' }
);

export const ANOMALIES_TABLE_V2_SPIKE_COLUMN = i18n.translate(
  'xpack.securitySolution.entityAnalytics.behavioralAnomaliesV2.table.spikeColumn',
  { defaultMessage: 'Spike' }
);

export const ANOMALIES_TABLE_V2_SCORE_COLUMN = i18n.translate(
  'xpack.securitySolution.entityAnalytics.behavioralAnomaliesV2.table.scoreColumn',
  { defaultMessage: 'Anomaly score' }
);

export const ANOMALIES_TABLE_V2_ACTIONS_COLUMN = i18n.translate(
  'xpack.securitySolution.entityAnalytics.behavioralAnomaliesV2.table.actionsColumn',
  { defaultMessage: 'Actions' }
);

export const ANOMALIES_TABLE_V2_ROW_ACTIONS_ARIA_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.behavioralAnomaliesV2.table.rowActionsAriaLabel',
  { defaultMessage: 'Row actions' }
);

export const ANOMALIES_TABLE_V2_ROW_ACTION_ADD_TO_CASE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.behavioralAnomaliesV2.table.rowActions.addToCase',
  { defaultMessage: 'Add to case' }
);

export const ANOMALIES_TABLE_V2_ROW_ACTION_ADD_TO_TIMELINE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.behavioralAnomaliesV2.table.rowActions.addToTimeline',
  { defaultMessage: 'Add to timeline' }
);

export const ANOMALIES_TABLE_V2_ROW_ACTION_VIEW_IN_DISCOVER = i18n.translate(
  'xpack.securitySolution.entityAnalytics.behavioralAnomaliesV2.table.rowActions.viewInDiscover',
  { defaultMessage: 'View in Discover' }
);

export const ANOMALIES_TABLE_V2_ROW_ACTION_VIEW_IN_SMV = i18n.translate(
  'xpack.securitySolution.entityAnalytics.behavioralAnomaliesV2.table.rowActions.viewInSingleMetricViewer',
  { defaultMessage: 'View in Single metric viewer' }
);

export const ANOMALIES_TABLE_V2_ROW_ACTION_ADD_TO_CHAT = i18n.translate(
  'xpack.securitySolution.entityAnalytics.behavioralAnomaliesV2.table.rowActions.addToChat',
  { defaultMessage: 'Add to chat' }
);
