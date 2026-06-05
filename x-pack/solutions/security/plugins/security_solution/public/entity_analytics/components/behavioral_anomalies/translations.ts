/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const BEHAVIORAL_ANOMALIES_SECTION_TITLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.behavioralAnomalies.sectionTitle',
  { defaultMessage: 'Behavioral anomalies' }
);

/**
 * Prototype "v.2" timeframe indicator rendered as `extraAction` on the
 * Behavioral anomalies section title when the v.2 overview is selected.
 * Cleanup: remove this string together with the v.2 selector / overview.
 */
export const BEHAVIORAL_ANOMALIES_V2_OVERVIEW_TIMEFRAME = i18n.translate(
  'xpack.securitySolution.entityAnalytics.behavioralAnomaliesV2Overview.timeframeLabel',
  { defaultMessage: 'Last 1 year' }
);

export const BEHAVIORAL_ANOMALIES_ALL_LINK_TITLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.behavioralAnomalies.allAnomaliesLink',
  { defaultMessage: 'All anomalies' }
);

export const BEHAVIORAL_ANOMALIES_ALL_LINK_TOOLTIP = i18n.translate(
  'xpack.securitySolution.entityAnalytics.behavioralAnomalies.allAnomaliesTooltip',
  { defaultMessage: 'Show all behavioral anomalies' }
);

export const BEHAVIORAL_ANOMALIES_COUNT_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.behavioralAnomalies.anomaliesCountLabel',
  { defaultMessage: 'Anomalies' }
);

/**
 * Prototype "v.2" — label rendered next to the count of distinct MITRE
 * ATT&CK tactics triggered on the entity. Cleanup: remove with the rest of
 * the v.2 overview + `mitre/` folder.
 */
export const BEHAVIORAL_ANOMALIES_V2_TACTICS_COUNT_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.behavioralAnomaliesV2Overview.tacticsCountLabel',
  { defaultMessage: 'Tactics' }
);

export const BEHAVIORAL_ANOMALIES_TAB_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.behavioralAnomalies.tabLabel',
  { defaultMessage: 'BA-v.1' }
);

export const ANOMALY_TIMELINE_TITLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.behavioralAnomalies.anomalyTimelineTitle',
  { defaultMessage: 'Anomaly timeline' }
);

export const ANOMALY_TIMELINE_MANAGE_ML_JOBS = i18n.translate(
  'xpack.securitySolution.entityAnalytics.behavioralAnomalies.manageMlJobs',
  { defaultMessage: 'Manage ML jobs' }
);

export const ANOMALIES_TABLE_TITLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.behavioralAnomalies.anomaliesTableTitle',
  { defaultMessage: 'Anomalies' }
);

export const ANOMALIES_TABLE_JOB_COLUMN = i18n.translate(
  'xpack.securitySolution.entityAnalytics.behavioralAnomalies.table.jobColumn',
  { defaultMessage: 'ML job' }
);

export const ANOMALIES_TABLE_TIMESTAMP_COLUMN = i18n.translate(
  'xpack.securitySolution.entityAnalytics.behavioralAnomalies.table.timestampColumn',
  { defaultMessage: 'Timestamp' }
);

export const ANOMALIES_TABLE_BASELINE_COLUMN = i18n.translate(
  'xpack.securitySolution.entityAnalytics.behavioralAnomalies.table.baselineColumn',
  { defaultMessage: 'Baseline' }
);

export const ANOMALIES_TABLE_ANOMALY_COLUMN = i18n.translate(
  'xpack.securitySolution.entityAnalytics.behavioralAnomalies.table.anomalyColumn',
  { defaultMessage: 'Anomaly' }
);

export const ANOMALIES_TABLE_SPIKE_COLUMN = i18n.translate(
  'xpack.securitySolution.entityAnalytics.behavioralAnomalies.table.spikeColumn',
  { defaultMessage: 'Spike' }
);

export const ANOMALIES_TABLE_SCORE_COLUMN = i18n.translate(
  'xpack.securitySolution.entityAnalytics.behavioralAnomalies.table.scoreColumn',
  { defaultMessage: 'Anomaly score' }
);

export const ANOMALIES_TABLE_ACTIONS_COLUMN = i18n.translate(
  'xpack.securitySolution.entityAnalytics.behavioralAnomalies.table.actionsColumn',
  { defaultMessage: 'Actions' }
);

export const ANOMALIES_TABLE_ROW_ACTIONS_ARIA_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.behavioralAnomalies.table.rowActionsAriaLabel',
  { defaultMessage: 'Row actions' }
);

export const ANOMALIES_TABLE_ROW_ACTION_ADD_TO_CASE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.behavioralAnomalies.table.rowActions.addToCase',
  { defaultMessage: 'Add to case' }
);

export const ANOMALIES_TABLE_ROW_ACTION_ADD_TO_TIMELINE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.behavioralAnomalies.table.rowActions.addToTimeline',
  { defaultMessage: 'Add to timeline' }
);

export const ANOMALIES_TABLE_ROW_ACTION_VIEW_IN_DISCOVER = i18n.translate(
  'xpack.securitySolution.entityAnalytics.behavioralAnomalies.table.rowActions.viewInDiscover',
  { defaultMessage: 'View in Discover' }
);

export const ANOMALIES_TABLE_ROW_ACTION_VIEW_IN_SMV = i18n.translate(
  'xpack.securitySolution.entityAnalytics.behavioralAnomalies.table.rowActions.viewInSingleMetricViewer',
  { defaultMessage: 'View in Single metric viewer' }
);

export const ANOMALIES_TABLE_ROW_ACTION_ADD_TO_CHAT = i18n.translate(
  'xpack.securitySolution.entityAnalytics.behavioralAnomalies.table.rowActions.addToChat',
  { defaultMessage: 'Add to chat' }
);
