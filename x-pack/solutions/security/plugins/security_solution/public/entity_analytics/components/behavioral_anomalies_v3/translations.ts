/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

/*
 * Prototype "BA-v.3" translations — i18n keys are namespaced under
 * `behavioralAnomaliesV3` so they don't collide with the v1 keys and can be
 * deleted in one go when the version is removed.
 */

export const BEHAVIORAL_ANOMALIES_V3_TAB_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.behavioralAnomaliesV3.tabLabel',
  { defaultMessage: 'Behavioral anomalies-v.3' }
);

export const ATTACK_CHAIN_V3_TITLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.behavioralAnomaliesV3.attackChainTitle',
  { defaultMessage: 'Attack chain' }
);

export const TACTIC_FILTER_V3_CLEAR_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.behavioralAnomaliesV3.tab.clearTacticFilterAria',
  { defaultMessage: 'Clear tactic filter' }
);

export const ANOMALY_TIMELINE_V3_TITLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.behavioralAnomaliesV3.anomalyTimelineTitle',
  { defaultMessage: 'Anomaly timeline' }
);

export const ANOMALY_TIMELINE_V3_MANAGE_ML_JOBS = i18n.translate(
  'xpack.securitySolution.entityAnalytics.behavioralAnomaliesV3.manageMlJobs',
  { defaultMessage: 'Manage ML jobs' }
);

export const ANOMALY_TIMELINE_V3_INFO_ICON_ARIA_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.behavioralAnomaliesV3.anomalyTimeline.infoIconAriaLabel',
  { defaultMessage: 'About the Anomaly timeline' }
);

export const ANOMALY_TIMELINE_V3_INFO_POPOVER_TITLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.behavioralAnomaliesV3.anomalyTimeline.infoPopoverTitle',
  { defaultMessage: 'Anomaly timeline based on MITRE ATT&CK tactics' }
);

export const ANOMALY_TIMELINE_V3_INFO_POPOVER_PARAGRAPH_1 = i18n.translate(
  'xpack.securitySolution.entityAnalytics.behavioralAnomaliesV3.anomalyTimeline.infoPopoverParagraph1',
  {
    defaultMessage:
      'Each row represents a MITRE ATT&CK tactic. Time is divided into fixed buckets, and each block is colored by its anomaly score — a 0–100 measure of how unexpected the activity in that period was.',
  }
);

export const ANOMALY_TIMELINE_V3_INFO_POPOVER_PARAGRAPH_2 = i18n.translate(
  'xpack.securitySolution.entityAnalytics.behavioralAnomaliesV3.anomalyTimeline.infoPopoverParagraph2',
  {
    defaultMessage:
      'Scores are calculated based on deviation from historical patterns, duration, and surrounding context, and adjust over time as new anomalies are detected. Red blocks indicate high scores; blue indicates low.',
  }
);

export const ANOMALY_TIMELINE_V3_INFO_POPOVER_PARAGRAPH_3 = i18n.translate(
  'xpack.securitySolution.entityAnalytics.behavioralAnomaliesV3.anomalyTimeline.infoPopoverParagraph3',
  { defaultMessage: 'Click any block to filter the anomalies list below.' }
);

export const ANOMALY_TIMELINE_V3_READ_DOCS = i18n.translate(
  'xpack.securitySolution.entityAnalytics.behavioralAnomaliesV3.anomalyTimeline.readDocs',
  { defaultMessage: 'Read the docs' }
);

export const ANOMALIES_TABLE_V3_TITLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.behavioralAnomaliesV3.anomaliesTableTitle',
  { defaultMessage: 'Anomalies' }
);

export const ANOMALIES_TABLE_V3_JOB_COLUMN = i18n.translate(
  'xpack.securitySolution.entityAnalytics.behavioralAnomaliesV3.table.jobColumn',
  { defaultMessage: 'ML job' }
);

export const ANOMALIES_TABLE_V3_TIMESTAMP_COLUMN = i18n.translate(
  'xpack.securitySolution.entityAnalytics.behavioralAnomaliesV3.table.timestampColumn',
  { defaultMessage: 'Timestamp' }
);

export const ANOMALIES_TABLE_V3_BASELINE_COLUMN = i18n.translate(
  'xpack.securitySolution.entityAnalytics.behavioralAnomaliesV3.table.baselineColumn',
  { defaultMessage: 'Baseline' }
);

export const ANOMALIES_TABLE_V3_ANOMALY_COLUMN = i18n.translate(
  'xpack.securitySolution.entityAnalytics.behavioralAnomaliesV3.table.anomalyColumn',
  { defaultMessage: 'Anomaly' }
);

export const ANOMALIES_TABLE_V3_TACTIC_COLUMN = i18n.translate(
  'xpack.securitySolution.entityAnalytics.behavioralAnomaliesV3.table.tacticColumn',
  { defaultMessage: 'Tactic' }
);

export const ANOMALIES_TABLE_V3_TACTIC_POPOVER_TITLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.behavioralAnomaliesV3.table.tacticPopoverTitle',
  { defaultMessage: 'Tactics' }
);

export const ANOMALIES_TABLE_V3_EXPAND_ROW_ARIA = i18n.translate(
  'xpack.securitySolution.entityAnalytics.behavioralAnomaliesV3.table.expandRowAria',
  { defaultMessage: 'Expand anomaly description' }
);

export const ANOMALIES_TABLE_V3_COLLAPSE_ROW_ARIA = i18n.translate(
  'xpack.securitySolution.entityAnalytics.behavioralAnomaliesV3.table.collapseRowAria',
  { defaultMessage: 'Collapse anomaly description' }
);

export const ANOMALIES_TABLE_V3_DESCRIPTION_HEADING = i18n.translate(
  'xpack.securitySolution.entityAnalytics.behavioralAnomaliesV3.table.descriptionHeading',
  { defaultMessage: 'Explainer' }
);

export const ANOMALIES_TABLE_V3_SCORE_COLUMN = i18n.translate(
  'xpack.securitySolution.entityAnalytics.behavioralAnomaliesV3.table.scoreColumn',
  { defaultMessage: 'Anomaly score' }
);

export const ANOMALIES_TABLE_V3_SCORE_COLUMN_TOOLTIP = i18n.translate(
  'xpack.securitySolution.entityAnalytics.behavioralAnomaliesV3.table.scoreColumnTooltip',
  {
    defaultMessage:
      'A normalized score between 0–100, which indicates the relative significance of the anomaly record results.',
  }
);

export const ANOMALIES_TABLE_V3_ACTIONS_COLUMN = i18n.translate(
  'xpack.securitySolution.entityAnalytics.behavioralAnomaliesV3.table.actionsColumn',
  { defaultMessage: 'Actions' }
);

export const ANOMALIES_TABLE_V3_ROW_ACTIONS_ARIA_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.behavioralAnomaliesV3.table.rowActionsAriaLabel',
  { defaultMessage: 'Row actions' }
);

export const ANOMALIES_TABLE_V3_ROW_ACTION_ADD_TO_TIMELINE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.behavioralAnomaliesV3.table.rowActions.addToTimeline',
  { defaultMessage: 'Add to timeline' }
);

export const ANOMALIES_TABLE_V3_ROW_ACTION_VIEW_IN_DISCOVER = i18n.translate(
  'xpack.securitySolution.entityAnalytics.behavioralAnomaliesV3.table.rowActions.viewInDiscover',
  { defaultMessage: 'View in Discover' }
);

export const ANOMALIES_TABLE_V3_ROW_ACTION_VIEW_IN_SMV = i18n.translate(
  'xpack.securitySolution.entityAnalytics.behavioralAnomaliesV3.table.rowActions.viewInSingleMetricViewer',
  { defaultMessage: 'View in Single metric viewer' }
);
